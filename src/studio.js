/* Chord Lab Studio 1.6 · composition UI.
   One current chord: the selected step. The wheel and MIDI only audition
   (a dashed preview); proposals are always computed after the selected step
   and are inserted right after it. Engines stay offline and dependency-free. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const T=window.TheoryMap,F=window.FifthsLab,N=window.NextChords,L=window.Landscapes,M=window.MessiaenModes,
  G=window.GuitarShapes,PS=window.ProjectStore,A=window.StudioAnalysis,R=window.RemarkableReport;
const pc=T.mod;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const desktop=window.chordDesktop||null;
const KEY_PROJECT='cl-v16-project',KEY_LIBRARY='cl-v16-library';
const MAX_STEPS=512,MAX_NOTES=32,BEATS=[1,2,3,4,6,8];
const MODES=[['ionian','Μείζονα'],['dorian','Δώριος'],['phrygian','Φρύγιος'],['lydian','Λύδιος'],['mixolydian','Μιξολύδιος'],['aeolian','Ελάσσονα'],['locrian','Λόκριος'],
  ...[2,3,4,5,6,7].map(n=>['messiaen-'+n,`Messiaen ${n} · ${M.PATTERNS[n].name}`])];
const EXTS=[['triad','Τριάδα'],['7','7η'],['add9','add9'],['sus2','sus2'],['sus4','sus4']];
const noteName=n=>T.name(n)+(Math.floor(n/12)-1);
const uniq=xs=>[...new Set(xs)].sort((a,b)=>a-b);

const state={tonic:0,mode:'ionian',style:'takemitsu',intent:'motion',bpm:84,loop:false,
  steps:[],sel:-1,range:null,preview:null,ext:'triad',suggestions:[],heard:-1,view:'compose',
  projectName:'Χωρίς τίτλο',instrument:'piano',theme:'ivory',editor:-1,
  midi:{access:null,outId:'',held:new Set(),timer:0},play:null};

/* ------------------------------------------------------------ helpers */
function status(text){$('status').textContent=text||'';}
function keyOpts(){return {tonic:state.tonic,mode:state.mode,transposition:0};}
function key(){return N.keyOf(keyOpts());}
function land(){return L.LANDSCAPES.find(l=>l.id===state.style)||null;}
function startChord(){
  const ring=['dorian','phrygian','aeolian'].includes(state.mode)?'minor':state.mode==='locrian'?'dim':'major';
  const ch=N.chordFor(state.tonic,ring,keyOpts());
  const b=48+pc(state.tonic);ch.notes=N.voiceLead([b,b+4,b+7,b+12],ch.pcs,state.tonic);return ch;
}
function current(){return state.steps[state.sel]||startChord();}
function romanOf(ch){return N.roman({root:ch.root,notes:ch.notes,pcs:uniq(ch.notes.map(pc))},key());}
function clampSel(){if(!state.steps.length){state.sel=-1;return;}state.sel=Math.max(0,Math.min(state.sel,state.steps.length-1));}
function slug(text){
  const map={α:'a',β:'v',γ:'g',δ:'d',ε:'e',ζ:'z',η:'i',θ:'th',ι:'i',κ:'k',λ:'l',μ:'m',ν:'n',ξ:'x',ο:'o',π:'p',ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',φ:'f',χ:'ch',ψ:'ps',ω:'o',ά:'a',έ:'e',ή:'i',ί:'i',ό:'o',ύ:'y',ώ:'o',ϊ:'i',ΐ:'i',ϋ:'y',ΰ:'y'};
  const s=String(text||'').toLowerCase().replace(/[α-ωάέήίόύώϊΐϋΰς]/g,c=>map[c]||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  return s||'chord-lab';
}
const today=()=>new Date().toISOString().slice(0,10);
function download(bytes,name,type){const blob=new Blob([bytes],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}

/* ------------------------------------------------------------ undo */
const undoStack={past:[],future:[]};
function snapshot(){return JSON.stringify({steps:state.steps,sel:state.sel,tonic:state.tonic,mode:state.mode,style:state.style,intent:state.intent,bpm:state.bpm});}
function remember(){undoStack.past.push(snapshot());if(undoStack.past.length>200)undoStack.past.shift();undoStack.future.length=0;}
function restore(s){const o=JSON.parse(s);Object.assign(state,{steps:o.steps,sel:o.sel,tonic:o.tonic,mode:o.mode,style:o.style,intent:o.intent,bpm:o.bpm});state.preview=null;state.range=null;state.heard=-1;clampSel();refresh();save();}
function undo(){if(!undoStack.past.length)return;stop();undoStack.future.push(snapshot());restore(undoStack.past.pop());status('Αναίρεση.');}
function redo(){if(!undoStack.future.length)return;stop();undoStack.past.push(snapshot());restore(undoStack.future.pop());status('Επαναφορά.');}

/* ------------------------------------------------------------ sound */
const Sound={ctx:null,bus:null,voices:new Set(),
  init(){
    if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
      const ctx=new C();this.ctx=ctx;
      const comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=3;comp.connect(ctx.destination);
      const master=ctx.createGain();master.gain.value=.9;master.connect(comp);
      const dry=ctx.createGain();dry.gain.value=.86;dry.connect(master);
      const verb=ctx.createConvolver();verb.buffer=this.impulse(ctx,2.6);const wet=ctx.createGain();wet.gain.value=.24;verb.connect(wet);wet.connect(master);
      this.bus=ctx.createGain();this.bus.connect(dry);this.bus.connect(verb);}
    if(this.ctx.state==='suspended')this.ctx.resume();
    return this.ctx;
  },
  impulse(ctx,sec){const len=Math.floor(ctx.sampleRate*sec),buf=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.4);}return buf;},
  note(n,at,dur,vel){
    const ctx=this.ctx,f=440*Math.pow(2,(n-69)/12),end=at+Math.max(.08,dur);
    const g=ctx.createGain(),lp=ctx.createBiquadFilter();lp.type='lowpass';lp.Q.value=.4;
    lp.frequency.setValueAtTime(Math.min(9000,f*7+900),at);lp.frequency.setTargetAtTime(Math.max(500,f*2.4),at+.02,.5);
    const oscs=[['triangle',1,0,1],['sine',2,4,.16],['sine',1,-7,.38]].map(([type,mul,det,amt])=>{
      const o=ctx.createOscillator(),og=ctx.createGain();o.type=type;o.frequency.value=f*mul;o.detune.value=det;og.gain.value=amt;o.connect(og);og.connect(lp);return o;});
    lp.connect(g);g.connect(this.bus);
    g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(vel,at+.012);g.gain.setTargetAtTime(vel*.5,at+.02,.35);g.gain.setTargetAtTime(.0001,end,.12);
    const voice={g,oscs};this.voices.add(voice);
    oscs.forEach(o=>{o.start(at);o.stop(end+.8);});oscs[0].onended=()=>this.voices.delete(voice);
  },
  chord(notes,at=0,dur=1.2,strum=.008){
    const ctx=this.init();if(!ctx||!notes?.length)return;
    const t=ctx.currentTime+.03+at,list=uniq(notes),vel=Math.min(.2,.42/Math.sqrt(list.length)/1.3);
    list.forEach((n,i)=>this.note(n,t+i*strum,dur,vel*(n<45?.85:1)));
    midiOut(list,at,dur);
  },
  stopAll(){const ctx=this.ctx;if(!ctx)return;const now=ctx.currentTime;
    for(const v of this.voices){try{v.g.gain.cancelScheduledValues(now);v.g.gain.setTargetAtTime(.0001,now,.03);v.oscs.forEach(o=>o.stop(now+.2));}catch(_){}}
    this.voices.clear();midiPanic();}
};
function audition(notes,dur=1.3){stop(false);Sound.stopAll();Sound.chord(notes,0,dur);}
function transition(from,to){stop(false);Sound.stopAll();Sound.chord(from,0,.85);Sound.chord(to,.95,1.5);}

