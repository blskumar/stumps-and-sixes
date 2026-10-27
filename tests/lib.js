const fs=require('fs'),vm=require('vm');const {createCanvas}=require('canvas');
const FILE=require('path').join(__dirname,'..','index.html');
const src=fs.readFileSync(FILE,'utf8').match(/<script>([\s\S]*)<\/script>/)[1];
// ---- mock Web Audio: records every voice (noise/osc) with start, stop and peak gain
class Param{constructor(v){this.value=v||0;this.exps=[]}setValueAtTime(v){this.value=v;return this}exponentialRampToValueAtTime(v,t){this.exps.push(v);return this}setTargetAtTime(v){this.value=v}}
class Node{connect(n){this.out=n;return n}}
function chainPeak(n){let p=0;for(let k=0;n&&k<8;k++,n=n.out){if(n.gain&&n.gain.exps.length)p=Math.max(p,...n.gain.exps)}return p}
function chainFreq(n){for(let k=0;n&&k<8;k++,n=n.out){if(n.frequency&&n.type!==undefined&&n.freq0!==undefined)return n.freq0}return 0}
class MockAC{constructor(){this.currentTime=0;this.state='running';this.sampleRate=8000;this.voices=[];this.destination=new Node();this.nodes=0}
 resume(){this.state='running'}
 createBuffer(c,l){return{getChannelData:()=>new Float32Array(l)}}
 createGain(){const n=new Node();n.gain=new Param(1);this.nodes++;if(!this.firstGain)this.firstGain=n;return n}
 createDynamicsCompressor(){return new Node()}
 createBiquadFilter(){const n=new Node();n.type='';n.Q={value:1};const f=new Param(0);const o=f.setValueAtTime.bind(f);f.setValueAtTime=(v,t)=>{n.freq0=v;return o(v,t)};n.frequency=f;this.nodes++;return n}
 createBufferSource(){const ac=this,n=new Node();n.loop=false;n.start=(t)=>{n.t0=t;ac.voices.push({kind:'noise',v:n})};n.stop=(t)=>{n.t1=t};return n}
 createOscillator(){const ac=this,n=new Node();n.type='sine';const f=new Param(0);const o=f.setValueAtTime.bind(f);f.setValueAtTime=(v,t)=>{n.freq0=v;return o(v,t)};n.frequency=f;n.start=(t)=>{n.t0=t;ac.voices.push({kind:'osc',v:n})};n.stop=(t)=>{n.t1=t};return n}
 voiceInfo(){return this.voices.map(o=>({kind:o.kind,t0:o.v.t0,dur:o.v.t1-o.v.t0,peak:chainPeak(o.v.out)}))}}
function build(o={}){
  const W=o.w||1000,H=o.h||600;let s=(o.seed||1)>>>0;const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
  const cv=createCanvas(W,H);cv.style={};cv.addEventListener=()=>{};
  const store={};const els={};
  const stub=()=>({style:{},textContent:'',innerHTML:'',value:'0',classList:{_h:true,add(c){if(c==='hidden')this._h=true},remove(c){if(c==='hidden')this._h=false},contains(c){return c==='hidden'?this._h:false},toggle(){}},setAttribute(){},addEventListener(ev,fn){(this.h=this.h||{})[ev]=fn},blur(){}});
  const doc={getElementById:id=>id==='c'?cv:(els[id]=els[id]||stub())};
  const ac=o.audio?new MockAC():null;
  const win={innerWidth:W,innerHeight:H,devicePixelRatio:o.dpr||1,wh:{},addEventListener(ev,fn){(win.wh[ev]=win.wh[ev]||[]).push(fn)}};win.document=doc;
  if(ac)win.AudioContext=function(){return ac};
  if(o.acThrows)win.AudioContext=function(){throw new Error('no audio')};
  const M=Object.create(Math);M.random=rnd;
  const ls=o.storage===null?undefined:(o.storage||{getItem:k=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v)}});
  const sb={window:win,document:doc,requestAnimationFrame(){},Math:M,console,setTimeout:()=>0,localStorage:ls};
  if(o.badStorage)sb.localStorage={getItem(){throw new Error('denied')},setItem(){throw new Error('denied')}};
  vm.createContext(sb);vm.runInContext(src,sb);
  const api=win.__cricket;
  const key=(code,extra)=>{const ev=Object.assign({code,repeat:false,preventDefault(){},target:{}},extra||{});(win.wh.keydown||[]).forEach(f=>f(ev))};
  const fire=(id,evn,arg)=>{const e=els[id];if(e&&e.h&&e.h[evn])e.h[evn](arg||{currentTarget:e,target:Object.assign(e,{blur(){}})})};
  return {api,cv,els,ac,store,win,key,fire,seed:v=>{s=v>>>0},rnd};
}
// wrap every SFX method to log calls: [{n:name,a:args,t:simTime}]
function spySFX(api){const log=[];for(const k of Object.keys(api.SFX)){const f=api.SFX[k];if(typeof f!=='function')continue;api.SFX[k]=(...a)=>{log.push({n:k,a,t:api.G.time});return f(...a)}}return log}
function injector(m,log){const {api}=m,{G,CFG}=api;
  return function inject(level,sp){
    api.restart();G.level=level;api.applyLevel(level);G.phase='live';G.cd=0;
    const cls=sp.cls||'perfect',spd=Math.hypot(sp.vx,sp.vy,sp.vz);
    const b={x:sp.x,y:sp.y,z:sp.z,vx:sp.vx,vy:sp.vy,vz:sp.vz,bounces:0,onGround:!!sp.onGround,spinRate:20,seam:0,swing:0,spinTurn:0,hit:true,dead:false,sim:true,age:0,trail:[],touched:false,
      info:{offsetMs:0,Rc:.64,bz:0,theta:.3,exit:spd,yaw:.1,q:1,edge:cls==='edge',dir:Math.atan2(sp.vz,sp.vx),t:G.time,cls:{cls,label:cls,color:'#fff'},kmh:spd*3.6},cur:null};
    G.ball=b;G.last={label:cls,color:'#fff',timing:'+0 ms',kmh:Math.round(spd*3.6),runs:null,dirName:'straight'};
    G.swing={active:false,t:0,used:true};G.score=sp.score||0;G.balls=0;G.callout=null;G.ropeHit=null;if(log)log.length=0;
    return b};}
module.exports={build,spySFX,injector,FILE};
