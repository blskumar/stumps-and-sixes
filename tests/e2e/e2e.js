const {chromium}=require('playwright');let pass=0,fail=0;const ck=(n,c,d)=>{if(c)pass++;else{fail++;console.log('FAIL',n,d===undefined?'':d)}};
const out=require('os').tmpdir()+'/';
(async()=>{const b=await chromium.launch();
for(const [name,vp,touch] of [['desktop',{width:1280,height:720},false],['phone',{width:390,height:780},true]]){
 const p=await b.newPage({viewport:vp,hasTouch:touch});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(''+require('url').pathToFileURL(require('path').join(__dirname,'..','..','index.html')).href+'');await p.waitForTimeout(2500);
 const st=()=>p.evaluate(()=>({...window.__cricket.getState(),phase:window.__cricket.G.phase,cd:window.__cricket.G.cd,balls:window.__cricket.G.balls,score:window.__cricket.G.score}));
 const vis=id=>p.evaluate(id=>{const e=document.getElementById(id);const r=e.getBoundingClientRect();return getComputedStyle(e).display!=='none'&&getComputedStyle(e).opacity!=='0'&&r.width>0},id);
 let s=await st();
 ck(name+': launches on home screen, not in a match',s.appState==='home'&&await vis('home'));
 ck(name+': match has NOT started (5 s countdown untouched after 2.5 s)',s.phase==='countdown'&&s.cd===5,JSON.stringify(s));
 ck(name+': HUD hidden on home',!(await vis('hud')));
 await p.screenshot({path:out+name+'_home.png'});
 ck(name+': Space on home does nothing / no crash',(await p.keyboard.press('Space'),(await st()).appState==='home'));
 // pages
 for(const [btn,page] of [['#bHow','hmHow'],['#bCtl','hmCtl'],['#bPrac','hmPrac']]){await p.click(btn);ck(name+': '+page+' opens',await vis(page)&&!(await vis('hmMain')));if(page==='hmHow')await p.screenshot({path:out+name+'_how.png'});if(page==='hmCtl')await p.screenshot({path:out+name+'_controls.png'});if(page==='hmPrac')await p.screenshot({path:out+name+'_practice_setup.png'});await p.keyboard.press('Escape');ck(name+': Esc returns to menu',await vis('hmMain'))}
 await p.click('#hmScores');ck(name+': High scores opens above home',await p.evaluate(()=>{const e=document.getElementById('hs');return !e.classList.contains('hidden')}));await p.click('#hsClose');
 // match
 await p.click('#hmPlay');await p.waitForTimeout(1500);s=await st();
 ck(name+': Play Match starts a match',s.appState==='play'&&s.mode==='match'&&s.cd<5&&!(await vis('home')),JSON.stringify(s));
 ck(name+': HUD visible in match',await vis('hud'));
 await p.waitForTimeout(5500);s=await st();ck(name+': ball bowled after the 5 s gap',s.phase!=='countdown'||s.balls>=1,JSON.stringify(s));
 // pause and resume
 await p.keyboard.press('Escape');await p.waitForTimeout(100);const a=await st();await p.waitForTimeout(1500);const c2=await st();
 ck(name+': Esc pauses to menu; game frozen',a.appState==='home'&&c2.cd===a.cd&&c2.phase===a.phase,JSON.stringify([a,c2]));
 ck(name+': Resume button shown',await vis('hmResume'));
 await p.click('#hmResume');await p.waitForTimeout(800);s=await st();ck(name+': Resume continues the same match',s.appState==='play'&&s.mode==='match');
 if(name==='phone'){await p.click('#toggle');}
 await p.click('#menuBtn');ck(name+': HUD Menu button goes home',(await st()).appState==='home');
 // practice
 await p.click('#bPrac');await p.selectOption('#pracType','yorker');await p.selectOption('#pracLvl','2');await p.click('#hmPracGo');await p.waitForTimeout(500);
 s=await st();ck(name+': practice starts, yorker, level 3',s.mode==='practice'&&s.practiceType==='yorker'&&s.appState==='play');
 const kinds=await p.evaluate(async()=>{const A=window.__cricket;const seen=new Set();let bowledOut=false;for(let i=0;i<6;i++){A.G.cd=0.001;let k=0;while(A.G.phase!=='live'&&k++<4000)A.update(1/240);seen.add(A.G.plan.type);k=0;while(A.G.phase==='live'&&k++<30000)A.update(1/240);if(A.G.over)bowledOut=true}return {types:[...seen],out:bowledOut,phase:A.G.phase}});
 ck(name+': practice delivers only the chosen type',kinds.types.length===1&&kinds.types[0]==='yorker',JSON.stringify(kinds));
 ck(name+': practice never gives a wicket',!kinds.out&&kinds.phase==='countdown',JSON.stringify(kinds));
 ck(name+': practice tag shown',await vis('modeTag'));await p.screenshot({path:out+name+'_practice.png'});
 // high score not recorded from practice
 await p.evaluate(()=>{window.__cricket.G.score=50});await p.keyboard.press('Escape');await p.click('#hmPlay');
 ck(name+': practice score not banked in high scores',await p.evaluate(()=>window.__cricket.HS.load().length===0));
 // demo
 await p.keyboard.press('Escape');await p.click('#hmDemo');await p.waitForTimeout(300);
 const demo=await p.evaluate(async()=>{const A=window.__cricket;let swings=0,hits=0,balls=0;for(let i=0;i<14;i++){A.G.cd=0.001;let k=0,sw=false;while(A.G.phase!=='live'&&k++<4000)A.update(1/240);let wasUsed=false;k=0;while(A.G.phase==='live'&&k++<30000){A.update(1/240);if(A.G.swing.used)wasUsed=true}balls++;if(wasUsed)swings++;if(A.G.ball&&A.G.ball.hit)hits++}return {balls,swings,hits,over:A.G.over,mode:A.getState().mode}});
 ck(name+': demo batsman plays by itself (swings & connects)',demo.swings>=7&&demo.hits>=3&&!demo.over,JSON.stringify(demo));
 const ds=await st();await p.screenshot({path:out+name+'_demo.png'});
 await p.keyboard.press('KeyX');ck(name+': any key exits demo to menu',(await st()).appState==='home'&&!(await vis('hmResume')));
 // mouse/tap during demo exits
 await p.click('#hmDemo');await p.waitForTimeout(200);await p.mouse.click(vp.width/2,vp.height/2);ck(name+': click exits demo',(await st()).appState==='home');
 // restarting a match mid-way banks score only for match
 await p.click('#hmPlay');await p.evaluate(()=>{window.__cricket.G.score=21});await p.keyboard.press('KeyR');ck(name+': match restart banks score 21',await p.evaluate(()=>window.__cricket.HS.top()===21));
 ck(name+': no page errors',errs.length===0,errs.join('|'));
 await p.close()}
console.log(`E2E: ${pass} passed, ${fail} failed`);await b.close()})()