/* ------------------------------------------------------------ MIDI */
function midiOutput(){return state.midi.access?.outputs?.get?.(state.midi.outId)||null;}
function midiOut(notes,delay,dur){const out=midiOutput();if(!out)return;const now=performance.now();
  for(const n of notes)try{out.send([0x90,n,80],now+delay*1000);out.send([0x80,n,0],now+(delay+dur)*1000);}catch(_){}}
function midiPanic(){const out=midiOutput();if(!out)return;try{out.clear?.();for(let c=0;c<16;c++){out.send([0xB0|c,123,0]);out.send([0xB0|c,120,0]);}}catch(_){}}
async function connectMidi(silent=false){
  if(!navigator.requestMIDIAccess){if(!silent)status('Το MIDI χρειάζεται την εφαρμογή ή Chrome/Edge.');return;}
  try{state.midi.access=await navigator.requestMIDIAccess({sysex:false});}catch(e){if(!silent)status('Δεν δόθηκε πρόσβαση στο MIDI.');return;}
  const bind=()=>{
    const inputs=[...state.midi.access.inputs.values()].filter(i=>i.state!=='disconnected');
    inputs.forEach(input=>{input.onmidimessage=onMidi;});
    $('midiConnect').textContent=inputs.length?'MIDI: '+inputs.map(i=>i.name).join(', '):'Κανένα όργανο MIDI';
    const outs=[...state.midi.access.outputs.values()].filter(o=>o.state!=='disconnected');
    if(!outs.some(o=>o.id===state.midi.outId))state.midi.outId='';
    $('midiOut').innerHTML='<option value="">Εσωτερικός ήχος</option>'+outs.map(o=>`<option value="${esc(o.id)}">${esc(o.name||o.id)}</option>`).join('');
    $('midiOut').value=state.midi.outId;
  };
  state.midi.access.onstatechange=bind;bind();
  if(!silent)status('MIDI συνδέθηκε. Παίξε μια συγχορδία και πάτα ⏎ για να μπει στη σύνθεση.');
}
function onMidi(e){
  const [op,n,v=0]=e.data||[];const type=op&0xF0;
  if((op&0x0F)===9)return;
  if(type===0x90&&v>0)state.midi.held.add(n);else if(type===0x80||(type===0x90&&v===0))state.midi.held.delete(n);else return;
  clearTimeout(state.midi.timer);
  state.midi.timer=setTimeout(()=>{
    const notes=[...state.midi.held].sort((a,b)=>a-b);
    if(notes.length<2||notes.length>MAX_NOTES)return;
    const ch=N.recognise(notes,keyOpts());
    state.preview={...ch,source:'midi'};renderPreview();renderWheel();
  },70);
}

/* ------------------------------------------------------------ edits */
function makeStep(ch,extra={}){
  return {root:pc(ch.root),quality:ch.quality||'custom',label:ch.label||N.symbol(ch.notes,ch.root),notes:uniq(ch.notes).slice(0,MAX_NOTES),
    beats:extra.beats||state.steps[state.sel]?.beats||4,sourceLabel:extra.sourceLabel||ch.originLabel||undefined,custom:Boolean(extra.custom)};
}
function insert(ch,extra){
  if(state.steps.length>=MAX_STEPS){status('Έως 512 βήματα ανά έργο.');return;}
  stop();remember();
  const at=state.steps.length?state.sel+1:0;
  state.steps.splice(at,0,makeStep(ch,extra));
  state.sel=at;state.preview=null;state.heard=-1;state.range=null;
  refresh();save();scrollToSel();
  status(`Μπήκε ${state.steps[at].label} στο βήμα ${at+1}.`);
}
function select(i,{play=true,extend=false}={}){
  if(!state.steps.length)return;
  i=Math.max(0,Math.min(i,state.steps.length-1));
  if(extend&&state.sel>=0){state.range=[Math.min(state.sel,i),Math.max(state.sel,i)];}
  else{state.range=null;state.sel=i;}
  state.heard=-1;state.preview=null;
  refresh();scrollToSel();
  if(play&&!state.play)audition(state.steps[i].notes,.9);
}
function removeStep(i=state.sel){
  if(i<0||!state.steps[i])return;stop();remember();
  const [gone]=state.steps.splice(i,1);state.sel=Math.min(i,state.steps.length-1);state.range=null;
  if(state.editor>=0)closeEditor();refresh();save();status(`Αφαιρέθηκε ${gone.label}. ⌘Z για επαναφορά.`);
}
function duplicate(){
  if(state.sel<0)return;remember();const copy=JSON.parse(JSON.stringify(state.steps[state.sel]));
  state.steps.splice(state.sel+1,0,copy);state.sel++;refresh();save();scrollToSel();
}
function move(from,to){
  if(from===to||from<0||to<0||from>=state.steps.length||to>state.steps.length)return;
  remember();const [s]=state.steps.splice(from,1);const at=to>from?to-1:to;state.steps.splice(at,0,s);state.sel=at;state.range=null;refresh();save();
}
function setBeats(beats,i=state.sel){if(i<0||!state.steps[i]||state.steps[i].beats===beats)return;remember();state.steps[i].beats=beats;refresh();save();}
function stepBeats(dir){if(state.sel<0)return;const b=state.steps[state.sel].beats||4;let ix=BEATS.indexOf(b);if(ix<0)ix=3;setBeats(BEATS[Math.max(0,Math.min(BEATS.length-1,ix+dir))]);status(`Διάρκεια: ${state.steps[state.sel].beats} χτύποι.`);}
function setNotes(i,notes,{record=true}={}){
  notes=uniq(notes.filter(n=>n>=21&&n<=108)).slice(0,MAX_NOTES);if(!notes.length)return;
  if(record)remember();
  const ch=N.recognise(notes,keyOpts());const s=state.steps[i];
  Object.assign(s,{root:ch.root,quality:ch.quality,label:ch.label,notes,custom:true});
  refresh();save();
}
function setCenter(root,minor){
  remember();state.tonic=pc(root);
  if(minor!==undefined&&!/^messiaen/.test(state.mode))state.mode=minor?'aeolian':'ionian';
  state.preview=null;syncControls();refresh();save();
  status(`Νέο κέντρο: ${T.name(state.tonic)} ${MODES.find(m=>m[0]===state.mode)[1]}. Οι βαθμίδες ξαναϋπολογίστηκαν.`);
}
function setContext(field,value){remember();state[field]=value;state.preview=null;state.heard=-1;refresh();save();}

