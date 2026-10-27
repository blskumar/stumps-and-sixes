const {build}=require('./lib');const T=require('./framework');const check=T.check;const fs=require('fs');
const m=build({seed:99,audio:true,w:1000,h:600});const {api}=m;const {G,CFG}=api;m.key('KeyZ');
let rnd=12345;const R=()=>(rnd=(rnd*1664525+1013904223)>>>0)/4294967296;
const sizes=[[1000,600],[320,480],[2560,1440],[100,60],[800,2000],[1920,1080],[360,640]];
let balls=0,bowled=0,maxLvl=0,errs=0,nan=0,stuck=0,frames=0,restarts=0,sixes=0,fours=0;const t0=Date.now();
const finite=()=>{const b=G.ball;if(b&&![b.x,b.y,b.z,b.vx,b.vy,b.vz].every(Number.isFinite))nan++;if(!Number.isFinite(G.score)||!Number.isFinite(G.cd))nan++};
for(let inn=0;inn<70;inn++){
  api.restart();restarts++;const lv=Math.floor(R()*5);G.level=lv;api.applyLevel(lv);
  if(inn%9===0){const [w,h]=sizes[inn%sizes.length];m.win.innerWidth=w;m.win.innerHeight=h;m.win.devicePixelRatio=[1,2,3][inn%3];try{api.resize()}catch(e){errs++;console.log('resize',e.message)}}
  let wait=0;
  for(let n=0;n<40&&!G.over;n++){
    const delay=R()<.15?9:R()*.75;      // 15% never swing
    let t=0,swung=false,steps=0;
    G.cd=Math.min(G.cd,.001);
    const startBalls=G.balls;
    while(steps++<240*30){
      try{api.update(CFG.STEP);if(steps%30===0)api.render()}catch(e){errs++;if(errs<4)console.log('EXC',e.stack.split('\n').slice(0,3).join(' | '));break}
      frames++;finite();
      if(G.phase==='live'){t+=CFG.STEP;if(!swung&&t>=delay&&G.ball&&G.ball.x>8){api.doSwing();swung=true}}
      if(G.phase==='countdown'&&G.balls>startBalls&&G.cd<4.9)break;
      if(G.phase==='over'&&G.overTimer>2.5)break;
    }
    if(steps>=240*30)stuck++;
    balls++;if(G.last&&G.last.runs===6)sixes++;if(G.last&&G.last.runs===4)fours++;
    // the 5 s gap must be armed after every non-wicket ball
    if(!G.over){check('5 s gap armed',G.phase==='countdown'&&G.cd>4.7&&G.cd<=5.0001,G.phase+' '+G.cd)}
    maxLvl=Math.max(maxLvl,G.level);
    if(R()<.03){m.key('KeyM');m.key('ArrowUp');m.key('KeyH');m.key('Escape')}
  }
  if(G.over)bowled++;
}
check('no exceptions in update/render over %d frames'.replace('%d',frames),errs===0,errs);
check('no NaN/Infinity anywhere',nan===0,nan);
check('no stuck / endless deliveries',stuck===0,stuck);
check('every innings ends in BOWLED or is abandoned cleanly',bowled>50,bowled);
check('score persists as number & table valid',api.HS.load().every(r=>Number.isFinite(r.score))&&api.HS.load().length<=10);
console.log(`soak: ${restarts} innings, ${balls} deliveries, ${frames} sim frames, ${bowled} bowled, ${sixes} sixes, ${fours} fours, reached level ${maxLvl+1}, ${((Date.now()-t0)/1000).toFixed(0)}s`);
// canvas edge sizes render without throwing
for(const [w,h,d] of [[1,1,1],[0,0,1],[4000,300,1],[300,4000,3],[640,480,0.5]]){m.win.innerWidth=w;m.win.innerHeight=h;m.win.devicePixelRatio=d;let ok=true;try{api.resize();api.render()}catch(e){ok=false;console.log(e.message)}check(`resize ${w}x${h}@${d}: renders`,ok)}
T.done('SOAK + RESIZE');
