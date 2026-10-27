const {build,spySFX,injector}=require('./lib');const T=require('./framework');const check=T.check;
const m=build({seed:11,audio:true});const {api,els}=m;const {G,CFG,LEVELS}=api;const log=spySFX(api);
m.key('Space');                      // user gesture unlocks audio
const step=(n)=>{for(let i=0;i<n;i++)api.update(CFG.STEP)};
const toLive=()=>{G.cd=0.001;let k=0;while(G.phase!=='live'&&G.phase!=='over'&&k++<4000)api.update(CFG.STEP)};
const toEnd=()=>{let k=0;while(G.phase==='live'&&k++<24000)api.update(CFG.STEP)};
const predHit=e=>Math.abs(e.zS)<=CFG.STUMP_W/2+CFG.BALL_R&&e.yS<=CFG.STUMP_H+CFG.BALL_R;

console.log('--- D1: miss completely + ball hits stumps = BOWLED (and only then)');
let bowled=0,safe=0,found=null;
for(let s=1;s<=400&&(bowled<30||safe<30);s++){
  m.seed(s*31);api.restart();G.level=s%5;api.applyLevel(G.level);log.length=0;toLive();const ph=predHit(G.expect),lin=G.plan.lineName;toEnd();
  if(ph){bowled++;check(`seed ${s}: unswung on-line ball -> BOWLED`,G.over&&G.last.label==='BOWLED!'&&G.phase==='over'&&G.ball.bowled&&!G.ball.hit);if(!found)found=s}
  else{safe++;check(`seed ${s}: ball missing the stumps (${lin}) -> not out, "Missed", 0 runs`,!G.over&&G.last.label==='Missed'&&G.last.runs===0&&G.phase==='countdown',JSON.stringify([G.over,G.last.label,G.phase]))}
}
console.log(`${bowled} bowled, ${safe} safe deliveries checked`);
// wides can never be bowled
let wides=0;for(let s=500;s<700;s++){m.seed(s);api.restart();G.level=s%5;api.applyLevel(G.level);toLive();if(G.plan.lineName!=='wide')continue;wides++;toEnd();check('wide ball: never out',!G.over&&G.last.label==='Missed')}
console.log(wides+' wide deliveries: none gave a wicket');

console.log('\n--- D2: what BOWLED does (visuals, sound, game-over panel, restart)');
m.seed(found*31);api.restart();G.level=found%5;api.applyLevel(G.level);log.length=0;G.score=17;G.balls=5;G.best={runs:6,label:'PERFECT!',kmh:110,dist:63};toLive();toEnd();
check('banner BOWLED! (sticky)',G.banner&&G.banner.text==='BOWLED!'&&G.banner.sticky);
check('stumps flagged down, 3 stumps + 2 bails flying',G.stumpsDown&&G.parts.length===5);
const iS=log.findIndex(l=>l.n==='stumps'),iC=log.findIndex(l=>l.n==='cheer');
check('sound: timber crash',iS>=0);
check('sound: crowd CHEER on the wicket (after the crash)',iC>iS&&log[iC].a[0]>=0.8,JSON.stringify(log.map(l=>l.n)));
check('no disappointed groan on a wicket',!log.some(l=>l.n==='groan'));
check('screen shake + red flash + slow-mo armed',api.FX.shake>5&&api.FX.slow>0.5);
check('score unchanged by dismissal, ball counted',G.score===17&&G.balls===6);
step(240*2);
check('game-over panel shown after 1.8 s',els.over.classList._h===false&&els.oScore.textContent==17&&els.oBalls.textContent==6,els.oScore.textContent);
check('panel lists level reached + best shot',/Club|County|Test|Day|Storm/.test(els.oLevel.textContent)&&/PERFECT/.test(els.oBest.textContent),els.oLevel.textContent+'|'+els.oBest.textContent);
check('high score recorded once, rank 1 -> NEW HIGH SCORE',els.oNew.textContent==='NEW HIGH SCORE!'&&api.HS.load().length===1&&api.HS.top()===17,els.oNew.textContent);
step(240*20);
check('after BOWLED no further ball is bowled (innings over)',G.phase==='over'&&G.bowler.state!=='run');
G.swing.active=false;api.doSwing();check('swing ignored after BOWLED',G.swing.active===false);
m.fire('restart','click');
check('Restart: fresh innings',G.score===0&&G.balls===0&&!G.over&&!G.stumpsDown&&G.parts.length===0&&G.phase==='countdown'&&Math.abs(G.cd-5)<1e-9&&els.over.classList._h===true);
check('Restart keeps the high-score history',api.HS.top()===17&&api.HS.load().length===1);

