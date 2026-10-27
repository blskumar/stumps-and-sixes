const {chromium}=require('playwright');let pass=0,fail=0;const ck=(n,c,d)=>{if(c)pass++;else{fail++;console.log('FAIL',n,d===undefined?'':d)}};
const out=require('os').tmpdir()+'/';
(async()=>{const b=await chromium.launch();
for(const [name,vp,touch] of [['desktop',{width:1280,height:720},false],['phone',{width:390,height:780},true]]){
 const ctx=await b.newContext({viewport:vp,hasTouch:touch});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(require('url').pathToFileURL(require('path').join(__dirname,'..','..','index.html')).href);await p.waitForTimeout(400);
 const vis=id=>p.evaluate(id=>{const e=document.getElementById(id);return getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0},id);
 const S=()=>p.evaluate(()=>({st:window.__cricket.getState(),pf:window.__cricket.PF.list.map(r=>r.name),act:window.__cricket.PF.active.name,hs:window.__cricket.HS.load()}));
 ck(name+': home shows the current player',(await p.textContent('#whoName'))==='Player 1');
 await p.screenshot({path:out+name+'_home_player.png'});
 await p.click('#bProf');ck(name+': Players page opens',await vis('hmProf')&&await vis('homeFloat'));
 // typing must not trigger game keys
 await p.fill('#profName','');await p.click('#profName');await p.keyboard.type('Rahul R Mh',{delay:5});
 const s1=await S();ck(name+': typing Space/R/M/H in the name box does not start/restart/mute/open anything',s1.st.appState==='home'&&(await p.inputValue('#profName'))==='Rahul R Mh'&&!(await p.evaluate(()=>window.__cricket.SFX.isMuted()))&&await p.evaluate(()=>document.getElementById('hs').classList.contains('hidden')),JSON.stringify(s1.st));
 await p.keyboard.press('Enter');let s=await S();ck(name+': Enter adds the player & selects them',s.pf.includes('Rahul R Mh')&&s.act==='Rahul R Mh');
 await p.fill('#profName','rahul r mh');await p.click('#profAdd');ck(name+': duplicate name rejected with message',/already/.test(await p.textContent('#profMsg')));
 await p.fill('#profName','   ');await p.click('#profAdd');ck(name+': blank name rejected with message',/name/i.test(await p.textContent('#profMsg')));
 await p.fill('#profName','<b>Sita</b>');await p.click('#profAdd');s=await S();ck(name+': markup stripped from name',s.pf.some(n=>/Sita/.test(n))&&!s.pf.some(n=>n.includes('<')),JSON.stringify(s.pf));
 await p.screenshot({path:out+name+'_profiles.png'});
 // select Player 1 and play a match, bank score
 await p.click('.prow:has-text("Player 1") button:has-text("Select")');s=await S();ck(name+': Select switches player',s.act==='Player 1');
 await p.click('#hmProfBack');ck(name+': back on the main menu shows the new player',(await p.textContent('#whoName'))==='Player 1');
 await p.click('#hmPlay');await p.waitForTimeout(300);
 await p.evaluate(()=>{window.__cricket.G.score=31;window.__cricket.G.balls=6});
 // switch player mid-match -> fresh innings, 31 banked for Player 1
 await p.click('#homeBtn');await p.click('#bProf');await p.click('.prow:has-text("Rahul") button:has-text("Select")');s=await S();
 ck(name+': mid-match switch banks old innings for the old player',s.hs.length===1&&s.hs[0].player==='Player 1'&&s.hs[0].score===31,JSON.stringify(s.hs));
 ck(name+': new player starts a fresh innings',await p.evaluate(()=>window.__cricket.G.score===0&&window.__cricket.G.balls===0));
 await p.click('#hmProfBack');await p.click('#hmResume');await p.waitForTimeout(200);
 ck(name+': HUD shows the active player',await p.evaluate(()=>document.getElementById('hudPlayer').textContent==='Rahul R Mh'));
 await p.evaluate(()=>{window.__cricket.G.score=44;window.__cricket.G.balls=9});await p.keyboard.press('KeyR');
 s=await S();ck(name+': second player\'s innings saved under their own name',s.hs.some(r=>r.player==='Rahul R Mh'&&r.score===44)&&s.hs.some(r=>r.player==='Player 1'&&r.score===31));
 // scores overlay tabs
 await p.keyboard.press('KeyH');let html=await p.innerHTML('#hsList');ck(name+': All tab lists both players',/Player 1/.test(html)&&/Rahul R Mh/.test(html));
 await p.click('#hsMine');html=await p.innerHTML('#hsList');ck(name+': My scores tab filters to the active player',/Rahul R Mh/.test(html)&&!/Player 1/.test(html));
 await p.screenshot({path:out+name+'_scores_tabs.png'});await p.click('#hsClose');
 // game over panel
 await p.evaluate(()=>{const A=window.__cricket;A.G.score=60;A.G.balls=8;});
 await p.evaluate(async()=>{const A=window.__cricket;const C=A.CFG;for(let sd=0;sd<300;sd++){A.restart();A.G.score=60;A.G.cd=.001;let k=0;while(A.G.phase!=='live'&&k++<4000)A.update(1/240);const e=A.G.expect;if(Math.abs(e.zS)<=C.STUMP_W/2+C.BALL_R&&e.yS<=C.STUMP_H+C.BALL_R)break}let k=0;while(A.G.phase==='live'&&k++<40000)A.update(1/240);A.G.score=60;});
 await p.waitForTimeout(2600);
 const ov=await p.evaluate(()=>({over:window.__cricket.G.over,txt:document.getElementById('oPlayer').textContent,cls:document.getElementById('over').className}));
 if(ov.over){ck(name+': game-over panel names the player',ov.txt==='Rahul R Mh'&&!/hidden/.test(ov.cls),JSON.stringify(ov));await p.screenshot({path:out+name+'_over_player.png'})}
 // delete
 await p.click('#overHome');await p.click('#bProf');
 await p.click('.prow:has-text("Sita") button.del');ck(name+': first delete click only arms',(await S()).pf.some(n=>/Sita/.test(n))&&/Sure/.test(await p.textContent('.prow:has-text("Sita") button.del')));
 await p.click('.prow:has-text("Sita") button.del');ck(name+': second click deletes',!(await S()).pf.some(n=>/Sita/.test(n)));
 // delete down to one
 for(let i=0;i<5;i++){const n=await p.locator('.prow button.del').count();if(!n)break;await p.locator('.prow button.del').first().click();await p.locator('.prow button.del').first().click()}
 ck(name+': the last player has no Delete button',await p.locator('.prow button.del').count()===0&&(await S()).pf.length===1);
 // reload keeps profiles
 await p.reload();await p.waitForTimeout(300);ck(name+': profiles survive a reload',(await S()).pf.length===1);
 ck(name+': no page errors',errs.length===0,errs.join('|'));await ctx.close()}
console.log(`PROFILES E2E: ${pass} passed, ${fail} failed`);await b.close()})()