/* ------------------------------------------------------------ playback */
function playRange(){
  if(!state.steps.length){status('Πρόσθεσε πρώτα μια συγχορδία.');return;}
  const ctx=Sound.init();if(!ctx)return;Sound.stopAll();
  let a,b;
  if(state.range)[a,b]=state.range;
  else{a=state.loop||state.sel>=state.steps.length-1?0:Math.max(0,state.sel);b=state.steps.length-1;}
  const spb=60/state.bpm,t0=ctx.currentTime+.06,timers=[];let t=t0;
  for(let i=a;i<=b;i++){
    const s=state.steps[i],dur=(s.beats||4)*spb;
    const at=t-ctx.currentTime;Sound.chord(s.notes,at-.03,dur*.97,0);
    timers.push(setTimeout(()=>{if(state.play){state.play.index=i;renderStripPlaying();}},Math.max(0,at*1000)));
    t+=dur;
  }
  const total=(t-ctx.currentTime)*1000;
  timers.push(setTimeout(()=>{if(!state.play)return;if(state.loop)playRange();else stop();},total));
  state.play={timers,index:a,range:[a,b]};
  renderTransport();
  status(state.loop?`Επανάληψη βημάτων ${a+1}–${b+1}. Space για στοπ.`:`Αναπαραγωγή βημάτων ${a+1}–${b+1}.`);
}
function stop(silence=true){
  if(state.play){state.play.timers.forEach(clearTimeout);state.play=null;if(silence)Sound.stopAll();renderTransport();renderStripPlaying();}
}
function togglePlay(){if(state.play)stop();else playRange();}

/* ------------------------------------------------------------ wheel */
const RINGS={major:[150,212],minor:[100,150],dim:[64,100]};
function polar(r,a){const t=(a-90)*Math.PI/180;return [r*Math.cos(t),r*Math.sin(t)];}
function sector(r0,r1,a0,a1){
  const f=n=>n.toFixed(2);const [x0,y0]=polar(r1,a0),[x1,y1]=polar(r1,a1),[x2,y2]=polar(r0,a1),[x3,y3]=polar(r0,a0);
  return `M${f(x0)} ${f(y0)}A${r1} ${r1} 0 0 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${r0} ${r0} 0 0 0 ${f(x3)} ${f(y3)}Z`;
}
function slotName(ring,i){if(ring==='major')return F.MAJOR[i];const m=F.MINOR[i];return ring==='minor'?m:m.replace(/m$/,'')+'°';}
function slotRoot(ring,i){return ring==='major'?F.ROOTS[i]:F.MINOR_ROOTS[i];}
function renderWheel(){
  const k=key(),dia=new Map();
  for(const ch of N.keyChords(k)){const s=N.wheelSlot(ch);dia.set(s.ring+':'+s.index,N.roman(ch,k));}
  const cur=current(),curSlot=N.wheelSlot({root:cur.root,notes:cur.notes});
  const pre=state.preview?N.wheelSlot(state.preview):null;
  let segs='';
  for(const ring of ['major','minor','dim'])for(let i=0;i<12;i++){
    const [r0,r1]=RINGS[ring],a=i*30,id=ring+':'+i,rom=dia.get(id);
    const cls=['seg','ring-'+ring,rom?'dia':'',pre&&pre.ring===ring&&pre.index===i?'pre':''].join(' ');
    const [nx,ny]=polar(ring==='major'?187:ring==='minor'?130:82,a),[rx,ry]=polar(ring==='major'?162:ring==='minor'?111:70,a);
    const name=slotName(ring,i);
    segs+=`<g class="${cls}" data-ring="${ring}" data-i="${i}" role="button" tabindex="${ring==='major'&&i===0?0:-1}" aria-label="${esc(name)}${rom?' · '+esc(rom):''}">`+
      `<path d="${sector(r0,r1,a-15,a+15)}"/><text class="n" x="${nx.toFixed(1)}" y="${(ring==='dim'?ny-3:ny).toFixed(1)}">${esc(name)}</text>`+
      (rom&&ring!=='dim'?`<text class="r" x="${rx.toFixed(1)}" y="${ry.toFixed(1)}">${esc(rom)}</text>`:'')+
      (rom&&ring==='dim'?`<text class="r" x="${nx.toFixed(1)}" y="${(ny+9).toFixed(1)}">${esc(rom)}</text>`:'')+`</g>`;
  }
  const outline=(s,cls)=>{const [r0,r1]=RINGS[s.ring];return `<path class="${cls}" d="${sector(r0+1.5,r1-1.5,s.index*30-13.5,s.index*30+13.5)}"/>`;};
  let marks='';
  const stack=new Map();
  state.suggestions.forEach((c,ix)=>{const s=N.wheelSlot(c);const [,r1]=RINGS[s.ring];const k=s.ring+':'+s.index,n=stack.get(k)||0;stack.set(k,n+1);
    const [x,y]=polar(r1-11,s.index*30+[10,-10,0][n%3]);
    marks+=`<g class="marker${c.contrast?' contrast':''}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9.5"/><text x="${x.toFixed(1)}" y="${(y+.5).toFixed(1)}">${ix+1}</text></g>`;});
  const mshort=/^messiaen/.test(state.mode)?'Messiaen '+state.mode.split('-')[1]:MODES.find(m=>m[0]===state.mode)[1];
  $('wheel').innerHTML=`<svg viewBox="-222 -222 444 444" role="group" aria-label="Κύκλος πέμπτων · ${esc(T.name(state.tonic)+' '+mshort)}">${segs}${outline(curSlot,'cur-outline')}${pre?outline(pre,'pre-outline'):''}${marks}`+
    `<g class="center" role="button" tabindex="-1" aria-label="Άκου το κέντρο"><circle r="58"/><text class="k" y="-6">${esc(T.name(state.tonic))}</text><text class="m" y="19">${esc(mshort)}</text></g></svg>`;
}
function onWheel(e){
  const g=e.target.closest('.seg');
  if(g){const ring=g.dataset.ring,i=Number(g.dataset.i);previewFromWheel(slotRoot(ring,i),ring);return;}
  if(e.target.closest('.center'))audition(startChord().notes);
}
function previewFromWheel(root,ring){
  const ch=N.chordFor(root,ring,{...keyOpts(),extension:state.ext,from:current().notes});
  state.preview={...ch,source:'wheel',ring};state.heard=-1;
  renderPreview();renderWheel();renderCards();
  audition(ch.notes);
}
function setExt(ext){state.ext=ext;if(state.preview?.source==='wheel')previewFromWheel(state.preview.root,state.preview.ring);}

