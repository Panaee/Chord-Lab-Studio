/* Chord Lab: common-chord modulation in major / natural-minor key collections.
   The five closely related keys are the adjacent major/minor signatures (plus
   relative); sharing pitches is not itself proof of a modulation. New-key V7
   -> i/I establishes a proposed cadence, which must be heard in context. */
(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./theory-map.js'):root.TheoryMap,
    node?require('./fifths-engine.js'):root.FifthsLab,
    node?require('./path-engine.js'):root.ComposerPaths);
  if(node)module.exports=api;else root.ModulationLab=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(T,F,P){
 'use strict';
 const pc=T.mod;
 const identity=k=>`${k.index}:${k.minor?1:0}`;
 const keyCollection=k=>new Set(T.MODE[k.mode].steps.map(x=>pc(k.root+x)));
 const overlap=(a,b)=>[...keyCollection(a)].filter(x=>keyCollection(b).has(x)).length;
 const chordIdentity=c=>[...new Set(c.pcs.map(pc))].sort((a,b)=>a-b).join(',');
 function commonChords(from,to){
   const original=F.degrees(from.root,from.mode,false),target=F.degrees(to.root,to.mode,false);
   return original.flatMap((a,i)=>target.flatMap((b,j)=>{
     if(chordIdentity(a)!==chordIdentity(b))return [];
     return [{label:a.label,root:a.root,quality:a.quality,pcs:a.pcs,sourceRoman:a.roman,targetRoman:b.roman,
       sourceDegree:i,targetDegree:j,chord:a}];
   }));
 }
 function destinations(from){
   // In major: relative minor, dominant & subdominant keys and their relatives.
   // In minor: relative major, minor dominant/subdominant and their relatives.
   const raw=[
     {key:F.at(from.index+1,from.minor),kind:'Προς πέμπτη',order:0},
     {key:F.at(from.index-1,from.minor),kind:'Προς τέταρτη',order:1},
     {key:F.at(from.index,!from.minor),kind:'Σχετική',order:2},
     {key:F.at(from.index+1,!from.minor),kind:'Συγγενική',order:3},
     {key:F.at(from.index-1,!from.minor),kind:'Συγγενική',order:4}
   ];
   return raw.map(x=>({...x,shared:overlap(from,x.key),pivots:commonChords(from,x.key)}));
 }
 function rankPivots(rows,current){
   const chord=current?.pcs?chordIdentity(current):null;
   return rows.map(p=>{
     let score=0;
     if(p.targetDegree===1||p.targetDegree===3)score+=6; // ii / iv predominants
     if(p.targetDegree===0)score+=4;
     if(p.sourceDegree===0)score+=3;
     if(p.targetDegree===4)score-=3; // the destination's own dominant is not preferred as a pivot
     if(chord&&chordIdentity(p.chord)===chord)score+=20;
     return {...p,score};
   }).sort((a,b)=>b.score-a.score||a.targetDegree-b.targetDegree);
 }
 function path(from,to,pivot){
   if(identity(from)===identity(to))throw Error('Choose a different key');
   const available=commonChords(from,to);
   if(!pivot||!available.some(x=>chordIdentity(x.chord)===chordIdentity(pivot.chord)))throw Error('Pivot not shared by both keys');
   const bridge=P.chord(pivot.root,pivot.quality);
   const dominant=P.chord(pc(to.root+7),'7');
   const arrival=P.chord(to.root,to.minor?'minor':'major');
   return {from,to,pivot,steps:[bridge,dominant,arrival],
     degrees:[`${pivot.sourceRoman} → ${pivot.targetRoman}`,`V7 / ${to.name}`,to.minor?'i':'I'],
     note:to.minor?'Η V7 χρησιμοποιεί προσαγωγέα της αρμονικής ελάσσονας: μπορεί να έχει νότα εκτός φυσικής ελάσσονας.':'Η V7 εισάγει τη δεσπόζουσα της νέας τονικότητας.'};
 }
 return {identity,keyCollection,overlap,commonChords,destinations,rankPivots,path};
});
