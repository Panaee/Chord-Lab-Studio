/* Chord Lab Harmonic Universe — deterministic theory and graph engine.
 * 12-tone equal temperament for MIDI; pure ratios are comparisons, not tuning.
 * Copyright 2026. Standalone offline prototype. */
(function (root, factory) {
  const value = factory();
  if (typeof module === 'object' && module.exports) module.exports = value;
  root.HarmonyCore = value;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const NAMES = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
  const INTERVALS = [
    ['P1','Unison','1:1',1], ['m2','Minor second','16:15',16/15],
    ['M2','Major second','9:8',9/8], ['m3','Minor third','6:5',6/5],
    ['M3','Major third','5:4',5/4], ['P4','Perfect fourth','4:3',4/3],
    ['TT','Tritone','√2:1',Math.sqrt(2)], ['P5','Perfect fifth','3:2',3/2],
    ['m6','Minor sixth','8:5',8/5], ['M6','Major sixth','5:3',5/3],
    ['m7','Minor seventh','9:5',9/5], ['M7','Major seventh','15:8',15/8],
  ];
  const QUALITIES = {
    maj: {label:'Major', steps:[0,4,7],short:''},
    min: {label:'Minor', steps:[0,3,7],short:'m'},
    maj7:{label:'Major seventh',steps:[0,4,7,11],short:'maj7'},
    min7:{label:'Minor seventh',steps:[0,3,7,10],short:'m7'},
    dom7:{label:'Dominant seventh',steps:[0,4,7,10],short:'7'},
    sus2:{label:'Suspended second',steps:[0,2,7],short:'sus2'},
    sus4:{label:'Suspended fourth',steps:[0,5,7],short:'sus4'},
    dim:{label:'Diminished',steps:[0,3,6],short:'dim'},
    aug:{label:'Augmented',steps:[0,4,8],short:'aug'},
    quartal:{label:'Quartal',steps:[0,5,10],short:'(4ths)'},
    add9:{label:'Add ninth',steps:[0,4,7,14],short:'add9'},
    min9:{label:'Minor ninth',steps:[0,3,7,10,14],short:'m9'},
  };
  const MODES = {
    ionian:{label:'Ionian',short:'I',steps:[0,2,4,5,7,9,11],character:'Bright · major tonic'},
    dorian:{label:'Dorian',short:'II',steps:[0,2,3,5,7,9,10],character:'Minor with natural sixth'},
    phrygian:{label:'Phrygian',short:'III',steps:[0,1,3,5,7,8,10],character:'Dark · lowered second'},
    lydian:{label:'Lydian',short:'IV',steps:[0,2,4,6,7,9,11],character:'Floating · raised fourth'},
    mixolydian:{label:'Mixolydian',short:'V',steps:[0,2,4,5,7,9,10],character:'Major with flat seventh'},
    aeolian:{label:'Aeolian',short:'VI',steps:[0,2,3,5,7,8,10],character:'Natural minor'},
    locrian:{label:'Locrian',short:'VII',steps:[0,1,3,5,6,8,10],character:'Unstable · diminished fifth'},
    wholetone:{label:'Whole tone',short:'WT',steps:[0,2,4,6,8,10],character:'Symmetry · no tonal gravity'},
    octatonic:{label:'Octatonic H–W',short:'OCT',steps:[0,1,3,4,6,7,9,10],character:'Alternating half & whole steps'},
    pentatonic:{label:'Major pentatonic',short:'PENT',steps:[0,2,4,7,9],character:'Open and sparse'},
    harmonicminor:{label:'Harmonic minor',short:'HM',steps:[0,2,3,5,7,8,11],character:'Minor with leading tone'}
  };
  const SYSTEMS = [
    {id:'diatonic',label:'Diatonic / functional',short:'Functional',desc:'Tonic–predominant–dominant, voice leading, diatonic chord functions',pcs:[0,2,4,5,7,9,11],color:0},
    {id:'modal',label:'Modal / drone',short:'Modal',desc:'Centricity, characteristic degrees, pedals; harmony without dominant dependence',pcs:[0,2,3,5,7,9,10],color:1},
    {id:'quartal',label:'Quartal / quintal',short:'Quartal',desc:'Stacks of fourths/fifths and ambiguous third function',pcs:[0,2,5,7,10],color:2},
    {id:'jazz',label:'Extended harmony',short:'Extensions',desc:'9ths, 11ths, 13ths, substitutions and guide-tone movement',pcs:[0,2,4,5,7,9,10,11],color:3},
    {id:'symmetric',label:'Symmetric sets',short:'Symmetric',desc:'Whole-tone, octatonic and augmented collections',pcs:[0,2,4,6,8,10],color:4},
    {id:'chromatic',label:'Chromatic / set-based',short:'Chromatic',desc:'Motivic cells and pitch-class sets rather than tonal functions',pcs:[0,1,2,4,6,7,9,10],color:5},
    {id:'spectral',label:'Spectral / overtones',short:'Spectral',desc:'Harmonic-series ratios, timbral fusion and inharmonic coloration',pcs:[0,4,7,10,2,6],color:6},
    {id:'minimal',label:'Minimal / process',short:'Minimal',desc:'Drones, additive process, repetition and gradual harmonic shift',pcs:[0,2,4,7,9],color:7},
  ];
  const STYLES = {
    free:{label:'Free exploration',description:'Similarity plus gentle novelty; no composer model.'},
    takemitsu:{label:'Takemitsu · study',description:'Heuristic: whole-tone/octatonic subsets, chromatic cells, common-tone motion. An educational interpretation, not a prediction.'},
    debussy:{label:'Debussy · study',description:'Heuristic: modal and whole-tone colors, planing and open sonorities.'},
    glass:{label:'Philip Glass · study',description:'Heuristic: diatonic repetition, small changes and common tones.'},
    jazz:{label:'Modern jazz · study',description:'Heuristic: 7ths/9ths, guide tones and root motion by fifths.'},
  };
  const LEVELS = ['note','interval','chord','mode','system','galaxy'];
  const wrap = n => ((n % 12) + 12) % 12;
  const name = n => NAMES[wrap(n)];
  const freq = midi => 440 * Math.pow(2, (midi - 69) / 12);
  const pcs = (steps, tonic=0) => [...new Set(steps.map(x=>wrap(x+tonic)))].sort((a,b)=>a-b);
  const intersection = (a,b) => a.filter(x=>b.includes(x)).length;
  const jaccard = (a,b) => intersection(a,b)/Math.max(1, new Set([...a,...b]).size);
  const circ = (a,b) => Math.min(wrap(a-b), wrap(b-a));
  function infoInterval(semitones) {
    const step = wrap(semitones), [symbol,label,ratioName,justRatio] = INTERVALS[step];
    const ratio = Math.pow(2,step/12), cents = 1200 * Math.log2(ratio/justRatio);
    return {step,symbol,label,ratioName,justRatio,ratio,cents};
  }
  const chord = (tonic,quality='maj') => {
    const def = QUALITIES[quality];
    if (!def) throw new Error('Unknown chord quality');
    return {id:`chord:${wrap(tonic)}:${quality}`,kind:'chord',tonic:wrap(tonic),quality,
      label:`${name(tonic)}${def.short}`,subtitle:def.label,pcs:pcs(def.steps,tonic),
      midi:[...def.steps].map(s=>48+wrap(tonic)+s),family:quality==='quartal'?'quartal':(quality==='aug'||quality==='dim')?'symmetric':'triadic'};
  };
  const mode = (tonic,id='dorian') => {
    const def=MODES[id]; if(!def) throw new Error('Unknown mode');
    return {id:`mode:${wrap(tonic)}:${id}`,kind:'mode',tonic:wrap(tonic),mode:id,
      label:`${name(tonic)} ${def.label}`,subtitle:def.character,pcs:pcs(def.steps,tonic),
      midi:def.steps.map(s=>60+wrap(tonic)+s),family:['wholetone','octatonic'].includes(id)?'symmetric':'modal'};
  };
  const note = (n, octave=4) => ({id:`note:${wrap(n)}`,kind:'note',tonic:wrap(n),label:name(n),subtitle:`${Math.round(freq((octave+1)*12+wrap(n))*10)/10} Hz`,pcs:[wrap(n)],midi:[(octave+1)*12+wrap(n)],family:'pitch'});
  const harmonic=(tonic,partial)=>{ const frequency=freq(60+wrap(tonic))*partial;const exactMidi=69+12*Math.log2(frequency/440);const rounded=Math.round(exactMidi);return {id:`harmonic:${wrap(tonic)}:${partial}`,kind:'harmonic',tonic:wrap(tonic),partial,label:`H${partial}`,subtitle:`${frequency.toFixed(2)} Hz · ${((exactMidi-rounded)*100).toFixed(1)}¢ from 12-TET`,pcs:[wrap(rounded)],midi:[rounded],freqHz:frequency,family:'overtone'};};
  const interval=(tonic,n)=>({id:`interval:${wrap(n)}`,kind:'interval',tonic:wrap(tonic),interval:wrap(n),label:INTERVALS[wrap(n)][0],subtitle:INTERVALS[wrap(n)][1],pcs:pcs([0,n],tonic),midi:[60+wrap(tonic),60+wrap(tonic)+wrap(n)],family:'interval'});
  const system=id=>{const def=SYSTEMS.find(s=>s.id===id);if(!def) throw new Error('Unknown system');return {...def,id:`system:${def.id}`,kind:'system',tonic:0,subtitle:def.desc,pcs:def.pcs,midi:def.pcs.slice(0,5).map(x=>60+x),family:def.id};};
  const parseId=id=>{const [kind,a,b]=id.split(':');if(kind==='chord')return chord(+a,b);if(kind==='mode')return mode(+a,b);if(kind==='note')return note(+a);if(kind==='harmonic')return harmonic(+a,+b);if(kind==='interval')return interval(0,+a);if(kind==='system')return system(a);return null;};
  const localSimilarity=(a,b)=>jaccard(a.pcs||[],b.pcs||[]);
  const toneLead=(a,b)=>{
    const aa=a.pcs||[],bb=b.pcs||[];
    if (!aa.length||!bb.length)return 0;
    const first=aa.reduce((n,x)=>n+Math.min(...bb.map(y=>circ(x,y))),0)/aa.length;
    const second=bb.reduce((n,y)=>n+Math.min(...aa.map(x=>circ(x,y))),0)/bb.length;
    return (first+second)/2;
  };
  const similarity=(a,b)=>Math.max(0,Math.min(1,(localSimilarity(a,b)*.65)+(1-toneLead(a,b)/6)*.35));
  function recommendations(nodes,active,style='free',count=7) {
    const present=nodes.filter(n=>n.id!==active.id);
    const activePcs=active.pcs||[], activeRoot=active.tonic??0;
    const oct=[0,1,3,4,6,7,9,10], wt=[0,2,4,6,8,10];
    return present.map(n=>{
      const common=intersection(activePcs,n.pcs||[]);
      const shared=common / Math.max(1, Math.min(activePcs.length,n.pcs.length));
      const lead=toneLead(active,n);
      const rootMove=circ(activeRoot,n.tonic||0);
      let score=.26*shared + .33*(1-lead/6)+.13*(1-rootMove/6)+.12*localSimilarity(active,n);
      let reasons=[];
      if(common) reasons.push(`${common} common tone${common===1?'':'s'}`);
      if(lead<1.3) reasons.push('smooth voice leading');
      if(style==='takemitsu') {
        const degreeSet=(n.pcs||[]).map(x=>wrap(x-activeRoot));
        const wtHit=Math.max(...[0,1].map(t=>degreeSet.filter(x=>wt.includes(wrap(x-t))).length)) / Math.max(1,degreeSet.length);
        const octHit=Math.max(...[0,1,2].map(t=>degreeSet.filter(x=>oct.includes(wrap(x-t))).length)) / Math.max(1,degreeSet.length);
        const chromatic=degreeSet.some(x=>activePcs.some(y=>circ(x,wrap(y-activeRoot))===1));
        score+=.13*wtHit+.17*octHit+(chromatic?.04:0);
        if(octHit>=.85) reasons.push('octatonic affinity');
        if(wtHit>=.85) reasons.push('whole-tone color');
      } else if(style==='debussy') {
        const modal=['sus2','sus4','quartal','maj7','add9'];
        if(modal.includes(n.quality)) {score+=.18;reasons.push('open/modal color');}
        if(n.mode==='lydian'||n.mode==='wholetone') {score+=.20;reasons.push('modal/whole-tone color');}
      } else if(style==='glass') {
        score+=.27*shared+.09*(1-rootMove/6);
        if(shared>.65)reasons.push('minimal change');
      } else if(style==='jazz') {
        if(['dom7','maj7','min7','min9','add9'].includes(n.quality)){score+=.2;reasons.push('extended harmony');}
        if(rootMove===5){score+=.18;reasons.push('fifth-related root');}
      } else {score+=.08 * (1-shared);}
      return {...n,score,common,lead,reasons:reasons.slice(0,3)};
    }).sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label)).slice(0,count);
  }
  function candidates(level,tonic=0) {
    if(level==='note')return [...Array.from({length:12},(_,i)=>note(i)),...Array.from({length:16},(_,i)=>harmonic(tonic,i+1))];
    if(level==='interval')return Array.from({length:12},(_,i)=>interval(tonic,i));
    if(level==='chord')return Array.from({length:12},(_,r)=>['maj','min','maj7','min7','dom7','sus2','quartal','dim'].map(q=>chord(r,q))).flat();
    if(level==='mode')return Array.from({length:12},(_,r)=>Object.keys(MODES).map(k=>mode(r,k))).flat();
    if(level==='system')return SYSTEMS.map(s=>system(s.id));
    if(level==='galaxy')return SYSTEMS.map(s=>({ ...system(s.id),id:`galaxy:${s.id}`,kind:'galaxy'}));
    throw new Error('Unknown level');
  }
  function relatedChordsInMode(tonic,modeId){
    const scale=MODES[modeId].steps;
    return scale.slice(0,7).map((step,i)=>{
      const deg=[step,scale[(i+2)%scale.length]+((i+2>=scale.length)?12:0),scale[(i+4)%scale.length]+((i+4>=scale.length)?12:0)];
      const chrom=deg.map(x=>wrap(x-step));
      let q=Object.keys(QUALITIES).find(k=>QUALITIES[k].steps.length===3&&QUALITIES[k].steps.every((x,j)=>wrap(x)===chrom[j]));
      if(!q) q='maj';
      return {...chord(tonic+step,q),degree:i+1,steps:chrom};
    });
  }
  function makeMidi(sequence,tempo=90){
    const bpm=Math.max(30,Math.min(240,Number(tempo)||90));
    const ppq=480, beatTicks=ppq*4;
    const vlen=v=>{let n=v>>>0,a=[n&127];while((n>>=7)>0)a.unshift((n&127)|128);return a;};
    const bytes=[];const push=(...a)=>bytes.push(...a);
    const head=[77,84,104,100,0,0,0,6,0,0,0,1,1,224];
    const micro=Math.round(60000000/bpm);
    const ev=[{t:0,b:[255,81,3,(micro>>16)&255,(micro>>8)&255,micro&255]},
      {t:0,b:[255,88,4,4,2,24,8]}]; // 4/4, matching one four-beat step.
    sequence.forEach((s,i)=>{
      const notes=[...new Set((s.midi||[]).map(m=>Math.max(0,Math.min(127,Math.round(m)))))];
      notes.forEach(n=>{
        const start=i*beatTicks;
        ev.push({t:start,b:[0x90,n,82]},{t:start+beatTicks-60,b:[0x80,n,0]});
      });
    });
    ev.sort((a,b)=>a.t-b.t||a.b[0]-b.b[0]); let prev=0;
    for(const e of ev){push(...vlen(e.t-prev),...e.b);prev=e.t;}
    push(...vlen(Math.max(prev,sequence.length*beatTicks)-prev),255,47,0);
    const track=[77,84,114,107,(bytes.length>>>24)&255,(bytes.length>>>16)&255,(bytes.length>>>8)&255,bytes.length&255,...bytes];
    return new Uint8Array([...head,...track]);
  }
  return {NAMES,INTERVALS,QUALITIES,MODES,SYSTEMS,STYLES,LEVELS,name,wrap,freq,pcs,infoInterval,chord,mode,note,harmonic,interval,system,parseId,candidates,recommendations,similarity,toneLead,relatedChordsInMode,makeMidi};
});