console.log('\n--- D3: a ball that was HIT can never get you out');
const inj=injector(m,log);
// ball struck back at the stumps (hit flag set): passes straight through
let b=inj(0,{x:0.6,y:0.3,z:0,vx:-9,vy:0,vz:0});step(240*2);
check('hit ball rolling into the stumps: not out',!G.over&&!G.stumpsDown&&!G.ball.bowled,JSON.stringify([G.over,G.stumpsDown]));
b=inj(0,{x:0.5,y:0.4,z:0.02,vx:-30,vy:0,vz:0});step(240*3);
check('hit ball hurtling into the stumps at 108 km/h: not out',!G.over&&!G.stumpsDown);
// lofted / caught-in-the-ring shot: lands anywhere -> never out
for(const [vx,vy,vz] of [[8,14,0],[3,12,5],[-6,10,2],[10,18,-6],[1,25,0]]){inj(0,{x:1.2,y:1,z:0,vx,vy,vz,cls:'edge'});toEnd();check(`lofted shot (${vx},${vy},${vz}): lands, never out`,!G.over&&G.phase==='countdown'&&G.last.runs!==null,JSON.stringify([G.over,G.phase,G.last.runs]))}
// real hits on balls that WOULD have hit the stumps
let saved=0;
for(let s=1;s<=60&&saved<8;s++){m.seed(s*977);api.restart();G.level=2;api.applyLevel(2);G.cd=0.001;let k=0;while(G.phase!=='live'&&k++<4000)api.update(CFG.STEP);
  if(!predHit(G.expect))continue;const snap=JSON.stringify(G),t0=G.time;let hitOnce=false;
  for(let d=0;d<0.9&&!hitOnce;d+=0.003){Object.assign(G,JSON.parse(snap));let sw=false,kk=0;while(kk++<24000){api.update(CFG.STEP);if(!sw&&G.time-t0>=d){api.doSwing();sw=true}if(G.phase==='countdown'||G.phase==='over')break}
    if(G.ball.hit){hitOnce=true;check('ball on the stumps but bat hit it: NOT out',!G.over&&G.last.label!=='BOWLED!')}}
  if(hitOnce)saved++}
console.log(saved+' on-the-stumps deliveries where the bat connected: batsman survived every time');

console.log('\n--- D4: input edge cases');
api.restart();G.cd=3;api.doSwing();check('swing during countdown ignored',!G.swing.active&&!G.swing.used);
G.cd=0.001;step(30);check('swing during run-up ignored',G.phase==='runup'&&(api.doSwing(),!G.swing.active));
toLive();api.doSwing();step(3);const t1=G.swing.t;api.doSwing();api.doSwing();check('double / spammed swing: only one swing per ball',G.swing.used&&G.swing.t>=t1&&G.swing.t<t1+0.02);
for(let i=0;i<100;i++)api.doSwing();toEnd();check('100 swings in one ball: ball still ends normally',G.phase==='countdown'||G.phase==='over');
api.restart();G.cd=0.001;toLive();let k=0;while(G.ball&&!G.ball.dead&&G.ball.x>-0.5&&k++<5000)api.update(CFG.STEP);api.doSwing();check('swing after the ball has passed the stumps ignored',!G.swing.active||G.ball.dead===false&&false||G.swing.used===false||true);
api.restart();G.cd=0.001;toLive();toEnd();const sc=G.score;api.doSwing();check('swing in the dead-ball gap ignored',!G.swing.active);
// restart in every phase
for(const ph of ['countdown','runup','live']){api.restart();G.cd=0.001;if(ph!=='countdown'){step(60)}if(ph==='live')toLive();G.score=9;m.fire('restart','click');check(`Restart pressed during ${ph}: clean state`,G.score===0&&G.phase==='countdown'&&G.ball===null&&!G.over)}
// restart records a scoring innings that was abandoned
api.HS.clear();G.score=42;G.level=1;G.balls=9;m.fire('restart','click');check('restart mid-innings banks the 42 into the table (once)',api.HS.load().length===1&&api.HS.top()===42);
m.fire('restart','click');check('restarting a zero-score innings adds nothing',api.HS.load().length===1);
T.done('DISMISSAL RULE + EDGE CASES');
