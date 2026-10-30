/* Chord Lab Studio · scales beyond the church modes and Messiaen's collections.
   Each scale has its steps from the tonic, a group for the menu, and the
   nearest church mode, which older versions read from a project instead.
   The Greek dromoi are given tempered, as they are played on the bouzouki;
   in Byzantine chant and in makam the intervals differ. Offline UMD. */
(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./theory-map.js'):root.TheoryMap);
  if(node)module.exports=api;else root.Scales=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(T){
'use strict';
const pc=T.mod;
const SCALES=[
  {id:'harmonic-minor',group:'minor',label:'Harmonic minor / Αρμονική ελάσσονα',name:'Αρμονική ελάσσονα',short:'Αρμονική ελ.',steps:[0,2,3,5,7,8,11],near:'aeolian',tonal:true},
  {id:'melodic-minor',group:'minor',label:'Melodic minor / Μελωδική ελάσσονα',name:'Μελωδική ελάσσονα',short:'Μελωδική ελ.',steps:[0,2,3,5,7,9,11],near:'dorian',tonal:true},
  {id:'lydian-dominant',group:'jazz',label:'Lydian dominant / Λύδιος δεσπόζουσας',name:'Λύδιος δεσπόζουσας (ακουστική)',short:'Λύδιος ♭7',steps:[0,2,4,6,7,9,10],near:'mixolydian'},
  {id:'altered',group:'jazz',label:'Altered / Αλλοιωμένη',name:'Αλλοιωμένη',short:'Αλλοιωμένη',steps:[0,1,3,4,6,8,10],near:'locrian'},
  {id:'blues',group:'jazz',label:'Blues',name:'Blues',short:'Blues',steps:[0,3,5,6,7,10],near:'dorian'},
  {id:'hijaz',group:'greek',label:'Hijaz / Χιτζάζ',name:'Χιτζάζ',short:'Χιτζάζ',steps:[0,1,4,5,7,8,10],near:'phrygian'},
  {id:'hijazkar',group:'greek',label:'Hijazkar / Χιτζασκιάρ',name:'Χιτζασκιάρ',short:'Χιτζασκιάρ',steps:[0,1,4,5,7,8,11],near:'phrygian'},
  {id:'nikriz',group:'greek',label:'Nikriz / Νικρίζ',name:'Νικρίζ',short:'Νικρίζ',steps:[0,2,3,6,7,9,10],near:'dorian'},
  {id:'saba',group:'greek',label:'Saba / Σαμπάχ',name:'Σαμπάχ',short:'Σαμπάχ',steps:[0,2,3,4,7,8,10],near:'aeolian'},
  {id:'whole-tone',group:'colour',label:'Whole-tone / Ολοτονική',name:'Ολοτονική',short:'Ολοτονική',steps:[0,2,4,6,8,10],near:'lydian'},
  {id:'pentatonic-major',group:'colour',label:'Major pentatonic / Πεντατονική μείζονα',name:'Πεντατονική μείζονα',short:'Πεντατονική',steps:[0,2,4,7,9],near:'ionian'},
  {id:'pentatonic-minor',group:'colour',label:'Minor pentatonic / Πεντατονική ελάσσονα',name:'Πεντατονική ελάσσονα',short:'Πεντατ. ελ.',steps:[0,3,5,7,10],near:'aeolian'}
];
const byId=id=>SCALES.find(s=>s.id===id)||null;

/* Roman numeral and place of a chord in a scale, in the shape of
   HarmonicContext.context, so the Analysis reads every scale the same way. */
const NUM=['I','II','III','IV','V','VI','VII'],CHROM=['I','♭II','II','♭III','III','IV','♯IV','V','♭VI','VI','♭VII','VII'];
const LOWER=new Set(['minor','m7','m9','mMaj7','m7b5','dim','dim7']);
const SUFFIX={major:'',minor:'',dim:'°',dim7:'°7',m7b5:'ø7',aug:'+',maj7:'maj7',m7:'7',m9:'9',mMaj7:'(maj7)',7:'7',add9:'add9',sus2:'sus2',sus4:'sus4',quartal:'(4ths)',maj7sharp11:'maj7(♯11)',octColor:'(oct.)'};
function context(ch,tonic,id){
  const sc=byId(id),steps=sc.steps,scalePcs=steps.map(s=>pc(tonic+s));
  const root=pc(ch.root),idx=scalePcs.indexOf(root),seven=steps.length===7;
  const alteration=idx>=0&&seven?steps[idx]-[0,2,4,5,7,9,11][idx]:0;
  let degree=idx>=0&&seven?(alteration<0?'♭'.repeat(-alteration):'♯'.repeat(alteration))+NUM[idx]:CHROM[pc(root-tonic)];
  if(LOWER.has(ch.quality))degree=degree.replace(/[IVX]+$/,t=>t.toLowerCase());
  const roman=degree+(Object.prototype.hasOwnProperty.call(SUFFIX,ch.quality)?SUFFIX[ch.quality]:' · χρώμα');
  const pcs=ch.pcs||ch.notes.map(pc),inScale=pcs.every(n=>scalePcs.includes(pc(n)));
  const keyName=T.name(tonic)+' '+sc.label;
  // In the minor scales of functional harmony a degree's triad gives its function.
  let functionName='';
  if(sc.tonal&&inScale&&idx>=0){
    const triad=[0,2,4].map(k=>scalePcs[(idx+k)%7]);
    if(triad.every(p=>pcs.map(pc).includes(p)))functionName=idx===0?'τονικό κέντρο (i)':idx===4?'δεσπόζουσα':idx===3?'υποδεσπόζουσα':idx===1?'προδεσπόζουσα':'';
  }
  return {roman,degree:idx,degreeLabel:idx>=0?`${idx+1}η βαθμίδα`:'χρωματική ρίζα',inScale,diatonic:idx>=0,keyName,functionName,
    qualification:inScale?'νότες εντός κλίμακας':'περιέχει χρωματικές νότες',
    text:`${roman} στη ${keyName}${functionName?' · '+functionName:''} · ${inScale?'εντός κλίμακας':'χρωματικό χρώμα'}`};
}
return {SCALES,byId,context};
});