/* ------------------------------------------------------------ panels */
function miniKeys(notes){
  const lo=Math.min(48,Math.floor(Math.min(...notes)/12)*12),hi=Math.max(lo+24,Math.ceil((Math.max(...notes)+1)/12)*12);
  const whites=[];for(let n=lo;n<=hi;n++)if(![1,3,6,8,10].includes(pc(n)))whites.push(n);
  const w=200/whites.length;let s='';
  whites.forEach((n,i)=>{s+=`<rect class="w${notes.includes(n)?' on':''}" x="${(i*w).toFixed(2)}" y="0" width="${(w-.6).toFixed(2)}" height="44" rx="2"/>`;});
  whites.forEach((n,i)=>{if([0,2,5,7,9].includes(pc(n))&&n+1<=hi){const b=n+1;s+=`<rect class="b${notes.includes(b)?' on':''}" x="${(i*w+w*.65).toFixed(2)}" y="0" width="${(w*.7).toFixed(2)}" height="27" rx="1.5"/>`;}});
  return `<svg class="mini" viewBox="0 0 200 45" aria-hidden="true">${s}</svg>`;
}
function fretboard(notes,root){
  const g=G.suggest(notes,root);if(!g)return miniKeys(notes);
  const base=Math.max(1,Math.min(...g.frets.filter(f=>f>0),99)===99?1:Math.min(...g.frets.filter(f=>f>0)));
  const first=base<=2?1:base;let s='';
  for(let i=0;i<6;i++)s+=`<line x1="${12+i*14}" y1="16" x2="${12+i*14}" y2="70"/>`;
  for(let f=0;f<=4;f++)s+=`<line class="${f===0&&first===1?'nut':''}" x1="12" y1="${16+f*13.5}" x2="82" y2="${16+f*13.5}"/>`;
  g.frets.forEach((f,i)=>{const x=12+i*14;if(f<0)s+=`<text x="${x}" y="11">×</text>`;else if(f===0)s+=`<text x="${x}" y="11">○</text>`;else s+=`<circle cx="${x}" cy="${16+(f-first+.5)*13.5}" r="4.6"/>`;});
  if(first>1)s+=`<text x="92" y="${16+.5*13.5+3}">${first}</text>`;
  return `<svg class="fret" viewBox="0 0 96 74" aria-label="Κιθάρα">${s}</svg>`;
}
function instrumentView(ch){return state.instrument==='guitar'?fretboard(ch.notes,ch.root):miniKeys(ch.notes);}
function renderNow(){
  const c=current(),has=state.steps.length>0;
  $('now').innerHTML=`<div class="eyebrow">${has?`Τώρα · <b>βήμα ${state.sel+1}</b> από ${state.steps.length}`:'Αφετηρία · το κέντρο σου'}</div>`+
    `<div class="title"><span class="sym${c.label.length>9?' long':''}" title="${esc(c.label)}">${esc(c.label)}</span><span class="roman">${esc(romanOf(c))}</span></div>`+
    `<div class="actions">${instrumentView(c)}<div class="row">`+
    `<button type="button" class="btn-ghost" data-act="hear-now">▶ Άκου</button>`+
    (has?`<button type="button" class="btn-ghost" data-act="edit">✎ Νότες</button>`:`<button type="button" class="btn-primary" data-act="start">＋ Ξεκίνα εδώ<span class="kbd">⏎</span></button>`)+
    `</div></div><div class="notes">${esc(c.notes.map(noteName).join(' · '))}</div>`;
}
function renderPreview(){
  const p=state.preview,box=$('preview');
  if(!p){box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;
  const after=state.steps.length?`Πρόσθεσε μετά το ${esc(current().label)}`:'Ξεκίνα με αυτή';
  box.innerHTML=`<div class="eyebrow">Δοκιμή · ${p.source==='midi'?'από το MIDI':'από τον κύκλο'}</div>`+
    `<div class="title"><span class="sym">${esc(p.label)}</span><span class="roman">${esc(p.roman||romanOf(p))}</span></div>`+
    (p.source==='wheel'?`<div class="exts" role="radiogroup" aria-label="Μορφή">${EXTS.map(([id,l])=>`<button type="button" class="chip${state.ext===id?' on':''}" data-ext="${id}" role="radio" aria-checked="${state.ext===id}">${l}</button>`).join('')}</div>`:`<div class="exts"><span class="fine">${esc(p.notes.map(noteName).join(' · '))}</span></div>`)+
    `<div class="actions"><button type="button" class="btn-primary" data-act="add-preview">＋ ${after}<span class="kbd">⏎</span></button>`+
    `<button type="button" class="btn-ghost" data-act="center">◎ Κάνε το κέντρο</button><button type="button" class="btn-ghost" data-act="dismiss">Άκυρο <span class="kbd">esc</span></button></div>`;
}
function renderIntents(){
  $('intents').innerHTML=N.INTENTS.map(x=>`<button type="button" class="chip${state.intent===x.id?' on':''}" data-intent="${x.id}" role="radio" aria-checked="${state.intent===x.id}" title="${esc(x.hint)}">${esc(x.label)}</button>`).join('');
}
const ICON_PLAY='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/></svg>',ICON_ADD='<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
function renderCards(){
  const c=current();
  state.suggestions=N.suggest({current:c,history:state.steps.slice(0,state.sel+1),...keyOpts(),style:state.style,intent:state.intent});
  $('cards').innerHTML=state.suggestions.map((s,i)=>`<li class="card${s.contrast?' contrast':''}${state.heard===i?' heard':''}" data-i="${i}">`+
    `<span class="badge">${i+1}</span>`+
    `<div class="head"><span class="sym">${esc(s.label)}</span><span class="roman">${esc(s.roman)}</span></div>`+
    `<div class="why" title="${esc(s.why||s.reason)}">${esc(s.reason&&(s.origin!=='style'||s.fit)?s.reason:(s.why||s.reason||''))}</div>`+
    `<div class="meta"><span class="origin" title="${esc(s.originLabel)}">${esc(s.originLabel)}</span><span class="motion">${esc(s.motion.text)}</span></div>`+
    `<div class="acts"><button type="button" data-act="hear" aria-label="Άκου τη μετάβαση" title="Άκου τη μετάβαση (${i+1})">${ICON_PLAY}</button><button type="button" class="add" data-act="add" aria-label="Πρόσθεσε" title="Πρόσθεσε μετά το ${esc(c.label)}">${ICON_ADD}</button></div></li>`).join('');
  const l=land();$('styleNote').hidden=!l?.chordWarning;$('styleNote').textContent=l?.chordWarning||'';
}
function renderStrip(){
  const strip=$('strip');
  if(!state.steps.length){strip.innerHTML=`<span class="empty">Η σύνθεση ξεκινά εδώ. Κλικ στον κύκλο ή σε μια πρόταση, και ⏎.</span>`;return;}
  strip.innerHTML=state.steps.map((s,i)=>{
    const inr=state.range&&i>=state.range[0]&&i<=state.range[1];
    return `<button type="button" class="step${i===state.sel?' sel':''}${inr?' inrange':''}" role="option" aria-selected="${i===state.sel}" draggable="true" data-i="${i}" style="--beats:${s.beats||4}" title="${esc(s.label)} · ${s.beats||4} χτύποι · διπλό κλικ για νότες">`+
      `<span class="s">${esc(s.label)}</span><span class="r">${esc(romanOf(s))}</span><span class="len">${s.beats||4}</span></button>`;}).join('');
  renderStripPlaying();
}
function renderStripPlaying(){document.querySelectorAll('.step').forEach(el=>el.classList.toggle('playing',Boolean(state.play)&&Number(el.dataset.i)===state.play.index));}
function scrollToSel(){const el=document.querySelector(`.step[data-i="${state.sel}"]`);el?.scrollIntoView?.({block:'nearest',inline:'nearest'});}
function renderTransport(){$('play').classList.toggle('on',Boolean(state.play));$('play').setAttribute('aria-label',state.play?'Στοπ':'Αναπαραγωγή');
  $('loop').setAttribute('aria-pressed',String(state.loop));$('bpm').value=String(state.bpm);
  $('undo').disabled=!undoStack.past.length;$('redo').disabled=!undoStack.future.length;}
function syncControls(){
  $('tonic').value=String(state.tonic);$('mode').value=state.mode;$('style').value=state.style;
  $('projectName').value=state.projectName;$('instrument').value=state.instrument;$('theme').value=state.theme;
  const l=land();document.documentElement.style.setProperty('--style',l?.color||'#c9c2ae');
}
function renderAnalysis(){
  if(state.view!=='analysis')return;
  $('analysisBody').innerHTML=A.html(projectData());
  for(const id of ['exportPdf','exportMidi'])$(id).disabled=!state.steps.length;
}
function refresh(){
  clampSel();syncControls();renderWheelAndCards();renderNow();renderPreview();renderStrip();renderTransport();renderAnalysis();
  if(state.editor>=0)renderEditor();
}
function renderWheelAndCards(){renderIntents();renderCards();renderWheel();}

/* ------------------------------------------------------------ editor */
function openEditor(i=state.sel){if(i<0||!state.steps[i])return;state.editor=i;$('editor').hidden=false;renderEditor();}
function closeEditor(){state.editor=-1;$('editor').hidden=true;$('editor').innerHTML='';}
function voicing(kind,notes){
  const ns=uniq(notes);if(ns.length<3)return ns;const bass=ns[0];
  const close=[bass,...uniq(ns.slice(1).map(n=>{let x=n;while(x-bass>12)x-=12;while(x<=bass)x+=12;return x;}))];
  if(kind==='close')return uniq(close);
  if(kind==='open'){const up=close.slice(1);return uniq([bass,...up.map((n,i)=>i%2?n+12:n)]);}
  // Drop 2 works on the upper voices; the bass stays the bass.
  if(kind==='drop2'){const c=uniq(close);if(c.length<4)return c;const second=c[c.length-2];return second-12>bass?uniq(c.map(n=>n===second?n-12:n)):c;}
  return ns;
}
function renderEditor(){
  const i=state.editor,s=state.steps[i];if(!s){closeEditor();return;}
  const lo=36,hi=84,whites=[];for(let n=lo;n<=hi;n++)if(![1,3,6,8,10].includes(pc(n)))whites.push(n);
  const w=900/whites.length;let keys='';
  whites.forEach((n,k)=>{const on=s.notes.includes(n);keys+=`<rect class="w${on?' on':''}" data-n="${n}" x="${(k*w).toFixed(2)}" y="0" width="${(w-.8).toFixed(2)}" height="92" rx="3"/>`+(pc(n)===0||on?`<text class="${on?'on':''}" x="${(k*w+w/2).toFixed(2)}" y="84">${esc(noteName(n))}</text>`:'');});
  whites.forEach((n,k)=>{if([0,2,5,7,9].includes(pc(n))&&n+1<=hi){const b=n+1,on=s.notes.includes(b);keys+=`<rect class="b${on?' on':''}" data-n="${b}" x="${(k*w+w*.64).toFixed(2)}" y="0" width="${(w*.72).toFixed(2)}" height="56" rx="2"/>`;}});
  $('editor').innerHTML=`<header><h2 id="editorTitle">Βήμα ${i+1}<span class="sym">${esc(s.label)}</span></h2><button type="button" class="icon-button" data-ed="close" aria-label="Κλείσιμο"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>`+
    `<svg class="keys" viewBox="0 0 900 93" role="group" aria-label="Πάτα πλήκτρα για να προσθέσεις ή να αφαιρέσεις νότες">${keys}</svg>`+
    `<div class="tools">`+
    `<div class="group"><span>Οκτάβα</span><button type="button" data-ed="oct-">−</button><button type="button" data-ed="oct+">+</button></div>`+
    `<div class="group"><span>Αναστροφή</span><button type="button" data-ed="inv-">↓</button><button type="button" data-ed="inv+">↑</button></div>`+
    `<div class="group"><span>Διάταξη</span><button type="button" data-ed="v-close">Κλειστή</button><button type="button" data-ed="v-open">Ανοιχτή</button><button type="button" data-ed="v-drop2">Drop 2</button></div>`+
    `<div class="group"><span>Χτύποι</span>${BEATS.map(b=>`<button type="button" class="${(s.beats||4)===b?'on':''}" data-ed="beats" data-b="${b}">${b}</button>`).join('')}</div>`+
    `<span class="spacer"></span><div class="group"><button type="button" data-ed="hear">▶ Άκου</button><button type="button" data-ed="delete">Αφαίρεση</button></div></div>`;
}
function onEditor(e){
  const i=state.editor,s=state.steps[i];if(!s)return;
  const key=e.target.closest('rect[data-n]');
  if(key){const n=Number(key.dataset.n);const has=s.notes.includes(n);if(has&&s.notes.length===1)return;
    setNotes(i,has?s.notes.filter(x=>x!==n):[...s.notes,n]);if(!has)audition([n],.5);return;}
  const b=e.target.closest('[data-ed]');if(!b)return;const act=b.dataset.ed;
  if(act==='close')return closeEditor();
  if(act==='hear')return audition(s.notes);
  if(act==='delete')return removeStep(i);
  if(act==='beats')return setBeats(Number(b.dataset.b),i);
  let notes=s.notes.slice();
  if(act==='oct-'&&Math.min(...notes)-12>=21)notes=notes.map(n=>n-12);
  if(act==='oct+'&&Math.max(...notes)+12<=108)notes=notes.map(n=>n+12);
  if(act==='inv+'){const lo=notes[0];notes=[...notes.slice(1),lo+12*Math.ceil((Math.max(...notes)-lo+1)/12)];}
  if(act==='inv-'){const top=notes[notes.length-1];notes=[top-12*Math.ceil((top-notes[0]+1)/12),...notes.slice(0,-1)];}
  if(act.startsWith('v-'))notes=voicing(act.slice(2),notes);
  if(notes.join()!==s.notes.join()){setNotes(i,notes);audition(state.steps[i].notes,.9);}
}

/* ------------------------------------------------------------ project */
function projectData(){
  const mess=/^messiaen/.test(state.mode);
  const settings={tonic:state.tonic,mode:mess?'ionian':state.mode,scaleFamily:mess?'messiaen':'diatonic',style:state.style,goal:state.intent,intent:state.intent,bpm:state.bpm};
  if(mess){settings.messiaenMode=Number(state.mode.split('-')[1]);settings.messiaenTrans=0;}
  return {format:'chord-lab-project',version:3,name:state.projectName,settings,
    sequence:state.steps.map(s=>{const row={root:s.root,quality:s.quality||'custom',label:s.label,notes:s.notes,beats:s.beats||4,custom:Boolean(s.custom)};if(s.sourceLabel)row.sourceLabel=String(s.sourceLabel).slice(0,179);return row;})};
}
function readProject(raw){
  const p=PS.normalize(raw),st=p.settings||{};
  const intents=N.INTENTS.map(x=>x.id);
  state.projectName=p.name||'Χωρίς τίτλο';
  state.tonic=Number.isInteger(st.tonic)?st.tonic:0;
  state.mode=st.scaleFamily==='messiaen'&&M.PATTERNS[st.messiaenMode]&&st.messiaenMode>1?'messiaen-'+st.messiaenMode:(T.MODE[st.mode]?st.mode:'ionian');
  state.style=st.style==='free'||L.LANDSCAPES.some(l=>l.id===st.style)?st.style:'free';
  state.intent=intents.includes(st.intent)?st.intent:intents.includes(st.goal)?st.goal:'motion';
  state.bpm=Math.max(40,Math.min(220,Number(st.bpm)||84));
  state.steps=p.sequence.map(r=>{
    const label=String(r.label||'').replace(/ ✎$/,'');
    // Older files stored colour names ("Ελάσσων ανοιχτή") as chord names.
    const named=/[α-ωΑ-Ωά-ώ]|·/.test(label)||!label?N.symbol(r.notes,r.root):label;
    return {root:r.root,quality:r.quality,label:named,notes:r.notes,beats:r.beats||4,custom:Boolean(r.custom),sourceLabel:r.sourceLabel};
  });
  state.sel=state.steps.length-1;state.range=null;state.preview=null;state.heard=-1;
}
let saveTimer=0;
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(KEY_PROJECT,JSON.stringify(projectData()));}catch(_){status('Η τοπική αποθήκευση απέτυχε. Κράτα αντίγραφο JSON.');}},250);}
function load(){
  for(const k of [KEY_PROJECT,'cl-v15-project','cl-v06-project']){
    let raw=null;try{raw=localStorage.getItem(k);}catch(_){return;}
    if(!raw)continue;
    try{readProject(JSON.parse(raw));if(k!==KEY_PROJECT)status('Άνοιξε το έργο της προηγούμενης έκδοσης.');return;}
    catch(_){try{localStorage.setItem('cl-v16-recovery-'+Date.now(),raw);}catch(__){}}
  }
}
function library(){try{const rows=JSON.parse(localStorage.getItem(KEY_LIBRARY)||'null');if(Array.isArray(rows))return rows;
  const old=JSON.parse(localStorage.getItem('cl-v15-library')||'[]');return Array.isArray(old)?old.filter(x=>x?.format==='chord-lab-project'):[];}catch(_){return [];}}
