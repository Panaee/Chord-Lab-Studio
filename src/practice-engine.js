/* Chord Lab Studio · ear practice from your own piece. Each move between two
   steps gives up to three questions: which degree came, where the bass went,
   where the top voice went. Answers are scheduled in Leitner boxes: a right
   answer waits longer each time, a wrong one comes back in the same session.
   Pure code, no DOM; offline UMD. */
(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./theory-map.js'):root.TheoryMap,node?require('./next-engine.js'):root.NextChords);
  if(node)module.exports=api;else root.EarPractice=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(T,N){
'use strict';
const pc=T.mod,uniq=xs=>[...new Set(xs)].sort((a,b)=>a-b);
const MIN=60e3,DAY=864e5;
/* Waiting time after a right answer, by box: 10 minutes, then 1, 3, 7, 21 days. */
const WAIT=[0,10*MIN,DAY,3*DAY,7*DAY,21*DAY];
const KINDS=['degree','bass','top'];

/* The degree without its seventh: V7 → V, viiø → vii°. */
const plain=r=>String(r).replace(/maj7$|7$/,'').replace(/ø$/,'°');
const romanOf=(ch,key)=>plain(N.roman({root:ch.root,notes:ch.notes,pcs:uniq(ch.notes.map(pc))},key));
/* A stable order that still mixes moves and kinds. */
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};

function itemId(kind,a,b,keyOpts){return [kind,uniq(a.notes).join('.'),uniq(b.notes).join('.'),pc(keyOpts.tonic||0),keyOpts.mode||'ionian'].join('|');}

/* Every question the piece can ask. Messiaen collections have no plain degrees. */
function items(steps,keyOpts){
  const key=N.keyOf(keyOpts),kinds=key.messiaen?['bass','top']:KINDS,out=[];
  for(let i=1;i<steps.length;i++)for(const kind of kinds)out.push({id:itemId(kind,steps[i-1],steps[i],keyOpts),kind,i});
  return out;
}

const direction=d=>d>0?'up':d<0?'down':'same';
/* The question for one item: options, the answer, and what to show after. */
function question(item,steps,keyOpts,rnd=Math.random){
  const a=steps[item.i-1],b=steps[item.i],key=N.keyOf(keyOpts);
  if(item.kind==='degree'){
    const answer=romanOf(b,key),from=romanOf(a,key);
    const others=[...new Set(N.keyChords(key).map(ch=>plain(N.roman(ch,key))))].filter(r=>r!==answer);
    for(let i=others.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[others[i],others[j]]=[others[j],others[i]];}
    const options=[answer,...others.slice(0,3)];
    for(let i=options.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[options[i],options[j]]=[options[j],options[i]];}
    return {kind:'degree',from,answer,options};
  }
  const A=uniq(a.notes),B=uniq(b.notes);
  const [x,y]=item.kind==='bass'?[A[0],B[0]]:[A[A.length-1],B[B.length-1]];
  return {kind:item.kind,answer:direction(y-x),options:['up','down','same'],from:x,to:y,delta:y-x};
}

/* After an answer: up one box, or back to the first and due now. */
function grade(record,correct,now){
  const box=correct?Math.min(WAIT.length-1,(record?.box||0)+1):0;
  return {box,due:now+(correct?WAIT[box]:0)};
}

/* The next item: due ones first, lower boxes first, never the same twice in a
   row. Nothing due: null, with the time of the next one. anyway takes the
   soonest even if it is not due. */
function pick(list,records,now,lastId,anyway=false){
  if(!list.length)return {item:null,next:null};
  const rec=it=>records[it.id]||{box:0,due:0};
  const order=(a,b)=>rec(a).box-rec(b).box||rec(a).due-rec(b).due||hash(a.id)-hash(b.id);
  let due=list.filter(it=>rec(it).due<=now);
  if(!due.length&&anyway)due=list.slice().sort((a,b)=>rec(a).due-rec(b).due).slice(0,3);
  if(!due.length)return {item:null,next:Math.min(...list.map(it=>rec(it).due))};
  const fresh=due.filter(it=>it.id!==lastId);
  return {item:(fresh.length?fresh:due).sort(order)[0],next:null,due:due.length};
}

return {KINDS,WAIT,plain,items,question,grade,pick,itemId};
});
