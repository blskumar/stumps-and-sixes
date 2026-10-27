const {chromium}=require('playwright');let pass=0,fail=0;const ck=(n,c,d)=>{if(c)pass++;else{fail++;console.log('FAIL',n,d===undefined?'':d)}};
const out=require('os').tmpdir()+'/';
(async()=>{const b=await chromium.launch();
for(const [name,vp,touch] of [['desktop',{width:1280,height:720},false],['phone',{width:360,height:640},true]]){
 const p=await b.newPage({viewport:vp,hasTouch:touch});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(''+require('url').pathToFileURL(require('path').join(__dirname,'..','..','index.html')).href+'');await p.waitForTimeout(500);
 const vis=id=>p.evaluate(id=>{const e=document.getElementById(id);const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return cs.display!=='none'&&cs.opacity!=='0'&&r.width>0&&r.right>0&&r.left<innerWidth},id);
 const app=()=>p.evaluate(()=>window.__cricket.getState().appState);
 ck(name+': no float-home on the main menu',!(await vis('homeFloat')));
 for(const [btn,page] of [['#bHow','hmHow'],['#bCtl','hmCtl'],['#bPrac','hmPrac']]){await p.click(btn);ck(name+': home icon visible on '+page,await vis('homeFloat'));await p.click('#homeFloat');ck(name+': home icon returns to menu from '+page,await vis('hmMain')&&!(await vis(page)))}
 await p.click('#hmPlay');await p.waitForTimeout(400);
 ck(name+': home icon visible in match HUD (collapsed)',await vis('homeBtn'));await p.screenshot({path:out+name+'_hud_home.png'});
 await p.click('#homeBtn');ck(name+': HUD home icon -> menu',(await app())==='home'&&await vis('hmMain'));
 await p.click('#hmResume');
 // scores overlay -> home
 await p.keyboard.press('KeyH');ck(name+': scores overlay open',await p.evaluate(()=>!document.getElementById('hs').classList.contains('hidden')));
 await p.click('#hsHome');ck(name+': Home from High Scores',(await app())==='home'&&await p.evaluate(()=>document.getElementById('hs').classList.contains('hidden')));
 await p.click('#hmResume');
 // game over -> home
 await p.evaluate(async()=>{const A=window.__cricket;A.G.cd=.001;let k=0;while(A.G.phase!=='live'&&k++<4000)A.update(1/240);A.G.expect.zS=0;A.G.expect.yS=.2;k=0;while(!A.G.over&&k++<60000){A.update(1/240);if(A.G.phase==='countdown'){A.G.cd=.001}if(A.G.phase==='live'&&A.G.ball&&A.G.ball.x<8)A.G.swing.used=true}});
 await p.waitForTimeout(2500);
 const over=await p.evaluate(()=>({over:window.__cricket.G.over,shown:!document.getElementById('over').classList.contains('hidden')}));
 if(over.over){ck(name+': game-over panel shows Home',over.shown&&await vis('overHome'));await p.screenshot({path:out+name+'_over.png'});await p.click('#overHome');await p.waitForTimeout(400);ck(name+': Home from game-over: menu visible, panel hidden',(await app())==='home'&&await vis('hmMain')&&await p.evaluate(()=>document.getElementById('over').classList.contains('hidden')))}
 else console.log('note: no wicket reached in sim for',name);
 ck(name+': no page errors',errs.length===0,errs.join('|'));await p.close()}
console.log(`E2E2: ${pass} passed, ${fail} failed`);await b.close()})()