function writeLibrary(rows){try{localStorage.setItem(KEY_LIBRARY,JSON.stringify(rows.slice(-64)));}catch(_){status('Η βιβλιοθήκη δεν αποθηκεύτηκε.');}}
function renderLibrary(){
  const rows=library();
  $('library').innerHTML=rows.length?rows.map((p,i)=>`<li><button type="button" class="open" data-lib="${i}">${esc(p.name)} <small>· ${p.sequence?.length||0} βήματα</small></button><button type="button" class="del" data-libdel="${i}" aria-label="Διαγραφή ${esc(p.name)}">×</button></li>`).join(''):'<li class="fine">Καμία αποθηκευμένη σύνθεση.</li>';
}
function saveToLibrary(){const rows=library(),p=projectData(),i=rows.findIndex(x=>x.name===p.name);if(i>=0)rows[i]=p;else rows.push(p);writeLibrary(rows);renderLibrary();status(`Αποθηκεύτηκε «${p.name}».`);}
function openFromLibrary(i){const p=library()[i];if(!p)return;stop();remember();try{readProject(p);refresh();save();status(`Άνοιξε «${state.projectName}».`);}catch(e){status('Δεν άνοιξε: '+e.message);}}
function newProject(){stop();remember();state.steps=[];state.sel=-1;state.range=null;state.preview=null;state.projectName='Χωρίς τίτλο';closeEditor();refresh();save();status('Νέα σύνθεση. ⌘Z επαναφέρει την προηγούμενη.');}
function exportJson(){download(JSON.stringify(projectData(),null,2),`${slug(state.projectName)}.json`,'application/json');status('Αποθηκεύτηκε αντίγραφο JSON.');}
async function importJson(file){
  if(!file)return;if(file.size>2e6){status('Το αρχείο είναι πολύ μεγάλο.');return;}
  try{const raw=JSON.parse(await file.text());PS.normalize(raw);stop();remember();readProject(raw);refresh();save();status(`Άνοιξε «${state.projectName}» με ${state.steps.length} βήματα.`);}
  catch(e){status('Δεν άνοιξε το αρχείο: '+e.message);}
}
function midiBytes(){
  const ppq=480,bpm=state.bpm,micro=Math.round(6e7/bpm),ev=[{t:0,b:[255,81,3,micro>>16&255,micro>>8&255,micro&255]},{t:0,b:[255,88,4,4,2,24,8]}];
  const name=[...new TextEncoder().encode(state.projectName.slice(0,60))];ev.push({t:0,b:[255,3,...vlen(name.length),...name]});
  let t=0;for(const s of state.steps){const len=(s.beats||4)*ppq;for(const n of uniq(s.notes)){ev.push({t,b:[0x90,n,84]},{t:t+len-30,b:[0x80,n,0]});}t+=len;}
  ev.sort((a,b)=>a.t-b.t||(a.b[0]===0x80?-1:b.b[0]===0x80?1:0));
  const bytes=[];let prev=0;for(const e of ev){bytes.push(...vlen(e.t-prev),...e.b);prev=e.t;}
  bytes.push(...vlen(Math.max(0,t-prev)),255,47,0);
  const len=bytes.length;return new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,ppq>>8,ppq&255,77,84,114,107,len>>>24&255,len>>>16&255,len>>>8&255,len&255,...bytes]);
  function vlen(v){let n=v>>>0;const a=[n&127];while((n>>=7)>0)a.unshift((n&127)|128);return a;}
}
function exportMidi(){if(!state.steps.length){status('Πρόσθεσε πρώτα συγχορδίες.');return;}download(midiBytes(),`${slug(state.projectName)}-${today()}.mid`,'audio/midi');status('Εξαγωγή MIDI: ένα κομμάτι, οι ακριβείς νότες και διάρκειες.');}
async function exportPdf(){
  if(!state.steps.length){status('Πρόσθεσε πρώτα συγχορδίες.');return;}
  const html=R.makeHTML(projectData()),name=`${slug(state.projectName)}-${today()}.pdf`;
  if(desktop?.exportPdf){try{const r=await desktop.exportPdf(html,name);status(r?.canceled?'Η εξαγωγή PDF ακυρώθηκε.':'Αποθηκεύτηκε το PDF: '+(r?.path||name));}catch(e){status('Δεν δημιουργήθηκε PDF: '+e.message);}return;}
  const w=window.open('','_blank');if(!w){status('Επίτρεψε τα αναδυόμενα παράθυρα για το PDF.');return;}
  w.document.open();w.document.write(html);w.document.close();w.focus();status('Άνοιξε η ανάλυση: Εκτύπωση → Αποθήκευση ως PDF.');
}

