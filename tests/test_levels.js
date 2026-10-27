const {build}=require('./lib');const T=require('./framework');const check=T.check;
const m=build({seed:42});const {api}=m;const {G,CFG,LEVELS,DTYPES}=api;
const band=(lv,D)=>{const [lo,hi]=lv.speed,R=hi-lo;return D.spd==='fast'?[lo+.65*R,hi]:D.spd==='slow'?[lo*.78,lo*.9]:D.spd==='spin'?[lo*.70,lo*.84]:[lo+.25*R,lo+.7*R]};
console.log('--- per-level pace bands and delivery mix (1500 samples each)');
const meanPace=[];
for(let L=0;L<5;L++){
  G.level=L;api.applyLevel(L);const lv=LEVELS[L];
  check(`L${L+1} CFG.BOUNDARY applied`,CFG.BOUNDARY===lv.boundary,CFG.BOUNDARY);
  check(`L${L+1} CFG.SPEED_KMH applied`,CFG.SPEED_KMH===lv.speed);
  const counts={},all=[],pace=[];let bad=0;
  for(let i=0;i<1500;i++){const p=api.planDelivery(),D=DTYPES[p.type],kmh=p.speed*3.6,[a,b]=band(lv,D);
    counts[p.type]=(counts[p.type]||0)+1;all.push(kmh);if(D.spd==='fast'||D.spd==='mid')pace.push(kmh);
    if(kmh<a-1e-6||kmh>b+1e-6)bad++;
    if(D.len&&p.kind!==D.len)bad++;
    if(!(p.xp>=CFG.LENGTHS[p.kind][0]&&p.xp<=CFG.LENGTHS[p.kind][1]))bad++;
    if(D.turn){ if(Math.sign(p.spinTurn)!==Math.sign(D.turn))bad++; if(Math.abs(p.spinTurn)<1.6*Math.abs(D.turn)-1e-9||Math.abs(p.spinTurn)>3.4*Math.abs(D.turn)+1e-9)bad++; }
    else if(p.spinTurn!==0)bad++;
    if(D.swing&&Math.sign(p.swing)!==D.swing)bad++;
    if(!['stumps','near','wide'].includes(p.lineName))bad++;
    if(!isFinite(p.speed)||!isFinite(p.xp)||!isFinite(p.zT))bad++;}
  check(`L${L+1} every plan inside its type's speed band / length / turn rules`,bad===0,bad+' violations');
  const tot=Object.values(counts).reduce((a,b)=>a+b,0),mixTot=Object.values(lv.mix).reduce((a,b)=>a+b,0);
  let worst=0;for(const k in lv.mix)worst=Math.max(worst,Math.abs((counts[k]||0)/tot-lv.mix[k]/mixTot));
  check(`L${L+1} type frequencies match mix (max err<4%)`,worst<0.04,(worst*100).toFixed(1)+'%');
  for(const k in lv.mix)check(`L${L+1} type ${k} appears`,(counts[k]||0)>0);
  meanPace.push(pace.reduce((a,b)=>a+b,0)/pace.length);
  console.log(`L${L+1} ${lv.name.padEnd(16)} pace band ${lv.speed.join('-')} | overall ${Math.min(...all).toFixed(0)}-${Math.max(...all).toFixed(0)} km/h | mean pace-ball ${meanPace[L].toFixed(1)} | `+Object.keys(counts).map(k=>k+':'+Math.round(counts[k]/15)+'%').join(' '));
}
for(let L=1;L<5;L++)check(`mean pace rises L${L}->L${L+1}`,meanPace[L]>meanPace[L-1],meanPace[L-1].toFixed(1)+' -> '+meanPace[L].toFixed(1));
for(let L=0;L<5;L++){const lv=LEVELS[L];check(`L${L+1} pace-ball ceiling <=145 km/h`,lv.speed[1]<=145);check(`L${L+1} stock/fast floor >=100`,lv.speed[0]>=100)}
check('targets strictly increase',LEVELS.every((l,i)=>i===0||l.target>LEVELS[i-1].target));
check('boundaries grow',LEVELS.every((l,i)=>i===0||l.boundary>=LEVELS[i-1].boundary));

