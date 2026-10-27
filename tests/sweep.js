// usage: node sweep.js <level 0-4> <seeds>   - brute-force every swing timing against many real deliveries
const {build}=require('./lib');const T=require('./framework');const check=T.check;
const L=+process.argv[2]||0,N=+process.argv[3]||14;
const m=build({seed:100+L});const {api}=m;const {G,CFG,LEVELS,DTYPES,FX}=api;
const B=LEVELS[L].boundary;
const stat={n:0,labels:{},runs:{},fours:0,sixes:0,bowled:0,missed:0,hit:0,edges:0,byType:{},maxKmh:0,speeds:[],dirs:{}};
const rows=[];let viol=[];
let vc=0;const bad=(n,d)=>{vc++;if(viol.length<12)viol.push(n+' :: '+d);check(n,false,d)};
for(let seed=1;seed<=N;seed++){
  m.seed(seed*7919+L*131);api.restart();G.level=L;api.applyLevel(L);G.cd=0.001;
  let k=0;while(G.phase!=='live'&&k++<3000)api.update(CFG.STEP);
  const snap=JSON.stringify(G),t0=G.time,plan=G.plan;
  const predHit=(e=>Math.abs(e.zS)<=CFG.STUMP_W/2+CFG.BALL_R&&e.yS<=CFG.STUMP_H+CFG.BALL_R)(G.expect);
  const ty=plan.type;stat.byType[ty]=stat.byType[ty]||{n:0,hit:0,bowled:0,missed:0};
  for(let d=0;d<0.9;d+=0.004){
    Object.assign(G,JSON.parse(snap));FX.reset();
    let swung=false,kk=0,dead=null;const sc0=G.score,b0=G.balls;
    while(kk++<240*40){api.update(CFG.STEP);
      if(!swung&&G.time-t0>=d){api.doSwing();swung=true}
      if(G.ball&&G.ball.dead&&!dead)dead={touched:G.ball.touched,bounces:G.ball.bounces,dist:Math.hypot(G.ball.x,G.ball.z),hit:G.ball.hit,bowled:!!G.ball.bowled,x:G.ball.x,y:G.ball.y,z:G.ball.z};
      if(G.phase==='countdown'||G.phase==='over')break;
      const b=G.ball;if(b&&!(isFinite(b.x)&&isFinite(b.y)&&isFinite(b.z)&&isFinite(b.vx)&&isFinite(b.vy)&&isFinite(b.vz))){bad('NaN in ball','seed '+seed+' d '+d);break}}
    stat.n++;stat.byType[ty].n++;const vc0=vc;
    const lab=G.last.label,runs=G.last.runs,b=G.ball;
    stat.labels[lab]=(stat.labels[lab]||0)+1;
    if(!(G.phase==='countdown'||G.phase==='over'))bad('ball never ended','seed '+seed+' d '+d+' phase '+G.phase);
    if(!dead){bad('no dead record','seed '+seed);continue}
    if(G.balls!==b0+1)bad('balls faced not incremented once',G.balls+' vs '+(b0+1));
    if(lab==='BOWLED!'){
      stat.bowled++;stat.byType[ty].bowled++;
      if(!(dead.bowled&&!dead.hit&&G.over&&G.stumpsDown))bad('BOWLED without exact conditions',JSON.stringify(dead));
      if(!predHit)bad('bowled although ball would miss the stumps','seed '+seed);
      if(G.score!==sc0)bad('score changed on bowled',G.score+' vs '+sc0);
    }else{
      if(G.over)bad('game over without BOWLED','lab '+lab);
      if(dead.bowled)bad('bowled flag without banner','');
      if(G.phase!=='countdown'||Math.abs(G.cd-5)>0.01)bad('5 s gap not armed',G.phase+' '+G.cd);
      if(lab==='Missed'){
        stat.missed++;stat.byType[ty].missed++;
        if(dead.hit)bad('Missed but ball was hit','');
        if(predHit)bad('missed AND ball on stumps but not out','seed '+seed+' d '+d);
        if(runs!==0||G.score!==sc0)bad('Missed gave runs',runs);
      }else{
        stat.hit++;stat.byType[ty].hit++;
        if(!dead.hit)bad('scored a shot without bat contact',lab);
        if(runs===null||runs===undefined){bad('runs null on finished hit',lab);continue}
        if(G.score!==sc0+runs)bad('score mismatch',G.score+' vs '+(sc0+runs));
        stat.runs[runs]=(stat.runs[runs]||0)+1;
        const kmh=G.last.kmh;stat.maxKmh=Math.max(stat.maxKmh,kmh);stat.speeds.push(kmh);
        if(!(kmh>0&&kmh<230))bad('implausible exit speed',kmh);
        // ---- boundary rules
        const reached=dead.dist>=B;
        if(reached){ if(dead.touched){stat.fours++;if(runs!==4)bad('crossed rope after bouncing but not 4',JSON.stringify([runs,dead]))}
                     else{stat.sixes++;if(runs!==6)bad('crossed rope on the full but not 6',JSON.stringify([runs,dead]))} }
        else if(runs>3)bad('4+ runs without crossing the rope',JSON.stringify([runs,dead.dist,B]));
        if(runs===6&&dead.touched)bad('SIX after ground contact','');
        if(runs===4&&!dead.touched)bad('FOUR without ground contact','');
        if(lab==='Edge'||/edge/i.test(lab)){stat.edges++}
        // ---- timing label consistency
        const ms=parseInt(G.last.timing);
        if(lab==='PERFECT!'&&!(Math.abs(ms)<=20.5))bad('PERFECT outside +-20ms',G.last.timing);
        if(lab==='Good'&&!(Math.abs(ms)>=19.5&&Math.abs(ms)<=50.5))bad('Good outside 20-50ms',G.last.timing);
        if((lab==='Early'||lab==='Late')&&!(Math.abs(ms)>=49.5))bad(lab+' inside 50ms',G.last.timing);
        if(lab==='Early'&&!(ms<0))bad('Early with +ms',G.last.timing);
        if(lab==='Late'&&!(ms>0))bad('Late with -ms',G.last.timing);
        // ---- non-boundary tiers
        if(!reached){const c=lab==='PERFECT!'?'perfect':lab==='Good'?'good':(lab==='Early'||lab==='Late')?(Math.abs(ms)<=100?'avg':'poor'):'edge';
          const dd=dead.dist;const exp=c==='perfect'?(dd>=35?3:2):c==='good'?(dd>=40?3:2):c==='avg'?(dd>=25?2:1):(dd>=15?1:0);
          if(runs!==exp)bad('tier runs wrong',JSON.stringify([lab,c,runs,exp,dd.toFixed(1)]))}
        stat.dirs[G.last.dirName]=(stat.dirs[G.last.dirName]||0)+1;
      }
    }
    if(vc===vc0)check('run ok',true);
  }
}
const sp=stat.speeds.sort((a,b)=>a-b);
console.log(`L${L+1} ${LEVELS[L].name} (rope ${B} m): ${stat.n} swings/misses | hit ${stat.hit} missed ${stat.missed} bowled ${stat.bowled} | 4s ${stat.fours} 6s ${stat.sixes}`);
console.log('  labels',JSON.stringify(stat.labels));console.log('  runs',JSON.stringify(stat.runs),'| exit km/h median',sp[sp.length>>1]||0,'max',stat.maxKmh);
console.log('  directions',JSON.stringify(stat.dirs));
console.log('  per delivery type',Object.entries(stat.byType).map(([k,v])=>`${k}:${v.hit}h/${v.missed}m/${v.bowled}b`).join(' '));
const r=T.done('SWEEP L'+(L+1));if(viol.length)console.log(viol.join('\n'));