/* ------------------------------------------------------------ views, settings, lab */
function setView(v){state.view=v;$('compose').hidden=v!=='compose';$('analysis').hidden=v!=='analysis';
  $('viewCompose').classList.toggle('on',v==='compose');$('viewAnalysis').classList.toggle('on',v==='analysis');
  $('viewCompose').setAttribute('aria-pressed',String(v==='compose'));$('viewAnalysis').setAttribute('aria-pressed',String(v==='analysis'));
  if(v==='analysis')renderAnalysis();}
function openSettings(){$('settings').hidden=false;$('scrim').hidden=false;renderLibrary();$('settings').focus();}
function closeSettings(){$('settings').hidden=true;$('scrim').hidden=true;}
function labPost(type){try{$('oldFrame').contentWindow?.postMessage({type:'chord-studio:legacy-'+type},'*');}catch(_){}}
function openLab(){stop();closeSettings();$('oldOverlay').hidden=false;const f=$('oldFrame');if(f.dataset.loaded!=='1'){f.dataset.loaded='1';f.src='legacy/index.html';}else labPost('resume');}
function closeLab(){labPost('pause');$('oldOverlay').hidden=true;}
const KEYS=[['1 · 2 · 3','άκου την πρόταση'],['⏎','πρόσθεσε ό,τι άκουσες'],['Space','αναπαραγωγή / στοπ'],['← →','προηγούμενο / επόμενο βήμα'],['⇧ ← →','επιλογή τμήματος'],['⌥ ← →','μετακίνηση βήματος'],['[ ]','πιο σύντομο / πιο μακρύ'],['L','επανάληψη'],['E','νότες του βήματος'],['⌫','αφαίρεση βήματος'],['⌘D','διπλασιασμός'],['⌘Z · ⇧⌘Z','αναίρεση · επαναφορά'],['⌘S','αποθήκευση στη βιβλιοθήκη'],['Esc','άκυρο / κλείσιμο']];

