const {build,spySFX}=require('./lib');const T=require('./framework');const check=T.check;
const m=build({seed:3,audio:true});const {api}=m;const {G,CFG,LEVELS}=api;
const log=spySFX(api);
const R=0.0358,deg=d=>d*Math.PI/180;
function inject(level,s){
  api.restart();G.level=level;api.applyLevel(level);
  G.phase='live';G.cd=0;
  const cls=s.cls||'perfect',spd=Math.hypot(s.vx,s.vy,s.vz);
  const b={x:s.x,y:s.y,z:s.z,vx:s.vx,vy:s.vy,vz:s.vz,bounces:0,onGround:!!s.onGround,spinRate:20,seam:0,swing:0,spinTurn:0,hit:true,dead:false,sim:true,age:0,trail:[],touched:false,
    info:{offsetMs:0,Rc:.64,bz:0,theta:.3,exit:spd,yaw:.1,q:1,edge:cls==='edge',dir:Math.atan2(s.vz,s.vx),t:G.time,cls:{cls,label:cls,color:'#fff'},kmh:spd*3.6},
    cur:{col:'#fff',x0:1,z0:0,px:null,pz:null,ez:null,hit:true,hx:s.x,hz:s.z}};
  G.ball=b;G.last={label:cls,color:'#fff',timing:'+0 ms',kmh:Math.round(spd*3.6),runs:null,dirName:'straight'};
  G.swing={active:false,t:0,used:true};G.score=0;G.balls=0;G.callout=null;G.ropeHit=null;
  log.length=0;
  let k=0,snap=null;
  while(k++<240*45){api.update(CFG.STEP);
    if(b.dead&&!snap){snap={touched:b.touched,bounces:b.bounces,x:b.x,y:b.y,z:b.z,dist:Math.hypot(b.x,b.z),runs:G.last.runs,callout:G.callout&&G.callout.text,rope:G.ropeHit&&G.ropeHit.six,phase:G.phase,score:G.score,balls:G.balls,cd:G.cd,sub:G.banner&&G.banner.sub,B:CFG.BOUNDARY,lvl:G.level,over:G.over};break}}
  // let queued fireworks fire
  for(let i=0;i<240;i++)api.update(CFG.STEP);
  snap&&(snap.calls=log.map(l=>l.n+(l.a.length&&typeof l.a[0]==='number'?'('+l.a[0]+')':'')));
  return snap;
}
const rad=(B,d,phi,speed,y0,vy0,ground)=>{const p=deg(phi),r=B-d;return {x:r*Math.cos(p),z:r*Math.sin(p),y:y0,vx:speed*Math.cos(p),vz:speed*Math.sin(p),vy:vy0,onGround:ground}};
const has=(s,n)=>s.calls.some(c=>c.startsWith(n));
let count=0;
for(let L=0;L<5;L++){const B=LEVELS[L].boundary;
  // A: six - clears the rope without touching ground, all directions incl. behind the wicket
  for(const phi of [0,30,60,90,120,150,180,-30,-60,-90,-120,-150]){
    const s=inject(L,rad(B,6,phi,25,8,2,false));count++;
    check(`L${L+1} SIX in air phi=${phi}: 6 runs`,s.runs===6,JSON.stringify(s));
    check(`L${L+1} SIX phi=${phi}: ball never touched ground`,s.touched===false&&s.bounces===0);
    check(`L${L+1} SIX phi=${phi}: crossed the rope`,s.dist>=B&&s.dist<B+1.5,s.dist);
    check(`L${L+1} SIX phi=${phi}: SIX callout + rope marker + crowd`,s.callout==='SIX!'&&s.rope===true&&has(s,'cheer(1)')&&has(s,'pop'),JSON.stringify(s.calls));
    check(`L${L+1} SIX phi=${phi}: banner says on the full`,/over the rope on the full/.test(s.sub),s.sub);
    check(`L${L+1} SIX: score/balls/5s gap armed`,s.score===6&&s.balls===1&&s.phase==='countdown'&&Math.abs(s.cd-5)<0.01,JSON.stringify([s.score,s.balls,s.phase,s.cd]));
  }
  // B: four - bounces first, then crosses
  for(const phi of [0,45,90,135,180,-45,-90,-135]){
    const s=inject(L,rad(B,12,phi,25,3,-8,false));count++;
    check(`L${L+1} FOUR (bounce then rope) phi=${phi}: 4 runs`,s.runs===4,JSON.stringify(s));
    check(`L${L+1} FOUR phi=${phi}: ground touched before rope`,s.touched===true);
    check(`L${L+1} FOUR phi=${phi}: FOUR callout + cheer .75`,s.callout==='FOUR!'&&s.rope===false&&has(s,'cheer(0.75)'),JSON.stringify(s.calls));
    check(`L${L+1} FOUR phi=${phi}: banner says bounced`,/bounced, then crossed the rope/.test(s.sub),s.sub);
  }
  // C: rolling along the ground
  for(const phi of [0,90,180,-90]){const s=inject(L,rad(B,10,phi,20,R,0,true));count++;
    check(`L${L+1} FOUR (rolled) phi=${phi}`,s.runs===4&&s.touched===true&&s.callout==='FOUR!',JSON.stringify(s));}
  // D: precision at the rope: lands 0.3 m inside -> FOUR; lands 0.3 m beyond -> SIX
  let s=inject(L,rad(B,0.91,0,20,0.2,-5,false));count++;
  check(`L${L+1} lands 0.3 m INSIDE the rope then crosses -> FOUR`,s.runs===4&&s.touched===true,JSON.stringify(s));
  s=inject(L,rad(B,0.31,0,20,0.2,-5,false));count++;
  check(`L${L+1} crosses rope airborne, lands 0.3 m BEYOND -> SIX`,s.runs===6&&s.touched===false,JSON.stringify(s));
  s=inject(L,rad(B,1.0,0,20,0.3,-1,false));count++;
  check(`L${L+1} low skimmer that lands only after the rope -> SIX`,s.runs===6,JSON.stringify(s));
  // I: exactly on the rope
  s=inject(L,{x:B,y:2,z:0,vx:0.1,vy:0,vz:0});count++;
  check(`L${L+1} airborne exactly on rope -> SIX`,s.runs===6,JSON.stringify(s));
  s=inject(L,{x:B,y:R,z:0,vx:0.1,vy:0,vz:0,onGround:true});count++;
  check(`L${L+1} on the ground exactly at rope -> FOUR`,s.runs===4,JSON.stringify(s));
  // H: any timing class crossing is a boundary (air = 6, ground = 4)
  for(const cls of ['edge','poor','avg','good','perfect']){
    s=inject(L,{...rad(B,6,20,25,8,2,false),cls});count++;check(`L${L+1} ${cls} crossing in air -> 6`,s.runs===6,s.runs);
    s=inject(L,{...rad(B,10,20,20,R,0,true),cls});count++;check(`L${L+1} ${cls} crossing on ground -> 4`,s.runs===4,s.runs);
  }
  // F/G: not reaching the rope can never be 4 or 6
  for(const cls of ['perfect','good','avg','poor','edge']){
    s=inject(L,{...rad(B,20,0,8,R,0,true),cls});count++;
    const expect={perfect:3,good:3,avg:2,poor:1,edge:1}[cls];
    check(`L${L+1} ${cls} ball stops ~${(B-s.dist).toFixed(0)} m short -> ${expect} runs, no boundary`,s.runs===expect&&!s.callout&&s.rope===null&&s.dist<B,JSON.stringify(s));
    check(`L${L+1} ${cls} short ball gets no cheer for a boundary`,!has(s,'cheer(1)')&&!has(s,'cheer(0.75)'),JSON.stringify(s.calls));
  }
  s=inject(L,rad(B,15,0,8.5,R,0,true));count++;
  check(`L${L+1} ball dies ${(B-s.dist).toFixed(1)} m short of rope -> not a boundary`,s.runs<=3&&s.dist<B&&!s.callout,JSON.stringify(s));
  // lofted ball landing inside the rope: 2-3 (never 4/6), not out
  s=inject(L,rad(B,B-20,0,10,1,8,false));count++;
  check(`L${L+1} lofted catch-able shot landing in the ground: not out, <=3 runs`,s.runs<=3&&s.over===false,JSON.stringify(s));
}
// level boundary differences: same shot is a boundary on a small ground, not on a big one
const probe=inject(4,rad(70,30,0,12,R,0,true)); // rolling shot from 40 m
console.log(`probe: rolling shot from 40 m at 12 m/s on L5 ended at ${probe.dist.toFixed(1)} m (runs ${probe.runs})`);
let flips=[];
for(let L=0;L<5;L++){const s=inject(L,{x:40,y:R,z:0,vx:12,vy:0,vz:0,onGround:true});const B=LEVELS[L].boundary;flips.push(`L${L+1}(B=${B}):${s.runs}`);
  check(`L${L+1}: same rolling shot (stops ~${probe.dist.toFixed(1)} m) is a FOUR only if it passes this level's rope at ${B} m`,(probe.dist>=B+0.3)?s.runs===4:(probe.dist<B-0.3?s.runs<=3&&!s.callout:true),JSON.stringify([probe.dist,B,s.runs]))}
