/* Seven limited-transposition modes: pitch-class collections, not major/minor keys.
   Acoustic/structural relationships are distinct from composer-style heuristics. */
(function(root,factory){'use strict';const api=factory(typeof module==='object'&&module.exports?require('./theory-map.js'):root.TheoryMap,typeof module==='object'&&module.exports?require('./path-engine.js'):root.ComposerPaths);if(typeof module==='object'&&module.exports)module.exports=api;else root.MessiaenModes=api;})(typeof globalThis!=='undefined'?globalThis:this,function(T,P){
 'use strict';
 const PATTERNS={
  1:{intervals:[2,2,2,2,2,2],transpositions:2,name:'Ολοτονικός',character:'εξάφθογγη συμμετρία· απουσία ημιτονίων'},
  2:{intervals:[1,2,1,2,1,2,1,2],transpositions:3,name:'Οκτατονικός',character:'εναλλαγή ημιτονίου και τόνου'},
  3:{intervals:[2,1,1,2,1,1,2,1,1],transpositions:4,name:'Εννεατονικός',character:'τρία επαναλαμβανόμενα τετράφθογγα κύτταρα'},
  4:{intervals:[1,1,1,3,1,1,1,3],transpositions:6,name:'8 φθόγγοι · 1–1–1–3',character:'δύο συμμετρικά τετράφθογγα κύτταρα'},
  5:{intervals:[1,1,4,1,1,4],transpositions:6,name:'6 φθόγγοι · 1–1–4',character:'δύο συμμετρικά τρίφθογγα κύτταρα'},
  6:{intervals:[1,1,2,2,1,1,2,2],transpositions:6,name:'8 φθόγγοι · 1–1–2–2',character:'δύο επαναλαμβανόμενα τετράφθογγα κύτταρα'},
  7:{intervals:[1,1,1,1,2,1,1,1,1,2],transpositions:6,name:'10 φθόγγοι · 1–1–1–1–2',character:'δύο συμμετρικές ομάδες πέντε φθόγγων'}
 };
 const pc=T.mod, unique=xs=>[...new Set(xs)].sort((a,b)=>a-b);
 function collection(mode=2,tonic=0,transposition=0){const data=PATTERNS[mode];if(!data)throw Error('Μη έγκυρος τρόπος Messiaen');const step=((transposition%data.transpositions)+data.transpositions)%data.transpositions;
  const offsets=[0];let n=0;for(const interval of data.intervals.slice(0,-1)){n+=interval;offsets.push(n);}
  const notes=unique(offsets.map(x=>pc(tonic+step+x)));
  return {...data,mode,tonic:pc(tonic),transposition:step,pitchClasses:notes,offsets,notation:`M${mode} · T${step+1}`,noteNames:notes.map(T.name)};
 }
 function context(ch,col){const ix=col.offsets.indexOf(pc(ch.root-col.tonic-col.transposition));const inside=ch.pcs.every(p=>col.pitchClasses.includes(pc(p)));return {roman:ix>=0?`M${col.mode} · ${ix+1}`:`M${col.mode} · χρωμ.`,degree:ix,degreeLabel:ix>=0?`${ix+1}η θέση της συλλογής`:'ρίζα εκτός συλλογής',inScale:inside,diatonic:false,keyName:col.notation,functionName:'',qualification:inside?'όλες οι νότες μέσα στον τρόπο':'περιέχει νότες εκτός τρόπου'};}
 // Each suggestion is a REAL pitch-class subset of the selected symmetric collection,
 // scored with the pre-existing goal/composer heuristics + explicit voice-leading.
 function suggestions(src,opts={}){
  const col=collection(opts.messiaenMode||2,opts.tonic||0,opts.transposition||0);
  const candidate=[],seen=new Set(),quals=['major','minor','maj7','m7','dim','aug','sus2','sus4','quartal','7','m7b5','dim7','add9','maj7sharp11'];
  const key=(ch)=>unique(ch.pcs).join(',');
  for(const root of col.pitchClasses)for(const quality of quals){const c=P.chord(root,quality);if(!c.pcs.every(p=>col.pitchClasses.includes(p)))continue;if(key(c)===key(src)||seen.has(key(c)))continue;seen.add(key(c));candidate.push(c);}
  // Color clusters built only out of existing degrees; allow 4-note collections.
  const ordered=col.offsets.map(x=>pc(col.tonic+col.transposition+x));
  for(let i=0;i<ordered.length;i++){
   const pcs=unique([0,1,2,3].map(k=>ordered[(i+k)%ordered.length]));
   if(seen.has(pcs.join(','))||key(src)===pcs.join(','))continue;
   const bass=ordered[i],notes=pcs.map(p=>60+p).sort((a,b)=>a-b);
   seen.add(pcs.join(','));candidate.push({root:bass,quality:'custom',label:T.name(bass)+' · mode cluster',notes,pcs});
  }
  const evaluated=candidate.map(ch=>{
   const voiced=P.voiceNear(src,ch),cmp=P.compare(src,voiced);
   const scored=P.scoreCandidate(src,voiced,cmp,{goal:opts.goal||'suspension',style:opts.style||'free',tonic:col.tonic,mode:'ionian',history:opts.history||[]});
   const relation=cmp.common.length?`${cmp.common.length} κοινές νότες (${cmp.common.map(T.name).join(', ')})`:'χωρίς κοινή νότα';
   let score=scored.score+3.2;const tritone=voiced.pcs.some(p=>voiced.pcs.includes(pc(p+6))),semitone=voiced.pcs.some(p=>voiced.pcs.includes(pc(p+1)));
   if(opts.goal==='mystery'&&tritone)score+=1.2;
   if(opts.goal==='tension'&&semitone)score+=1.4;
   if(opts.goal==='release'&&cmp.cost<=3)score+=1.1;
   return {...voiced,sourceLabel:`Messiaen ${col.mode} · συμμετρικός τρόπος`,source:'messiaen',score,why:[`${col.notation}: ${relation}`, ...scored.why],theory:`Όλες οι νότες ανήκουν στον ${col.notation} (${col.character}). ${relation}. Απόσταση αλλαγής φωνών: ${cmp.cost} ημιτόνια (μοντέλο pitch-class voice leading).`,compared:cmp,explain:{summary:`${relation} · συμμετρική συλλογή`},harmony:context(voiced,col)};
  }).sort((a,b)=>b.score-a.score);
  // Diverse roots/families prevent the interface from offering four near-identical chords.
  const picked=[],roots=new Set();for(const c of evaluated){if(!roots.has(c.root)){picked.push(c);roots.add(c.root);}if(picked.length===Math.min(opts.limit||4,4))break;}
  for(const c of evaluated){if(picked.length>=Math.min(opts.limit||4,4))break;if(!picked.includes(c))picked.push(c);}
  return picked;
 }
 return {PATTERNS,collection,context,suggestions};
});