/* ------------------------------------------------------------ input */
function addHeardOrPreview(){
  if(state.heard>=0&&state.suggestions[state.heard])return insert(state.suggestions[state.heard],{sourceLabel:state.suggestions[state.heard].originLabel});
  if(state.preview)return insert(state.preview,{sourceLabel:state.preview.source==='midi'?'Είσοδος MIDI':'Κύκλος πέμπτων',custom:state.preview.source==='midi'});
  if(!state.steps.length)return insert(startChord(),{sourceLabel:'Αφετηρία'});
}
function hear(i){const s=state.suggestions[i];if(!s)return;state.heard=i;state.preview=null;renderPreview();renderWheel();
  document.querySelectorAll('.card').forEach(el=>el.classList.toggle('heard',Number(el.dataset.i)===i));transition(current().notes,s.notes);}
function onKey(e){
  const t=e.target,typing=t.closest?.('input,select,textarea');
  const cmd=e.metaKey||e.ctrlKey;
  if(e.key==='Escape'){
    if(!$('oldOverlay').hidden){closeLab();return;}
    if(!$('settings').hidden){closeSettings();return;}
    if(state.editor>=0){closeEditor();return;}
    if(state.preview||state.heard>=0){state.preview=null;state.heard=-1;renderPreview();renderWheelAndCards();return;}
    if(state.range){state.range=null;renderStrip();return;}
    stop();return;
  }
  if(typing||!$('oldOverlay').hidden)return;
  // In the desktop app these come from the menu; do not run them twice.
  if(cmd&&desktop?.hasMenu&&['z','s','d','e','1','2',','].includes(e.key.toLowerCase()))return;
  if(cmd&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if(cmd&&e.key.toLowerCase()==='s'){e.preventDefault();saveToLibrary();return;}
  if(cmd&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();return;}
  if(cmd&&e.key==='1'){e.preventDefault();setView('compose');return;}
  if(cmd&&e.key==='2'){e.preventDefault();setView('analysis');return;}
  if(cmd&&e.key===','){e.preventDefault();openSettings();return;}
  if(cmd||e.altKey&&!['ArrowLeft','ArrowRight'].includes(e.key))return;
  if(t.closest?.('.seg')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();t.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}
  if(t.closest?.('button')&&(e.key==='Enter'||e.key===' '))return;
  if(['1','2','3'].includes(e.key)){e.preventDefault();hear(Number(e.key)-1);return;}
  if(e.key==='Enter'){e.preventDefault();addHeardOrPreview();return;}
  if(e.key===' '){e.preventDefault();togglePlay();return;}
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const d=e.key==='ArrowLeft'?-1:1;
    if(e.altKey){if(state.sel>=0){const to=state.sel+d;if(to>=0&&to<state.steps.length)move(state.sel,d>0?to+1:to);}return;}
    if(e.shiftKey){const end=state.range?(state.range[0]===state.sel?state.range[1]:state.range[0]):state.sel;select(end+d,{extend:true,play:false});return;}
    select(state.sel+d);return;}
  if(e.key==='['){stepBeats(-1);return;}
  if(e.key===']'){stepBeats(1);return;}
  if(e.key.toLowerCase()==='l'){state.loop=!state.loop;renderTransport();if(state.play){stop(false);playRange();}status(state.loop?'Επανάληψη ενεργή.':'Επανάληψη ανενεργή.');return;}
  if(e.key.toLowerCase()==='e'){openEditor();return;}
  if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();removeStep();return;}
}
function onCommand(cmd){
  switch(cmd){
    case 'new':return newProject();
    case 'open':return $('importFile').click();
    case 'save':return saveToLibrary();
    case 'save-json':return exportJson();
    case 'export-midi':return exportMidi();
    case 'export-pdf':return exportPdf();
    case 'undo':return undo();
    case 'redo':return redo();
    case 'duplicate':return duplicate();
    case 'edit':return openEditor();
    case 'view-compose':return setView('compose');
    case 'view-analysis':return setView('analysis');
    case 'settings':return openSettings();
    case 'theory-lab':return openLab();
  }
}