console.log('same rolling shot per level (boundary radius differs):',flips.join('  '));
// the rope you SEE is the rope the game uses: a ball flying straight away from the camera is scored exactly as it reaches the wall at the horizon
for(let L=0;L<5;L++){const B=LEVELS[L].boundary;api.G.level=L;api.applyLevel(L);api.render();const hz=api.view().hz;
  const s=inject(L,rad(B,6,-90,25,8,2,false));
  const gyScreen=api.project(s.x,0,s.z)[1];
  check(`L${L+1}: ball scored as it touches the far rope on screen (ground y ${gyScreen.toFixed(1)} vs horizon ${hz.toFixed(1)})`,Math.abs(gyScreen-hz)<2.5&&s.runs===6,JSON.stringify(s));
  const s2=inject(L,rad(B,6,90,25,8,2,false));
  check(`L${L+1}: ball scored as it reaches the near rope inside the canvas`,s2.runs===6&&api.project(s2.x,0,s2.z)[1]<=600,api.project(s2.x,0,s2.z)[1]);}
console.log(count+' boundary scenarios run');
// level-up triggered by boundary runs
api.restart();api.applyLevel(0);G.level=0;G.score=20;
const sl=inject(0,rad(58,6,0,25,8,2,false));  // inject resets score to 0 -> use explicit score path:
api.restart();G.level=0;api.applyLevel(0);G.phase='live';G.score=20;
const b2=inject; // re-use builder manually
G.score=20;
const bb={x:52,y:8,z:0,vx:25,vy:2,vz:0,bounces:0,onGround:false,spinRate:0,seam:0,swing:0,spinTurn:0,hit:true,dead:false,sim:true,age:0,trail:[],touched:false,info:{offsetMs:0,Rc:.6,bz:0,theta:.3,exit:25,yaw:.1,q:1,edge:false,dir:0,t:0,cls:{cls:'perfect',label:'PERFECT!',color:'#ffd84a'},kmh:90},cur:null};
G.ball=bb;G.last={label:'x',color:'#fff',timing:'',kmh:90,runs:null,dirName:''};G.swing={active:false,t:0,used:true};G.phase='live';log.length=0;
for(let i=0;i<2400&&!bb.dead;i++)api.update(CFG.STEP);
check('a six taking score 20 -> 26 levels up to Level 2',G.level===1&&G.score===26&&G.levelBanner&&/LEVEL UP/.test(G.levelBanner.head),JSON.stringify([G.level,G.score,G.levelBanner]));
check('level-up applies new CFG (pace band, boundary)',CFG.BOUNDARY===LEVELS[1].boundary&&CFG.SPEED_KMH===LEVELS[1].speed);
check('level-up fanfare plays',log.some(l=>l.n==='levelUp'));
T.done('BOUNDARY RULES (FOUR must bounce then cross, SIX must clear on the full)');
