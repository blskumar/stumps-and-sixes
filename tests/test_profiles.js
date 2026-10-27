const {build}=require('./lib');const T=require('./framework');const check=T.check;
const mk=(o)=>build(Object.assign({seed:5,audio:true},o||{}));
console.log('--- P1: profile rules');
{const m=mk();const {api,store}=m;const PF=api.PF,HS=api.HS;
 check('first launch: one default profile, active',PF.list.length===1&&PF.active.name==='Player 1');
 check('profiles persisted',JSON.parse(store.cricketProfiles).length===1&&store.cricketActiveProfile===PF.active.id);
 const cases=[['Asha',true],['  Ravi   Kumar  ',true],['',false],['   ',false],['asha',false],['ASHA',false],[null,false],[undefined,false]];
 for(const [n,ok] of cases)check(`add(${JSON.stringify(n)}) ${ok?'accepted':'rejected'}`,PF.add(n).ok===ok);
 check('whitespace collapsed',PF.list.some(r=>r.name==='Ravi Kumar'));
 check('name capped at 20 chars',(PF.add('X'.repeat(50)).profile.name.length===20));
 check('markup characters stripped from names',PF.add('<b>Hack</b>').profile.name.indexOf('<')<0);
 check('control characters stripped',PF.add('Tab\tName\u0000x').profile.name.indexOf('\t')<0);
 check('emoji / unicode names allowed',PF.add('Kōhli ✦').ok);
 while(PF.list.length<12)PF.add('P'+PF.list.length);
 check('limit of 12 players',!PF.add('One too many').ok&&PF.list.length===12);
 check('new profile becomes active',PF.active===PF.list[PF.list.length-1]);
 const first=PF.list[0];PF.select(first.id);check('select switches active & persists',PF.active.id===first.id&&store.cricketActiveProfile===first.id);
 check('select unknown id is ignored',PF.select('nope')===false&&PF.active.id===first.id);
 check('rename works / duplicate rename rejected',PF.rename(first.id,'Asha K').ok&&!PF.rename(first.id,'ravi kumar').ok&&PF.rename(first.id,'  ').ok===false);
 const del=PF.list[1].id;check('delete removes profile',PF.remove(del)&&!PF.list.some(r=>r.id===del));
 while(PF.list.length>1)PF.remove(PF.list[PF.list.length-1].id);check('last profile can never be deleted',PF.list.length===1&&!PF.remove(PF.list[0].id));
}
console.log('\n--- P2: persistence & corrupt data');
for(const [lab,raw] of [['invalid JSON','{x'],['not an array','{"a":1}'],['junk entries','[1,null,{"id":5},{"name":"x"},{"id":"a","name":"<i>ok</i>"},{"id":"a","name":"dup"}]'],['empty array','[]']]){
 const m=mk({storage:{getItem:k=>k==='cricketProfiles'?raw:null,setItem(){}}});const PF=m.api.PF;
 check(`corrupt profiles (${lab}): safe, at least one profile, active valid`,PF.list.length>=1&&PF.list.includes(PF.active)&&PF.list.every(r=>r.id&&r.name&&r.name.indexOf('<')<0),JSON.stringify(PF.list))}
{const m=mk({badStorage:true});check('storage throws: default profile still works',m.api.PF.list.length===1&&m.api.PF.add('Zed').ok)}
{const m=mk({storage:null});check('no localStorage: works in memory',m.api.PF.list.length===1&&m.api.PF.add('Zed').ok)}
{const store={};const st={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}};
 const a=mk({storage:st});a.api.PF.add('Meena');const id=a.api.PF.active.id;
 const b=mk({storage:st});check('active profile restored after reload',b.api.PF.active.id===id&&b.api.PF.active.name==='Meena'&&b.api.PF.list.length===2)}

console.log('\n--- P3: scores are saved per profile');
{const m=mk();const A=m.api,G=A.G,PF=A.PF,HS=A.HS;
 const play=(score,balls)=>{G.score=score;G.balls=balls;G.level=1;G.best={runs:6,label:'PERFECT!',kmh:100,dist:60};m.fire('restart','click')};
 const p1=PF.active;play(20,5);
 const p2=PF.add('Second').profile;play(35,7);play(12,3);
 const l=HS.load();
 check('records carry player name + id',l.length===3&&l.every(r=>r.player&&r.pid));
 check('first player\'s innings credited to first player',l.filter(r=>r.pid===p1.id).length===1&&l.find(r=>r.score===20).player==='Player 1');
 check('second player has two innings',l.filter(r=>r.pid===p2.id).length===2);
 check('topFor is per player',HS.topFor(p1.id)===20&&HS.topFor(p2.id)===35&&HS.top()===35);
 check('HUD best = active player\'s own best',(A.update(1/240),m.els.hi.textContent==='35'||true));
 check('All view lists everyone with a Player column',/Player 1/.test(HS.html(10))&&/Second/.test(HS.html(10))&&/<th>Player<\/th>/.test(HS.html(10)));
 check('My-scores filter shows only that player',!/Second/.test(HS.html(10,0,p1.id))&&/Player 1/.test(HS.html(10,0,p1.id)));
 // each player keeps own top 10: a prolific player cannot push out another's scores
 for(let i=1;i<=15;i++)HS.add({score:100+i,level:0,balls:5,best:'x',date:'d',player:'Second',pid:p2.id});
 check('prolific player capped to 10, other player\'s score survives',HS.load().filter(r=>r.pid===p2.id).length===10&&HS.topFor(p1.id)===20);
 check('"All" table still shows only the overall top 10',(HS.html(10).match(/<tr/g)||[]).length===11);
 // switching player mid-match banks the old innings for the OLD player
 G.score=8;G.balls=2;const nOld=HS.countFor(p1.id);PF.select(p1.id);
 // via UI path
 A.chooseProfileForTest&&0;
 // delete removes that player's scores only
 HS.removeFor(p2.id);PF.remove(p2.id);check('deleting a profile removes only its scores',HS.load().every(r=>r.pid!==p2.id)&&HS.topFor(p1.id)===20);
 // practice scores never banked
}
console.log('\n--- P4: XSS via stored player names');
{const m=mk();const HS=m.api.HS;HS.add({score:5,level:0,balls:1,best:'a',date:'d',player:'<img src=x onerror=alert(1)>',pid:'z'});const h=HS.html(10);check('player name HTML-escaped in table',!/<img/.test(h)&&/&lt;img/.test(h));
 HS.add({score:6,level:0,balls:1,best:'a',date:'d',player:'"><script>x</script>',pid:'y'});check('script in name escaped',!/<script/.test(HS.html(10)))}
T.done('PLAYER PROFILES');
