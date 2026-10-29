/* Practical guitar pitch-class voicings for standard tuning. These describe fret
   positions (not finger assignments). They may revoice the source MIDI octaves. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GuitarShapes=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TUNING=[40,45,50,55,59,64],NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const pc=n=>((n%12)+12)%12;
// A same-fret barre may cross muted or higher-fretted strings, but cannot
// cross an open/lower string. This is a conservative four-finger estimate.
function fingerCount(frets){
 let fingers=0;
 for(const fret of [...new Set(frets.filter(f=>f>0))]){
  let covered=false;
  for(const position of frets){
   if(position>=0&&position<fret)covered=false;
   if(position===fret&&!covered){fingers++;covered=true;}
  }
 }
 return fingers;
}
function suggest(notes,rootPc){
 const pcs=[...new Set(notes.map(pc))].sort((a,b)=>a-b);if(!pcs.length)return null;
 const wanted=new Set(pcs);let best=null;
 // Four-fret windows and at most four fingers; open strings remain allowed.
 for(let base=1;base<=10;base++){
  let lists=TUNING.map(t=>{
   const a=[-1];if(wanted.has(pc(t)))a.push(0);
   for(let f=base;f<=Math.min(base+3,14);f++)if(wanted.has(pc(t+f)))a.push(f);
   return a;
  });
  function walk(i,fingers,used,bass,played,positions,open){
   if(i===6){
    if(played<Math.min(3,pcs.length)||played>6)return;
    const coverage=used.size;
    const gap=positions.length?Math.max(...positions)-Math.min(...positions):0;
    const fingerEstimate=fingerCount(fingers);if(fingerEstimate>4)return;
    const all=coverage===pcs.length;
    const first=fingers.findIndex(f=>f>=0),last=fingers.findLastIndex(f=>f>=0);
    const gaps=fingers.slice(first,last+1).filter(f=>f<0).length;
    // Fewer omitted pitch classes, compact chord shape, bass on root.
    const score=coverage*150+(all?85:0)+(bass===rootPc?28:0)-gap*5
       -positions.reduce((n,p)=>n+p,0)*.85-(positions.length?Math.max(...positions):0)*3+open*7-gaps*16-Math.abs(played-Math.min(4,pcs.length+1))*3;
    if(!best||score>best.score)best={frets:[...fingers],score,covered:coverage,all,missing:pcs.filter(p=>!used.has(p)),base,played,fingerEstimate};
    return;
   }
   for(const f of lists[i]){
    const p=f<0?null:pc(TUNING[i]+f);
    let next=used;if(p!==null&&!used.has(p)){next=new Set(used);next.add(p);}
    walk(i+1,[...fingers,f],next,bass===null&&p!==null?p:bass,played+(f>=0),f>0?[...positions,f]:positions,open+(f===0));
   }
  }
  walk(0,[],new Set(),null,0,[],0);
 }
 if(!best)return null;
 return {...best,notes:best.frets.map((f,i)=>f<0?null:NAMES[pc(TUNING[i]+f)]),tuning:['E','A','D','G','B','e']};
}
return {suggest,TUNING,pc,fingerCount};
});
