/* Chord Lab · tonal-context bridge. Pure/offline.
   Distinguishes roots/degrees from aesthetic stylistic recommendations.
   Every wheel key generates at least two proposals from that key's diatonic harmony;
   remaining choices retain the selected composer's documented, heuristic palette. */
(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./theory-map.js'):root.TheoryMap,
    node?require('./path-engine.js'):root.ComposerPaths,
    node?require('./fifths-engine.js'):root.FifthsLab);
  if(node)module.exports=api;else root.HarmonicContext=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(T,P,F){
 'use strict';
 const pc=T.mod;
 const numerals=['I','II','III','IV','V','VI','VII'];
 const chromatic=['I','♭II','II','♭III','III','IV','♯IV','V','♭VI','VI','♭VII','VII'];
 const LOWER=new Set(['minor','m7','m9','mMaj7','m7b5','dim','dim7']);
 const suffix={major:'',minor:'',dim:'°',dim7:'°7',m7b5:'ø7',aug:'+',maj7:'maj7',m7:'7',m9:'9',mMaj7:'(maj7)',7:'7',add9:'add9',sus2:'sus2',sus4:'sus4',quartal:'(4ths)',maj7sharp11:'maj7(♯11)',octColor:'(oct.)'};
 function context(ch,tonic,mode='ionian'){
   const scale=T.MODE[mode]||T.MODE.ionian;
   const scalePcs=scale.steps.map(s=>pc(tonic+s));
   const root=pc(ch.root), idx=scalePcs.indexOf(root);
   const lower=LOWER.has(ch.quality);
   const alteration=idx>=0?scale.steps[idx]-[0,2,4,5,7,9,11][idx]:0;
   const accidental=alteration<0?'♭'.repeat(-alteration):'♯'.repeat(alteration);
   let degree=idx>=0?accidental+numerals[idx]:chromatic[pc(root-tonic)];
   if(lower)degree=degree.replace(/[IVX]+$/,t=>t.toLowerCase());
   const roman=degree+(Object.prototype.hasOwnProperty.call(suffix,ch.quality)?suffix[ch.quality]:' · χρώμα');
   const pcs=ch.pcs||ch.notes.map(pc);
   const inScale=pcs.every(n=>scalePcs.includes(pc(n)));
   const diatonic=idx>=0;
   const degreeLabel=idx>=0?`${idx+1}η βαθμίδα`:'χρωματική ρίζα';
   const keyName=['ionian','aeolian'].includes(mode)?F.keyFrom(tonic,mode).name:T.name(tonic)+' '+scale.label;
   let functionName='';
   // A root alone cannot establish a harmonic function. Require the actual
   // pitch collection to include the corresponding diatonic triad as well.
   const triad=idx>=0?F.degrees(tonic,mode,false)[idx]:null;
   const supportsTriad=inScale&&triad&&triad.pcs.every(p=>pcs.includes(p));
   if(supportsTriad&&mode==='ionian')functionName=idx===0?'τονική':idx===4?'δεσπόζουσα':idx===3||idx===1?'προδεσπόζουσα':'';
   else if(supportsTriad&&mode==='aeolian')functionName=idx===0?'τονικό κέντρο (i)':idx===4?'φυσική ελάσσων v':idx===3?'υποδεσπόζουσα':'';
   return {roman,degree:idx,degreeLabel,inScale,diatonic,keyName,functionName,
     qualification:inScale?'νότες εντός κλίμακας':'περιέχει χρωματικές νότες',
     text:`${roman} στη ${keyName} · ${degreeLabel}${functionName?' · '+functionName:''} · ${inScale?'εντός κλίμακας':'χρωματικό χρώμα'}`};
 }
 const priority={
  suspension:[3,1,5,4,2,6,0],nostalgia:[5,3,2,1,0,4,6],
  tension:[4,6,1,3,5,2,0],release:[0,4,3,5,1,2,6],
  mystery:[2,5,6,1,3,4,0],motion:[4,1,3,5,2,0,6]
 };
 const signature=c=>(c.pcs||c.notes.map(pc)).slice().sort((a,b)=>a-b).join(',');
 function degreeChoice(src,ch,tonic,mode,style,goal,roman,history=[]){
   const cmp=P.compare(src,ch),meta=P.scoreCandidate(src,ch,cmp,{style,tonic,mode,goal,history});
   const adjusted=P.voiceNear(src,ch);
   const keyName=F.keyFrom(tonic,mode).name;
   const kept=cmp.common.length;
   return {...adjusted,source:'circle-degree',sourceLabel:`${roman} · από τον κύκλο`,
     theory:`${roman} βαθμίδα στη ${keyName}. ${kept} κοινές νότες με την τρέχουσα συγχορδία. ${meta.why.join(' · ')}.`,
     orchestration:'',score:meta.score,why:meta.why,compared:cmp,
     explain:{summary:`${roman} βαθμίδα στη ${keyName}. ${kept} κοινές νότες· ${meta.why.join(' · ')}.`},
     id:`circle:${tonic}:${mode}:${ch.root}:${ch.quality}`};
 }
 function suggestions(src,{tonic=0,mode='ionian',style='takemitsu',goal='suspension',sevenths=false,limit=4,history=[]}={}){
   const degreeRows=F.degrees(tonic,mode,sevenths);
   const baseOrder=priority[goal]||priority.suspension;
   const frequency=ch=>history.slice(-8).filter(x=>signature(x)===signature(ch)).length;
   const order=history.length&&style!=='glass'?baseOrder.slice().sort((a,b)=>frequency(degreeRows[a])-frequency(degreeRows[b])||baseOrder.indexOf(a)-baseOrder.indexOf(b)):baseOrder;
   const original=P.candidates(src,{tonic,mode,style,goal,limit:20,history});
   const final=[],seen=new Set([signature(src)]);
   function push(x){if(!x||seen.has(signature(x)))return false;seen.add(signature(x));final.push(x);return true;}
   // Wheel selection has a visible, musically grounded consequence:
   // tonic of the selected key, then one purposeful degree selected by intention.
   if(src.root!==pc(tonic)||signature(src)!==signature(degreeRows[0])){
     push(degreeChoice(src,degreeRows[0],tonic,mode,style,goal,degreeRows[0].roman,history));
   }
   for(const i of order){if(final.length>=2)break;
     const d=degreeRows[i];push(degreeChoice(src,d,tonic,mode,style,goal,d.roman,history));
   }
   // Keep composer-specific colours alongside conventional tonal motion.
   // A chromatic suggestion is explicitly labelled as such in the UI.
   const styled=original.filter(c=>['palette','progression'].includes(c.source));
   for(const c of styled){if(final.length>=3)break;push(c);}
   const candidatePool=original.filter(c=>c.source!=='degree');
   for(const c of candidatePool){if(final.length>=limit)break;push(c);}
   for(const i of order){if(final.length>=limit)break;
     const d=degreeRows[i];push(degreeChoice(src,d,tonic,mode,style,goal,d.roman,history));
   }
   return final.slice(0,limit).map(c=>({...c,harmony:context(c,tonic,mode)}));
 }
 return {context,suggestions};
});