/* ------------------------------------------------------------ setup */
function setup(){
  try{state.theme=localStorage.getItem('cl-theme')||'ivory';state.instrument=localStorage.getItem('cl-instrument')||'piano';}catch(_){}
  if(!['ivory','slate','dark'].includes(state.theme))state.theme='ivory';
  document.body.dataset.theme=state.theme;
  if(desktop?.platform==='darwin')document.body.classList.add('mac-desktop');
  $('tonic').innerHTML=T.N.map((n,i)=>`<option value="${i}">${n}</option>`).join('');
  $('mode').innerHTML=`<optgroup label="Διατονικοί">${MODES.slice(0,7).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</optgroup><optgroup label="Messiaen · συμμετρικοί">${MODES.slice(7).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</optgroup>`;
  $('style').innerHTML=`<option value="free">Ελεύθερο</option>`+L.LANDSCAPES.map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('');
  $('keysHelp').innerHTML=KEYS.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  load();
  $('tonic').addEventListener('change',e=>{setContext('tonic',Number(e.target.value));status(`Κέντρο ${T.name(state.tonic)}.`);});
  $('mode').addEventListener('change',e=>setContext('mode',e.target.value));
  $('style').addEventListener('change',e=>{setContext('style',e.target.value);const l=land();status(l?`${l.name}: ${l.short}.`:'Ελεύθερο: προτάσεις μόνο από την τονικότητα.');});
  $('viewCompose').addEventListener('click',()=>setView('compose'));
  $('viewAnalysis').addEventListener('click',()=>setView('analysis'));
  $('openSettings').addEventListener('click',openSettings);
  $('closeSettings').addEventListener('click',closeSettings);
  $('scrim').addEventListener('click',closeSettings);
  $('wheel').addEventListener('click',onWheel);
  $('wheel').addEventListener('keydown',e=>{const g=e.target.closest('.seg');if(!g)return;
    const ring=g.dataset.ring,i=Number(g.dataset.i);let to=null;
    if(e.key==='ArrowRight')to=[ring,(i+1)%12];if(e.key==='ArrowLeft')to=[ring,(i+11)%12];
    if(e.key==='ArrowUp')to=[ring==='dim'?'minor':'major',i];if(e.key==='ArrowDown')to=[ring==='major'?'minor':'dim',i];
    if(to){e.preventDefault();e.stopPropagation();const el=$('wheel').querySelector(`.seg[data-ring="${to[0]}"][data-i="${to[1]}"]`);el?.focus();}});
  $('now').addEventListener('click',e=>{const a=e.target.closest('[data-act]')?.dataset.act;
    if(a==='hear-now')audition(current().notes);if(a==='edit')openEditor();if(a==='start')insert(startChord(),{sourceLabel:'Αφετηρία'});});
  $('preview').addEventListener('click',e=>{const ext=e.target.closest('[data-ext]');if(ext)return setExt(ext.dataset.ext);
    const a=e.target.closest('[data-act]')?.dataset.act;
    if(a==='add-preview')addHeardOrPreview();
    if(a==='center'&&state.preview)setCenter(state.preview.root,state.preview.family==='minor');
    if(a==='dismiss'){state.preview=null;renderPreview();renderWheel();}});
  $('intents').addEventListener('click',e=>{const b=e.target.closest('[data-intent]');if(!b)return;state.intent=b.dataset.intent;state.heard=-1;renderWheelAndCards();save();
    status(N.INTENTS.find(x=>x.id===state.intent).label+': '+N.INTENTS.find(x=>x.id===state.intent).hint+'.');});
  $('cards').addEventListener('click',e=>{const li=e.target.closest('.card');if(!li)return;const i=Number(li.dataset.i);
    if(e.target.closest('[data-act="add"]')){const s=state.suggestions[i];insert(s,{sourceLabel:s.originLabel});return;}
    hear(i);});
  $('cards').addEventListener('dblclick',e=>{const li=e.target.closest('.card');if(!li||e.target.closest('button'))return;const s=state.suggestions[Number(li.dataset.i)];if(s)insert(s,{sourceLabel:s.originLabel});});
  const strip=$('strip');let drag=-1;
  strip.addEventListener('click',e=>{const b=e.target.closest('.step');if(b)select(Number(b.dataset.i),{extend:e.shiftKey});});
  strip.addEventListener('dblclick',e=>{const b=e.target.closest('.step');if(b)openEditor(Number(b.dataset.i));});
  strip.addEventListener('dragstart',e=>{const b=e.target.closest('.step');if(!b)return;drag=Number(b.dataset.i);b.classList.add('ghost');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',String(drag));}catch(_){}});
  strip.addEventListener('dragend',()=>{drag=-1;document.querySelectorAll('.step').forEach(el=>el.classList.remove('ghost','drop-before','drop-after'));});
  strip.addEventListener('dragover',e=>{const b=e.target.closest('.step');if(drag<0||!b)return;e.preventDefault();const r=b.getBoundingClientRect(),after=e.clientX>r.left+r.width/2;
    document.querySelectorAll('.step').forEach(el=>el.classList.remove('drop-before','drop-after'));b.classList.add(after?'drop-after':'drop-before');});
  strip.addEventListener('drop',e=>{const b=e.target.closest('.step');if(drag<0||!b)return;e.preventDefault();const r=b.getBoundingClientRect(),after=e.clientX>r.left+r.width/2;
    const to=Number(b.dataset.i)+(after?1:0);const from=drag;drag=-1;move(from,to);});
  $('play').addEventListener('click',togglePlay);
  $('loop').addEventListener('click',()=>{state.loop=!state.loop;renderTransport();if(state.play){stop(false);playRange();}});
  $('bpm').addEventListener('change',e=>{const v=Math.max(40,Math.min(220,Math.round(Number(e.target.value))||84));if(v!==state.bpm){remember();state.bpm=v;save();}renderTransport();if(state.play){stop(false);playRange();}});
  $('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);
  $('editor').addEventListener('click',onEditor);
  $('projectName').addEventListener('change',e=>{state.projectName=(e.target.value||'Χωρίς τίτλο').slice(0,80);save();});
  $('newProject').addEventListener('click',newProject);
  $('saveLibrary').addEventListener('click',saveToLibrary);
  $('importJson').addEventListener('click',()=>$('importFile').click());
  $('importFile').addEventListener('change',async e=>{await importJson(e.target.files?.[0]);e.target.value='';});
  $('library').addEventListener('click',e=>{const o=e.target.closest('[data-lib]');if(o){openFromLibrary(Number(o.dataset.lib));closeSettings();return;}
    const d=e.target.closest('[data-libdel]');if(d){const rows=library();const [gone]=rows.splice(Number(d.dataset.libdel),1);writeLibrary(rows);renderLibrary();status(`Διαγράφηκε «${gone?.name}» από τη βιβλιοθήκη.`);}});
  $('midiConnect').addEventListener('click',()=>connectMidi(false));
  $('midiOut').addEventListener('change',e=>{midiPanic();state.midi.outId=e.target.value;status(state.midi.outId?'Ο ήχος πηγαίνει και στην έξοδο MIDI.':'Μόνο εσωτερικός ήχος.');});
  $('instrument').addEventListener('change',e=>{state.instrument=e.target.value;try{localStorage.setItem('cl-instrument',state.instrument);}catch(_){}renderNow();});
  $('theme').addEventListener('change',e=>{state.theme=e.target.value;document.body.dataset.theme=state.theme;try{localStorage.setItem('cl-theme',state.theme);}catch(_){}});
  $('openLab').addEventListener('click',openLab);
  $('closeLab').addEventListener('click',closeLab);
  $('oldFrame').addEventListener('load',()=>labPost($('oldOverlay').hidden?'pause':'resume'));
  $('exportPdf').addEventListener('click',exportPdf);
  $('exportMidi').addEventListener('click',exportMidi);
  $('exportJson').addEventListener('click',exportJson);
  document.addEventListener('keydown',onKey);
  window.addEventListener('beforeunload',()=>{try{localStorage.setItem(KEY_PROJECT,JSON.stringify(projectData()));}catch(_){}});
  desktop?.onCommand?.(onCommand);
  if(desktop)connectMidi(true);
  refresh();
}
setup();
window.ChordStudio={state,refresh,insert,select,undo,redo,projectData,readProject,midiBytes,hear,addHeardOrPreview,previewFromWheel,setBeats,playRange,stop,onCommand};
})();
