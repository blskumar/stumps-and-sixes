const {chromium}=require('playwright');let pass=0,fail=0;const ck=(n,c,d)=>{if(c)pass++;else{fail++;console.log('FAIL',n,d===undefined?'':d)}};
const out=require('os').tmpdir()+'/';
(async()=>{const b=await chromium.launch();
for(const [name,vp] of [['desktop',{width:1280,height:720}],['phone',{width:390,height:780}]]){const p=await b.newPage({viewport:vp});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(''+require('url').pathToFileURL(require('path').join(__dirname,'..','..','index.html')).href+'');await p.waitForTimeout(400);
 await p.click('#bPrac');const types=await p.evaluate(()=>[...document.querySelectorAll('#pracType option')].map(o=>o.value));
 for(const t of types){await p.selectOption('#pracType',t);const txt=await p.textContent('#pracTip');ck(name+': setup tip for "'+(t||'mixed')+'"',txt.length>60,txt)}
 await p.selectOption('#pracType','yorker');await p.screenshot({path:out+name+'_tip_setup.png'});
 await p.click('#hmPracGo');await p.waitForTimeout(300);
 const vis=id=>p.evaluate(id=>{const e=document.getElementById(id);return getComputedStyle(e).display!=='none'},id);
 ck(name+': tip card visible in practice',await vis('tip'));
 ck(name+': pre-ball tip is the yorker advice',/Pitches almost at your feet/.test(await p.textContent('#tipBody')));
 await p.screenshot({path:out+name+'_tip_play.png'});
 await p.click('#tip');ck(name+': tap collapses tip',await p.evaluate(()=>document.getElementById('tip').classList.contains('min')));await p.click('#tip');
 // play one missed ball and a hit via API, check feedback changes
 const r=await p.evaluate(async()=>{const A=window.__cricket;const seen=[];A.G.cd=.001;let k=0;while(A.G.phase!=='live'&&k++<4000)A.update(1/240);const live=document.getElementById('tipHead').textContent;
  k=0;while(A.G.phase==='live'&&k++<30000)A.update(1/240);await new Promise(r=>setTimeout(r,200));return {live,after:document.getElementById('tipHead').textContent,body:document.getElementById('tipBody').textContent}});
 ck(name+': tip updates after the shot',r.after!==r.live&&r.body.length>20,JSON.stringify(r));
 await p.click('#homeBtn');ck(name+': tip hidden on home',!(await vis('tip')));
 await p.click('#hmPlay');ck(name+': no tip card in a real match',!(await vis('tip')));
 ck(name+': no page errors',errs.length===0,errs.join('|'));await p.close()}
console.log(`TIPS: ${pass} passed, ${fail} failed`);await b.close()})()