console.log('\n--- every delivery type x every level: aiming solver hits its target');
let worstZ=0,worstX=0,n=0;const types=Object.keys(DTYPES);
for(let L=0;L<5;L++){const lv=LEVELS[L],saved=lv.mix;G.level=L;api.applyLevel(L);
  for(const ty of types){lv.mix={[ty]:1};for(let i=0;i<10;i++){const p=api.planDelivery();const rel={x:19.45,y:1.7+m.rnd()*0.3,z:p.z0};
    const sol=api.solveDelivery(p,rel),e=sol.expect;n++;
    const okShape=e.ok&&isFinite(e.zS)&&isFinite(e.yS);
    check(`solve L${L+1} ${ty} reaches stumps plane`,okShape);
    if(okShape){worstZ=Math.max(worstZ,Math.abs(e.zS-p.zT));worstX=Math.max(worstX,Math.abs(e.xp-p.xp));
      check(`solve L${L+1} ${ty} line error<8cm`,Math.abs(e.zS-p.zT)<0.08,Math.abs(e.zS-p.zT).toFixed(3));
      check(`solve L${L+1} ${ty} pitch error<30cm`,Math.abs(e.xp-p.xp)<0.3,Math.abs(e.xp-p.xp).toFixed(3));}}
  lv.mix=saved;}}
console.log(`${n} solves; worst line error ${worstZ.toFixed(3)} m, worst pitch-length error ${worstX.toFixed(3)} m`);

console.log('\n--- spin turns the correct way off the pitch; swingers curve the correct way');
const rows=[];
for(const ty of ['offbreak','legbreak','googly','doosra','inswing','outswing']){
  const lv=LEVELS[2];lv.mix0=lv.mix;lv.mix={[ty]:1};
  const dz=[];let bad=0;
  for(let i=0;i<25;i++){
    m.seed(1000+i*17);api.restart();G.level=2;api.applyLevel(2);G.cd=0.001;
    let k=0;while(G.phase!=='live'&&k++<3000)api.update(CFG.STEP);
    const p=G.plan,b=G.ball;let vzRelease=b.vz,vzBefore=null,vzAfter=null;
    while(!b.dead&&k++<20000&&vzAfter===null){const pb=b.bounces,v0=b.vz;api.update(CFG.STEP);if(b.bounces===1&&pb===0){vzBefore=v0;vzAfter=b.vz}}
    if(DTYPES[ty].turn){const d=vzAfter-vzBefore;dz.push(d/p.spinTurn);if(Math.sign(d)!==Math.sign(p.spinTurn))bad++}
    else{const d=vzBefore-vzRelease;dz.push(d);if(Math.sign(d)!==DTYPES[ty].swing)bad++}
  }
  lv.mix=lv.mix0;delete lv.mix0;
  check(`${ty}: direction correct in all 25 deliveries`,bad===0,bad+' wrong');
  const mean=dz.reduce((a,b)=>a+b,0)/dz.length;rows.push(`${ty.padEnd(9)} ${DTYPES[ty].turn?'turn kick / planned turn = '+mean.toFixed(2):'sideways velocity gained in flight = '+mean.toFixed(2)+' m/s'}`);
  if(DTYPES[ty].turn)check(`${ty}: realised kick within 40-110% of planned turn`,mean>0.4&&mean<1.1,mean.toFixed(2));
}
console.log(rows.join('\n'));

console.log('\n--- what the player sees: label, speed, tag, delivery map');
m.seed(7);api.restart();G.level=3;api.applyLevel(3);G.cd=0.001;
let k=0;while(G.phase!=='live'&&k++<3000)api.update(CFG.STEP);
check('delivery tag created at release',G.tag&&G.tag.text===G.plan.label&&G.tag.sub.includes('km/h'),JSON.stringify(G.tag));
check('HUD delivery info set',G.deliveryInfo.includes(G.plan.label)&&G.deliveryInfo.includes(String(Math.round(G.plan.speed*3.6))),G.deliveryInfo);
while(G.phase==='live'&&k++<30000)api.update(CFG.STEP);
check('map entry recorded pitch point and stumps line',G.hist[0]&&G.hist[0].px!==null&&(G.hist[0].ez!==null||G.hist[0].hit),JSON.stringify(G.hist[0]));
for(let i=0;i<12;i++){G.cd=0.001;k=0;while(G.phase!=='live'&&G.phase!=='over'&&k++<3000)api.update(CFG.STEP);while(G.phase==='live'&&k++<30000)api.update(CFG.STEP);if(G.over)break}
check('delivery map keeps at most 6 entries',G.hist.length<=6,G.hist.length);
// bowler action: spinners short run-up, pacers long
const rup=ty=>{const lv=LEVELS[0];const sv=lv.mix;lv.mix={[ty]:1};m.seed(5);api.restart();G.level=0;api.applyLevel(0);G.cd=0.001;api.update(CFG.STEP);api.update(CFG.STEP);const r={runT:G.bowler.runT,startX:G.bowler.startX};lv.mix=sv;return r};
const sp=rup('offbreak'),pc=rup('fast');
check('spinner has a shorter run-up than a fast bowler',sp.runT<pc.runT&&sp.startX<pc.startX,JSON.stringify([sp,pc]));
T.done('LEVELS / DELIVERY TYPES');
