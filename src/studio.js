/* Chord Lab Studio 1.7 · composition UI.
   One current chord: the selected step. The wheel and MIDI only audition
   (a dashed preview); proposals are always computed after the selected step
   and are inserted right after it. Engines stay offline and dependency-free. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const T=window.TheoryMap,F=window.FifthsLab,N=window.NextChords,L=window.Landscapes,M=window.MessiaenModes,
  G=window.GuitarShapes,PS=window.ProjectStore,A=window.StudioAnalysis,R=window.RemarkableReport,I=window.I18N,E=window.EarPractice,S=window.Scales;
const pc=T.mod;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const desktop=window.chordDesktop||null;
const KEY_PROJECT='cl-v16-project',KEY_LIBRARY='cl-v16-library',KEY_PRACTICE='cl-v16-practice';
const MAX_STEPS=512,MAX_NOTES=32,BEATS=[1,2,3,4,6,8];
const MODES=[['ionian','Μείζονα'],['dorian','Δώριος'],['phrygian','Φρύγιος'],['lydian','Λύδιος'],['mixolydian','Μιξολύδιος'],['aeolian','Ελάσσονα'],['locrian','Λόκριος'],
  ...[2,3,4,5,6,7].map(n=>['messiaen-'+n,`Messiaen ${n} · ${M.PATTERNS[n].name}`])];
const RULE_LIST=[['','Χωρίς κανόνα'],['one-voice','Μία φωνή κινείται'],['no-five','Χωρίς V'],['bass-down','Το μπάσο κατεβαίνει'],['no-common','Καμία κοινή νότα']];
const EXTS=[['triad','Τριάδα'],['7','7η'],['add9','add9'],['sus2','sus2'],['sus4','sus4']];
const noteName=n=>T.name(n)+(Math.floor(n/12)-1);
/* Language: Greek text is the key (src/i18n.js). */
const tx=(s,...a)=>I.L(state.lang,s,...a),tp=s=>I.parts(state.lang,s),ti=s=>I.inline(state.lang,s);
const GREEK=/[α-ωΑ-Ωά-ώ]/;
function modeLabel(id){const m=/^messiaen-(\d)$/.exec(id),sc=S.byId(id);return m?`Messiaen ${m[1]} · ${tx(M.PATTERNS[m[1]].name)}`:sc?tx(sc.name):tx(MODES.find(x=>x[0]===id)[1]);}
function modeShort(id){const sc=S.byId(id);return /^messiaen/.test(id)?'Messiaen '+id.split('-')[1]:sc?tx(sc.short):tx(MODES.find(m=>m[0]===id)[1]);}
const validMode=id=>MODES.some(x=>x[0]===id)||Boolean(S.byId(id));
/* Scales each genre uses most; shown first in the menu, never imposed. */
const STYLE_MODES={classical:['ionian','aeolian','harmonic-minor','melodic-minor'],takemitsu:['lydian','whole-tone','messiaen-2','pentatonic-major'],
  stravinsky:['messiaen-2','lydian-dominant','phrygian'],glass:['aeolian','ionian','dorian','pentatonic-minor'],morricone:['aeolian','dorian','mixolydian','harmonic-minor'],
  hadjidakis:['aeolian','harmonic-minor','hijaz','dorian'],byzantine:['dorian','phrygian','hijaz','hijazkar'],
  jazz:['dorian','mixolydian','melodic-minor','lydian-dominant','altered','blues'],electronic:['aeolian','dorian','lydian','pentatonic-minor']};
const uniq=xs=>[...new Set(xs)].sort((a,b)=>a-b);

const state={lang:'el',tonic:0,mode:'ionian',style:'takemitsu',intent:'motion',bpm:84,loop:false,
  steps:[],sel:-1,range:null,preview:null,ext:'triad',suggestions:[],heard:-1,view:'compose',
  projectName:'Χωρίς τίτλο',instrument:'piano',theme:'ivory',editor:-1,pattern:'auto',timbre:'auto',melody:null,rule:'',
  midi:{access:null,outId:'',held:new Set(),timer:0,live:new Map(),gesture:new Set(),sustained:new Set(),pedal:false,sound:true},play:null};

/* ------------------------------------------------------------ helpers */
function status(text){$('status').textContent=text||'';}
function keyOpts(){return {tonic:state.tonic,mode:state.mode,transposition:0};}
function key(){return N.keyOf(keyOpts());}
function land(){return L.LANDSCAPES.find(l=>l.id===state.style)||null;}
function startChord(){
  const ring=N.tonicRing(keyOpts());
  // The whole-tone scale has no major or minor triad: it starts on the augmented one.
  const ch=ring==='aug'?{root:pc(state.tonic),quality:'aug',pcs:[0,4,8].map(x=>pc(state.tonic+x))}:N.chordFor(state.tonic,ring,keyOpts());
  const b=48+pc(state.tonic);ch.notes=N.voiceLead([b,b+4,b+7,b+12],ch.pcs,state.tonic);ch.label=N.symbol(ch.notes,ch.root);return ch;
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
function undo(){if(!undoStack.past.length)return;stop();undoStack.future.push(snapshot());restore(undoStack.past.pop());status(tx('Αναίρεση.'));}
function redo(){if(!undoStack.future.length)return;stop();undoStack.past.push(snapshot());restore(undoStack.future.pop());status(tx('Επαναφορά.'));}

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
  timbre:'piano',
  /* Piano: a struck tone that fades. Pad: slow attack, held. Strings: two
     detuned saws with a late vibrato. */
  note(n,at,dur,vel){
    const ctx=this.ctx,f=440*Math.pow(2,(n-69)/12),end=at+Math.max(.08,dur),kind=this.timbre;
    const g=ctx.createGain(),lp=ctx.createBiquadFilter();lp.type='lowpass';
    const spec=kind==='pad'?[['sawtooth',1,-7,.3],['sawtooth',1,7,.3],['sine',.5,0,.3]]:kind==='strings'?[['sawtooth',1,-5,.36],['sawtooth',1,5,.36],['triangle',2,0,.08]]:[['triangle',1,0,1],['sine',2,4,.16],['sine',1,-7,.38]];
    const oscs=spec.map(([type,mul,det,amt])=>{
      const o=ctx.createOscillator(),og=ctx.createGain();o.type=type;o.frequency.value=f*mul;o.detune.value=det;og.gain.value=amt;o.connect(og);og.connect(lp);return o;});
    lp.connect(g);g.connect(this.bus);
    let release=.12;
    if(kind==='piano'){lp.Q.value=.4;lp.frequency.setValueAtTime(Math.min(9000,f*7+900),at);lp.frequency.setTargetAtTime(Math.max(500,f*2.4),at+.02,.5);
      g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(vel,at+.012);g.gain.setTargetAtTime(vel*.5,at+.02,.35);
      if(dur>2)g.gain.setTargetAtTime(vel*.12,at+1.5,2.2);}
    else{const attack=Math.min(kind==='pad'?.35:.14,dur*.4),level=vel*.62;release=kind==='pad'?.25:.12;
      lp.Q.value=kind==='pad'?.3:.6;lp.frequency.value=kind==='pad'?Math.min(2600,f*3+300):Math.min(4200,f*4+600);
      g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(level,at+attack);
      if(kind==='strings'&&dur>.4){const lfo=ctx.createOscillator(),depth=ctx.createGain();lfo.frequency.value=5.3;depth.gain.setValueAtTime(0,at);depth.gain.linearRampToValueAtTime(5,at+.4);
        lfo.connect(depth);oscs.forEach(o=>depth.connect(o.detune));oscs.push(lfo);}}
    g.gain.setTargetAtTime(.0001,end,release);
    const voice={g,oscs};this.voices.add(voice);
    oscs.forEach(o=>{o.start(at);o.stop(end+release*7);});oscs[0].onended=()=>this.voices.delete(voice);
    return voice;
  },
  /* A key held on the MIDI keyboard: it sounds until released. */
  hold(n,velocity){
    const ctx=this.init();if(!ctx)return null;this.release(n);this.timbre=soundTimbre();
    const voice=this.note(n,ctx.currentTime+.004,600,.16*(.4+.6*Math.min(127,velocity)/127));
    state.midi.live.set(n,voice);return voice;
  },
  release(n){
    const v=state.midi.live.get(n);if(!v||!this.ctx)return;state.midi.live.delete(n);const now=this.ctx.currentTime;
    try{v.g.gain.cancelScheduledValues(now);v.g.gain.setValueAtTime(Math.max(.0001,v.g.gain.value),now);v.g.gain.setTargetAtTime(.0001,now,.09);v.oscs.forEach(o=>o.stop(now+.7));}catch(_){}
  },
  chord(notes,at=0,dur=1.2,strum=.008,gain=1){
    const ctx=this.init();if(!ctx||!notes?.length)return;
    this.timbre=soundTimbre();
    const t=ctx.currentTime+.03+at,list=uniq(notes),vel=gain*Math.min(.2,.42/Math.sqrt(list.length)/1.3);
    list.forEach((n,i)=>this.note(n,t+i*strum,dur,vel*(n<45?.85:1)));
    midiOut(list,at,dur);
  },
  stopAll(){const ctx=this.ctx;if(!ctx)return;const now=ctx.currentTime;
    for(const v of this.voices){try{v.g.gain.cancelScheduledValues(now);v.g.gain.setTargetAtTime(.0001,now,.03);v.oscs.forEach(o=>o.stop(now+.2));}catch(_){}}
    this.voices.clear();state.midi.live.clear();midiPanic();}
};
/* Playback pattern and sound: chosen in Settings, or taken from the style. */
const PATTERNS=[['block','Μπλοκ'],['arpeggio','Αρπέζ'],['pulse','Παλμός']],TIMBRES=[['piano','Πιάνο'],['pad','Pad'],['strings','Έγχορδα']];
const STYLE_SOUND={classical:['block','piano'],takemitsu:['block','pad'],morricone:['block','strings'],stravinsky:['pulse','strings'],byzantine:['block','pad'],
  hadjidakis:['arpeggio','piano'],glass:['arpeggio','piano'],jazz:['block','piano'],electronic:['pulse','pad'],free:['block','piano']};
function styleSound(){return STYLE_SOUND[state.style]||STYLE_SOUND.free;}
function soundPattern(){return state.pattern==='auto'?styleSound()[0]:state.pattern;}
function soundTimbre(){return state.timbre==='auto'?styleSound()[1]:state.timbre;}
/* One chord in the pattern. A single chord heard alone stays a block. */
function perform(notes,at,dur){
  const list=uniq(notes),pattern=soundPattern(),step=30/state.bpm;
  if(pattern==='block'||list.length<2)return Sound.chord(list,at,dur);
  if(pattern==='pulse'){for(let k=0,t=0;t<dur-.03;t+=step,k++)Sound.chord(list,at+t,Math.min(step*.78,dur-t),.003,k%2?.72:1);return;}
  // Arpeggio: the bass holds, the upper voices go up and down in eighths.
  const [bass,...up]=list,seq=up.length>2?[...up,...up.slice(1,-1).reverse()]:up;
  Sound.chord([bass],at,dur,0,.85);
  for(let k=0,t=0;t<dur-.03;t+=step,k++)Sound.chord([seq[k%seq.length]],at+t,Math.min(step*1.7,dur-t),0,.8);
}
function audition(notes,dur=1.3){stop(false);Sound.stopAll();Sound.chord(notes,0,dur);}
function transition(from,to,pattern=true){stop(false);Sound.stopAll();const d=Math.max(.85,Math.min(1.6,120/state.bpm));
  if(pattern){perform(from,0,d);perform(to,d,d*1.5);}else{Sound.chord(from,0,.85);Sound.chord(to,.95,1.5);}}
/* A proposal heard in its phrase: the step before, the current step, then the
   proposal, at one and a half beats of the tempo each. */
function inPhrase(to){
  stop(false);Sound.stopAll();
  const lead=state.steps.length?state.steps.slice(Math.max(0,state.sel-1),state.sel+1):[startChord()];
  const d=Math.max(.7,Math.min(1.5,120/state.bpm));let at=0;
  for(const s of lead){perform(s.notes,at,d*.96);at+=d;}
  perform(to.notes,at,d*1.6);
  return lead;
}

/* ------------------------------------------------------------ MIDI */
function midiOutput(){return state.midi.access?.outputs?.get?.(state.midi.outId)||null;}
function midiOut(notes,delay,dur){const out=midiOutput();if(!out)return;const now=performance.now();
  for(const n of notes)try{out.send([0x90,n,80],now+delay*1000);out.send([0x80,n,0],now+(delay+dur)*1000);}catch(_){}}
function midiPanic(){const out=midiOutput();if(!out)return;try{out.clear?.();for(let c=0;c<16;c++){out.send([0xB0|c,123,0]);out.send([0xB0|c,120,0]);}}catch(_){}}
async function connectMidi(silent=false){
  if(!navigator.requestMIDIAccess){if(!silent)status(tx('Το MIDI χρειάζεται την εφαρμογή ή Chrome/Edge.'));return;}
  try{state.midi.access=await navigator.requestMIDIAccess({sysex:false});}catch(e){if(!silent)status(tx('Δεν δόθηκε πρόσβαση στο MIDI.'));return;}
  const bind=()=>{
    const inputs=[...state.midi.access.inputs.values()].filter(i=>i.state!=='disconnected');
    inputs.forEach(input=>{input.onmidimessage=onMidi;});
    $('midiConnect').textContent=inputs.length?'MIDI: '+inputs.map(i=>i.name).join(', '):tx('Κανένα όργανο MIDI');
    const outs=[...state.midi.access.outputs.values()].filter(o=>o.state!=='disconnected');
    if(!outs.some(o=>o.id===state.midi.outId))state.midi.outId='';
    $('midiOut').innerHTML=`<option value="">${esc(tx('Εσωτερικός ήχος'))}</option>`+outs.map(o=>`<option value="${esc(o.id)}">${esc(o.name||o.id)}</option>`).join('');
    $('midiOut').value=state.midi.outId;
  };
  state.midi.access.onstatechange=bind;bind();
  if(!silent)status(tx('MIDI συνδέθηκε. Παίξε μια συγχορδία και πάτα ⏎ για να μπει στη σύνθεση.'));
}
/* MIDI input. Every key sounds while it is held (and while the sustain pedal
   is down). The keys of one gesture, from the first key down to the last key
   up, make the chord offered for ⏎; letting go of the keys does not shrink it.
   A gesture of a single key is a melody note. */
function onMidi(e){
  const [op,n,v=0]=e.data||[],type=op&0xF0,m=state.midi;
  if((op&0x0F)===9)return;
  if(type===0xB0&&n===64){m.pedal=v>=64;if(!m.pedal){for(const k of m.sustained)if(!m.held.has(k))Sound.release(k);m.sustained.clear();}return;}
  if(type===0x90&&v>0){
    m.held.add(n);m.gesture.add(n);m.sustained.delete(n);
    if(m.sound)Sound.hold(n,v);
    clearTimeout(m.timer);m.timer=setTimeout(()=>showGesture(false),40);
  }else if(type===0x80||(type===0x90&&v===0)){
    m.held.delete(n);
    if(m.pedal)m.sustained.add(n);else Sound.release(n);
    if(!m.held.size){clearTimeout(m.timer);showGesture(true);}
  }
}
function showGesture(done){
  const m=state.midi,notes=[...m.gesture].sort((a,b)=>a-b);
  if(done)m.gesture.clear();
  if(notes.length===1){if(done)setMelody(notes[0],{quiet:true});return;}
  if(notes.length<2||notes.length>MAX_NOTES)return;
  const ch=N.recognise(notes,keyOpts());
  state.preview={...ch,source:'midi'};state.heard=-1;state.ext='triad';state.melody=null;
  renderPreview();renderWheelAndCards();renderNow();
  if(done)status(state.steps.length?tx('Από το MIDI: {0}. ⏎ για να μπει μετά το {1}.',tp(ch.label),tp(current().label)):tx('Από το MIDI: {0}. ⏎ για να ξεκινήσεις με αυτή.',tp(ch.label)));
}

/* ------------------------------------------------------------ edits */
function makeStep(ch,extra={}){
  return {root:pc(ch.root),quality:ch.quality||'custom',label:ch.label||N.symbol(ch.notes,ch.root),notes:uniq(ch.notes).slice(0,MAX_NOTES),
    beats:extra.beats||state.steps[state.sel]?.beats||4,sourceLabel:extra.sourceLabel||ch.originLabel||undefined,custom:Boolean(extra.custom)};
}
function insert(ch,extra){
  if(state.steps.length>=MAX_STEPS){status(tx('Έως 512 βήματα ανά έργο.'));return;}
  stop();remember();
  const at=state.steps.length?state.sel+1:0;
  state.steps.splice(at,0,makeStep(ch,extra));
  state.sel=at;state.preview=null;state.heard=-1;state.range=null;state.melody=null;state.ext='triad';
  refresh();save();scrollToSel();
  status(tx('Μπήκε {0} στο βήμα {1}.',tp(state.steps[at].label),at+1));
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
  if(state.editor>=0)closeEditor();refresh();save();status(tx('Αφαιρέθηκε {0}. ⌘Z για επαναφορά.',tp(gone.label)));
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
function stepBeats(dir){if(state.sel<0)return;const b=state.steps[state.sel].beats||4;let ix=BEATS.indexOf(b);if(ix<0)ix=3;setBeats(BEATS[Math.max(0,Math.min(BEATS.length-1,ix+dir))]);status(tx('Διάρκεια: {0} χτύποι.',state.steps[state.sel].beats));}
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
  status(tx('Νέο κέντρο: {0} {1}. Οι βαθμίδες ξαναϋπολογίστηκαν.',T.name(state.tonic),modeShort(state.mode)));
}
function setContext(field,value){remember();state[field]=value;state.preview=null;state.heard=-1;refresh();save();}

/* ------------------------------------------------------------ playback */
function playRange(){
  if(!state.steps.length){status(tx('Πρόσθεσε πρώτα μια συγχορδία.'));return;}
  const ctx=Sound.init();if(!ctx)return;Sound.stopAll();
  let a,b;
  if(state.range)[a,b]=state.range;
  else{a=state.loop||state.sel>=state.steps.length-1?0:Math.max(0,state.sel);b=state.steps.length-1;}
  const spb=60/state.bpm,t0=ctx.currentTime+.06,timers=[];let t=t0;
  // Each step is scheduled a moment before it sounds, so long pieces stay light.
  for(let i=a;i<=b;i++){
    const s=state.steps[i],dur=(s.beats||4)*spb,start=t;
    timers.push(setTimeout(()=>{if(!state.play)return;perform(s.notes,start-ctx.currentTime-.03,dur*.97);},Math.max(0,(start-ctx.currentTime-.2)*1000)));
    timers.push(setTimeout(()=>{if(state.play){state.play.index=i;renderStripPlaying();}},Math.max(0,(start-ctx.currentTime)*1000)));
    t+=dur;
  }
  const total=(t-ctx.currentTime)*1000;
  timers.push(setTimeout(()=>{if(!state.play)return;if(state.loop)playRange();else stop();},total));
  state.play={timers,index:a,range:[a,b]};
  renderTransport();
  status(state.loop?tx('Επανάληψη βημάτων {0}–{1}. Space για στοπ.',a+1,b+1):tx('Αναπαραγωγή βημάτων {0}–{1}.',a+1,b+1));
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
/* Functions by scale degree, in major and minor only: I iii vi tonic,
   ii IV subdominant, V vii° dominant (the same degrees in minor). */
const FN=['t','s','t','s','d','t','d'],FN_NAME={t:'Τονική',s:'Υποδεσπόζουσα',d:'Δεσπόζουσα'};
const slotKey=ch=>{const s=N.wheelSlot(ch);return s.ring+':'+s.index;};
function renderWheel(){
  const k=key(),dia=new Map(),fn=new Map(),tonal=['ionian','aeolian','harmonic-minor','melodic-minor'].includes(state.mode);
  // The wheel has rings for major, minor and diminished: augmented chords stay in the cards.
  for(const ch of N.keyChords(k)){if(N.family(ch.pcs,ch.root)==='aug')continue;const s=slotKey(ch);dia.set(s,N.roman(ch,k));if(tonal)fn.set(s,FN[ch.degree]);}
  const cur=current(),curSlot=N.wheelSlot({root:cur.root,notes:cur.notes});
  const pv=state.preview,pre=pv?(pv.source==='wheel'?{ring:pv.ring,index:pv.ring==='major'?F.ROOTS.indexOf(pv.slotRoot):F.MINOR_ROOTS.indexOf(pv.slotRoot)}:N.wheelSlot(pv)):null,mp=state.melody===null?null:pc(state.melody);
  const holds=(ring,i)=>{const r=slotRoot(ring,i);return (ring==='major'?[0,4,7]:ring==='minor'?[0,3,7]:[0,3,6]).some(x=>pc(r+x)===mp);};
  let segs='';
  for(const ring of ['major','minor','dim'])for(let i=0;i<12;i++){
    const [r0,r1]=RINGS[ring],a=i*30,id=ring+':'+i,rom=dia.get(id);
    const f=fn.get(id),cls=['seg','ring-'+ring,rom?'dia':'',f?'fn-'+f:'',pre&&pre.ring===ring&&pre.index===i?'pre':'',mp===null?'':holds(ring,i)?'mel':'off'].join(' ');
    const [nx,ny]=polar(ring==='major'?187:ring==='minor'?126:82,a),[rx,ry]=polar(ring==='major'?162:ring==='minor'?111:70,a);
    // Inner rings: the degree sits under the name, so long degrees (♭vii, ♭III+) never overlap it.
    const stacked=ring!=='major';
    const shaped=pv?.source==='wheel'&&state.ext!=='triad'&&pre.ring===ring&&pre.index===i;
    const name=shaped?pv.label.split('/')[0]:slotName(ring,i),about=[name,rom?ti(rom):'',f?tx(FN_NAME[f]):''].filter(Boolean).join(' · ');
    segs+=`<g class="${cls}" data-ring="${ring}" data-i="${i}" role="button" tabindex="${ring==='major'&&i===0?0:-1}" aria-label="${esc(about)}"><title>${esc(about)}</title>`+
      `<path d="${sector(r0,r1,a-15,a+15)}"/><text class="n${name.length>4?' long':''}" x="${nx.toFixed(1)}" y="${(ring==='dim'?ny-3:ring==='minor'&&rom?ny-5:ny).toFixed(1)}">${esc(name)}</text>`+
      (rom&&!stacked?`<text class="r" x="${rx.toFixed(1)}" y="${ry.toFixed(1)}">${esc(ti(rom))}</text>`:'')+
      (rom&&stacked?`<text class="r" x="${nx.toFixed(1)}" y="${(ny+(ring==='dim'?9:11)).toFixed(1)}">${esc(ti(rom))}</text>`:'')+`</g>`;
  }
  const outline=(s,cls)=>{const [r0,r1]=RINGS[s.ring];return `<path class="${cls}" d="${sector(r0+1.5,r1-1.5,s.index*30-13.5,s.index*30+13.5)}"/>`;};
  let marks='';
  const stack=new Map();
  state.suggestions.forEach((c,ix)=>{const s=N.wheelSlot(c);const [,r1]=RINGS[s.ring];const k=s.ring+':'+s.index,n=stack.get(k)||0;stack.set(k,n+1);
    const [x,y]=polar(r1-11,s.index*30+[10,-10,0][n%3]);
    marks+=`<g class="marker${c.contrast?' contrast':''}" data-i="${ix}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9.5"/><text x="${x.toFixed(1)}" y="${(y+.5).toFixed(1)}">${ix+1}</text></g>`;});
  const mshort=modeShort(state.mode);
  const legend=tonal?`<g class="legend" aria-hidden="true">${['t','s','d'].map((id,n)=>`<rect class="fn-${id}" x="-221" y="${170.5+n*17}" width="11" height="11" rx="2"/><text x="-205" y="${176+n*17}">${esc(tx(FN_NAME[id]))}</text>`).join('')}</g>`:'';
  $('wheel').innerHTML=`<svg viewBox="-222 -222 444 444"${mp===null?'':' class="has-mel"'} role="group" aria-label="${esc(tx('Κύκλος πέμπτων · {0}',T.name(state.tonic)+' '+mshort))}">${legend}${segs}${outline(curSlot,'cur-outline')}${pre?outline(pre,'pre-outline'):''}${marks}`+
    `<g class="center" role="button" tabindex="-1" aria-label="${esc(tx('Άκου το κέντρο'))}"><circle r="58"/><text class="k" y="-6">${esc(T.name(state.tonic))}</text><text class="m" y="19">${esc(mshort)}</text></g></svg>`;
}
function onWheel(e){
  const g=e.target.closest('.seg');
  if(g){const ring=g.dataset.ring,i=Number(g.dataset.i),root=slotRoot(ring,i),p=state.preview;
    // A form (7, sus4 …) belongs to the chord it was chosen for: another chord starts as a triad.
    if(!(p?.source==='wheel'&&p.ring===ring&&pc(p.slotRoot)===pc(root)))state.ext='triad';
    previewFromWheel(root,ring);return;}
  if(e.target.closest('.center'))audition(startChord().notes);
}
function previewFromWheel(root,ring){
  const ch=N.chordFor(root,ring,{...keyOpts(),extension:state.ext,from:current().notes});
  if(state.melody!==null&&ch.pcs.includes(pc(state.melody))){ch.notes=N.underMelody(ch.notes,ch.pcs,state.melody);ch.label=N.symbol(ch.notes,ch.root);}
  state.preview={...ch,source:'wheel',ring,slotRoot:pc(root)};state.heard=-1;
  renderPreview();renderWheel();renderCards();renderNow();
  audition(ch.notes);
}
function setExt(ext){state.ext=ext;if(state.preview?.source==='wheel')previewFromWheel(state.preview.slotRoot,state.preview.ring);}
/* What the chosen form does on this chord, and where sevenths go in the style. */
const SEVENTHS={jazz:'Στην τζαζ όλες οι βαθμίδες παίρνουν 7η.',takemitsu:'Εδώ οι 7ες είναι χρώματα: μπαίνουν σε όποια βαθμίδα θέλεις, χωρίς να ζητούν λύση.',
  electronic:'Εδώ οι 7ες είναι χρώματα: μπαίνουν σε όποια βαθμίδα θέλεις, χωρίς να ζητούν λύση.',glass:'Ο μινιμαλισμός μένει σε τριάδες· μια 7η ξεχωρίζει.',
  stravinsky:'Στον μοντερνισμό οι 7ες ανήκουν στα μπλοκ· δεν ζητούν λύση.',byzantine:'Το βυζαντινό αποφεύγει τις 3ες· η 7η είναι ξένη στο ύφος.'};
function formHint(p){
  if(p?.source!=='wheel'||state.ext==='triad')return '';
  const r=p.slotRoot,deg=pc(r-state.tonic),third=p.ring==='major'?4:3,n=x=>T.name(pc(r+x));
  const triad=T.name(r)+(p.ring==='minor'?'m':p.ring==='dim'?'°':'');
  if(state.ext==='sus4')return tx('sus4: η 4η ({0}) θέλει να πέσει στην 3η ({1}). Λύνεται συνήθως στην {2}.',n(5),n(third),triad);
  if(state.ext==='sus2')return tx('sus2: η 2α ({0}) μπορεί να ανέβει στην 3η ({1}) ή να μείνει ως χρώμα.',n(2),n(third));
  if(state.ext==='add9')return tx('add9: η 9η ({0}) είναι χρώμα πάνω από την τριάδα· δεν χρειάζεται λύση.',n(2));
  let first;
  if(p.quality==='7')first=deg===7?tx('V7: το τρίτονο {0}–{1} λύνεται στην I· η 3η ανεβαίνει, η 7η κατεβαίνει.',n(4),n(10)):tx('Το {0}7 ακούγεται σαν δεσπόζουσα του {1}: θέλει να πάει μία 5η κάτω.',T.name(r),T.name(pc(r+5)));
  else if(p.quality==='maj7')first=tx('maj7: χρώμα χωρίς ένταση· στέκεται και μόνη της.');
  else if(p.quality==='m7')first=deg===2?tx('ii7 → V7 → I: η πιο συνηθισμένη αλυσίδα με έβδομες.'):tx('m7: μαλακή· δεν ζητά λύση.');
  else if(p.quality==='m7b5')first=deg===11?tx('viiø7: σαν V7 χωρίς ρίζα· λύνεται στην I.'):deg===2?tx('iiø7 → V7 → i: η αλυσίδα της ελάσσονας.'):tx('ø7: ασταθής· ζητά λύση.');
  else first=tx('dim7: συμμετρική· λύνεται ημιτόνιο πάνω.');
  return first+' '+tx(SEVENTHS[state.style]||'Στη λειτουργική αρμονία η 7η μπαίνει κυρίως στη V, και στις ii και vii°.');
}

/* ------------------------------------------------------------ panels */
/* With a target: held notes, notes that leave, notes that arrive, and an arc
   for each voice that moves (the same matching as the Analysis). */
/* Degree of a note in the key: the scale's degrees with their accidentals
   (Saba: ♭4, Lydian: ♯4); notes outside it, and scales without seven
   degrees, are counted from the tonic, spelled like the Roman numerals
   (♯4 as in ♯iv); only the blues calls its blue note ♭5. */
const FROM_TONIC=['1','♭2','2','♭3','3','4','♯4','5','♭6','6','♭7','7'];
function degreeOf(n,k=key()){
  const r=pc(n-k.tonic),steps=!k.messiaen&&k.steps.length===7?k.steps:null,ix=steps?steps.indexOf(r):-1;
  if(ix<0)return r===6&&k.scale?.id==='blues'?'♭5':FROM_TONIC[r];
  const alt=steps[ix]-[0,2,4,5,7,9,11][ix];return (alt<0?'♭'.repeat(-alt):'♯'.repeat(alt))+(ix+1);
}
/* The scale on the keys, each with its degree, and the chord on top. With a
   target: the notes that stay, leave and arrive, and an arc for each voice
   that moves (the same matching as the Analysis). */
function scaleKeys(notes,to=null){
  const k=key(),inScale=n=>k.pcs.includes(pc(n)),all=to?[...notes,...to]:notes;
  const lo=Math.min(48,Math.floor(Math.min(...all)/12)*12),hi=Math.max(lo+24,Math.ceil((Math.max(...all)+1)/12)*12);
  const whites=[];for(let n=lo;n<=hi;n++)if(![1,3,6,8,10].includes(pc(n)))whites.push(n);
  const W=520,w=W/whites.length,x={};let keys='',labels='';
  const state_=n=>{if(!to)return notes.includes(n)?(inScale(n)?' on':' out'):inScale(n)?'':' off';
    const a=notes.includes(n),b=to.includes(n);return a&&b?' on':a?' leave':b?' arrive':inScale(n)?'':' off';};
  const key_=(n,black,kx,kw,h)=>{const st=state_(n);keys+=`<rect class="${black?'b':'w'}${st}" x="${kx.toFixed(2)}" y="0" width="${kw.toFixed(2)}" height="${h}" rx="${black?1.5:2.5}"/>`;
    if(st!==' off')labels+=`<text class="${black?'b':'w'}${st}" x="${(kx+kw/2).toFixed(2)}" y="${black?h-5:h-7}">${esc(degreeOf(n,k))}</text>`;};
  whites.forEach((n,i)=>{x[n]=i*w+w/2;key_(n,false,i*w,w-1,58);});
  whites.forEach((n,i)=>{if([0,2,5,7,9].includes(pc(n))&&n+1<=hi){x[n+1]=i*w+w;key_(n+1,true,i*w+w*.66,w*.68,35);}});
  let arcs='';
  if(to)for(const p of A.voicePairs(uniq(notes),uniq(to)).pairs){
    if(!p.delta)continue;const a=x[p.from],b=x[p.to],h=Math.min(13,4+Math.abs(b-a)*.08),f=v=>v.toFixed(1);
    arcs+=`<path class="arc" d="M${f(a)} -1Q${f((a+b)/2)} ${f(-1-2*h)} ${f(b)} -1"/><path class="arc" d="M${f(b-3)} -4.5L${f(b)} -1L${f(b+3)} -4.5"/>`;
  }
  return `<svg class="scale-keys" viewBox="0 -16 ${W} 75" role="img" aria-label="${esc(tx('Κλίμακα και συγχορδία στο πιάνο'))}">${keys}${labels}${arcs}</svg>`;
}
/* The guitar: the scale in the position of the chord shape, five frets, each
   note with its degree; the shape itself filled. */
function scaleFrets(notes,root){
  const k=key(),g=G.suggest(notes,root),open=[40,45,50,55,59,64];
  // Five frets around the shape; open strings left of the nut when the shape or the position uses them.
  const fretted=g?g.frets.filter(f=>f>0):[],maxF=fretted.length?Math.max(...fretted):0,start=maxF<=5?1:Math.min(...fretted),cols=5;
  const openCol=start===1||Boolean(g&&g.frets.includes(0));
  const W=520,left=openCol?38:14,fw=(W-left-8)/cols,sy=15,top=10;let s='';
  const fx=f=>f===0?left-18:left+(f-start+.5)*fw;
  for(let i=0;i<6;i++)s+=`<line class="string" x1="${left}" y1="${top+i*sy}" x2="${W-8}" y2="${top+i*sy}"/>`;
  for(let c=0;c<=cols;c++){const xx=left+c*fw;s+=`<line class="${c===0&&start===1?'nut':'fret'}" x1="${xx.toFixed(1)}" y1="${top}" x2="${xx.toFixed(1)}" y2="${top+5*sy}"/>`;}
  const frets=[...(openCol?[0]:[]),...Array.from({length:cols},(_,i)=>start+i)];
  // High E on top, as in tablature.
  for(let si=0;si<6;si++){const y=top+(5-si)*sy;
    for(const f of frets){const n=open[si]+f,shape=g&&g.frets[si]===f,inS=k.pcs.includes(pc(n));
      if(!shape&&!inS)continue;const cx=fx(f).toFixed(1);
      s+=`<circle class="${shape?(inS?'on':'out'):'sc'}" cx="${cx}" cy="${y}" r="${shape?7.2:6.4}"/><text class="${shape?'on':'sc'}" x="${cx}" y="${y+.5}">${esc(degreeOf(n,k))}</text>`;}}
  const marks=[];for(let f=start;f<start+cols;f++)if([3,5,7,9,12,15].includes(f)||(f===start&&start>1))marks.push(`<text class="num" x="${fx(f).toFixed(1)}" y="${top+5*sy+14}">${f}</text>`);
  return `<svg class="scale-frets" viewBox="0 0 ${W} ${top+5*sy+18}" role="img" aria-label="${esc(tx('Κλίμακα και συγχορδία στην κιθάρα'))}">${s}${marks.join('')}</svg>`;
}
/* What you are listening to next: a proposal you heard or a preview. */
function target(){return state.heard>=0?state.suggestions[state.heard]||null:state.preview;}
function renderNow(){
  const c=current(),has=state.steps.length>0;
  const label=tp(c.label),to=target(),guitar=state.instrument==='guitar',shown=to||c,k=key();
  // The guitar shows the chord you are about to hear; the piano shows the move to it.
  const board=guitar?scaleFrets(shown.notes,shown.root):scaleKeys(c.notes,to?.notes);
  const out=(guitar?shown.notes:to?to.notes:c.notes).some(n=>!k.pcs.includes(pc(n)));
  const legend=(to&&!guitar?[['on','μένει'],['leave','φεύγει'],['arrive','έρχεται']]:[['on','συγχορδία']]).concat(out?[['out','εκτός κλίμακας']]:[],[['sc','κλίμακα']]);
  $('now').innerHTML=`<div class="eyebrow">${has?tx('Τώρα · <b>βήμα {0}</b> από {1}',state.sel+1,state.steps.length):esc(tx('Αφετηρία · το κέντρο σου'))}${to?` <span class="to">→ ${esc(tp(to.label))}</span>`:''}</div>`+
    `<div class="title"><span class="sym${label.length>9?' long':''}" title="${esc(label)}">${esc(label)}</span><span class="roman">${esc(ti(romanOf(c)))}</span></div>`+
    `<div class="actions"><div class="row">`+
    `<button type="button" class="btn-ghost" data-act="hear-now">${esc(tx('▶ Άκου'))}</button>`+
    (has?`<button type="button" class="btn-ghost" data-act="edit">${esc(tx('✎ Νότες'))}</button>`:`<button type="button" class="btn-primary" data-act="start">${esc(tx('＋ Ξεκίνα εδώ'))}<span class="kbd">⏎</span></button>`)+
    `</div></div><div class="board" title="${esc(shown.notes.map(noteName).join(' · '))}">${board}</div>`+
    `<div class="legend">${legend.map(([c,l])=>`<span><i class="${c}"></i>${esc(tx(l))}</span>`).join('')}<span class="key-name">${esc(modeLabel(state.mode))} · ${esc(T.name(state.tonic))}</span></div>`;
}
function renderPreview(){
  const p=state.preview,box=$('preview');
  if(!p){box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;
  const after=state.steps.length?tx('Πρόσθεσε μετά το {0}',tp(current().label)):tx('Ξεκίνα με αυτή');
  box.innerHTML=`<div class="eyebrow">${esc(tx(p.source==='midi'?'Δοκιμή · από το MIDI':'Δοκιμή · από τον κύκλο'))}</div>`+
    `<div class="title"><span class="sym">${esc(tp(p.label))}</span><span class="roman">${esc(ti(p.roman||romanOf(p)))}</span></div>`+
    (p.source==='wheel'?`<div class="exts" role="radiogroup" aria-label="${esc(tx('Μορφή'))}">${EXTS.map(([id,l])=>`<button type="button" class="chip${state.ext===id?' on':''}" data-ext="${id}" role="radio" aria-checked="${state.ext===id}">${esc(tx(l))}</button>`).join('')}</div>`+(formHint(p)?`<p class="hint">${esc(formHint(p))}</p>`:''):`<div class="exts"><span class="fine">${esc(tx('Βαθμίδες: {0}',uniq(p.notes.map(n=>pc(n))).map(x=>degreeOf(x)).join(' · ')))}</span></div>`)+
    `<div class="actions"><button type="button" class="btn-primary" data-act="add-preview">＋ ${esc(after)}<span class="kbd">⏎</span></button>`+
    `<button type="button" class="btn-ghost" data-act="center">${esc(tx('◎ Κάνε το κέντρο'))}</button><button type="button" class="btn-ghost" data-act="dismiss">${esc(tx('Άκυρο'))} <span class="kbd">esc</span></button></div>`;
}
function renderIntents(){
  $('intents').innerHTML=N.INTENTS.map(x=>`<button type="button" class="chip${state.intent===x.id?' on':''}" data-intent="${x.id}" role="radio" aria-checked="${state.intent===x.id}" title="${esc(tx(x.hint))}">${esc(tx(x.label))}</button>`).join('');
}
const ICON_PLAY='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/></svg>',ICON_ADD='<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
function renderCards(){
  const c=current();
  state.suggestions=N.suggest({current:c,history:state.steps.slice(0,state.sel+1),...keyOpts(),style:state.style,intent:state.intent,melody:state.melody,rule:state.rule});
  if(!state.suggestions.length)$('cards').innerHTML=`<li class="card-empty">${esc(tx('Καμία πρόταση δεν ταιριάζει. Άλλαξε τον κανόνα ή τη νότα.'))}</li>`;
  else $('cards').innerHTML=state.suggestions.map((s,i)=>{
    const why=tx(s.reason&&(s.origin!=='style'||s.fit)?s.reason:(s.why||s.reason||'')),origin=tp(s.originLabel||'');
    return `<li class="card${s.contrast?' contrast':''}${state.heard===i?' heard':''}" data-i="${i}">`+
    `<span class="badge">${i+1}</span>`+
    `<div class="head"><span class="sym">${esc(tp(s.label))}</span><span class="roman">${esc(ti(s.roman))}</span></div>`+
    `<div class="why" title="${esc(tx(s.why||s.reason||''))}">${esc(why)}</div>`+
    `<div class="meta">${s.inKey?'':`<span class="out">${esc(key().messiaen?tx('εκτός συλλογής'):tx('εκτός κλίμακας'))}</span>`}<span class="origin" title="${esc(origin)}">${esc(origin)}</span><span class="motion">${esc(motionText(s.motion))}</span></div>`+
    `<div class="acts"><button type="button" data-act="hear" aria-label="${esc(tx('Άκου τη μετάβαση'))}" title="${esc(tx('Άκου τη μετάβαση ({0})',i+1))}">${ICON_PLAY}</button><button type="button" class="add" data-act="add" aria-label="${esc(tx('Πρόσθεσε'))}" title="${esc(tx('Πρόσθεσε μετά το {0}',tp(c.label)))}">${ICON_ADD}</button></div></li>`;}).join('');
  const l=land();$('styleNote').hidden=!l?.chordWarning;$('styleNote').textContent=l?.chordWarning?tx(l.chordWarning):'';
}
/* What stays and what moves, in the current language. */
function motionText(m){
  if(!m)return '';
  return [m.held.length?tx('κρατά {0}',m.held.map(T.name).join('·')):'',...m.moves.slice(0,2).map(x=>`${T.name(x.from)}→${T.name(x.to)} ${x.delta>0?'↑':'↓'}${Math.abs(x.delta)}`)].filter(Boolean).join(' · ');
}
function renderStrip(){
  const strip=$('strip');
  if(!state.steps.length){const p=stylePhrase();
    strip.innerHTML=`<span class="empty">${esc(tx('Κλικ στον κύκλο = άκου · 1 2 3 = άκου πρόταση · ⏎ = κράτα'))}</span>`+
      `<button type="button" class="phrase" data-act="phrase">${esc(tx('Ξεκίνα με μια φράση'))}<small>${esc(p?tp(p.name):tx('από τις πρώτες προτάσεις'))}</small></button>`;return;}
  strip.innerHTML=state.steps.map((s,i)=>{
    const inr=state.range&&i>=state.range[0]&&i<=state.range[1];
    return `<button type="button" class="step${i===state.sel?' sel':''}${inr?' inrange':''}" role="option" aria-selected="${i===state.sel}" draggable="true" data-i="${i}" style="--beats:${s.beats||4}" title="${esc(tx('{0} · {1} χτύποι · διπλό κλικ για νότες',tp(s.label),s.beats||4))}">`+
      `<span class="s">${esc(tp(s.label))}</span><span class="r">${esc(ti(romanOf(s)))}</span><span class="len">${s.beats||4}</span></button>`;}).join('');
  renderStripPlaying();
}
function renderStripPlaying(){document.querySelectorAll('.step').forEach(el=>el.classList.toggle('playing',Boolean(state.play)&&Number(el.dataset.i)===state.play.index));}
function scrollToSel(){const el=document.querySelector(`.step[data-i="${state.sel}"]`);el?.scrollIntoView?.({block:'nearest',inline:'nearest'});}
function renderTransport(){$('play').classList.toggle('on',Boolean(state.play));$('play').setAttribute('aria-label',tx(state.play?'Στοπ':'Αναπαραγωγή'));
  $('loop').setAttribute('aria-pressed',String(state.loop));$('bpm').value=String(state.bpm);
  $('undo').disabled=!undoStack.past.length;$('redo').disabled=!undoStack.future.length;}
function syncControls(){
  $('tonic').value=String(state.tonic);$('mode').value=state.mode;$('style').value=state.style;
  $('projectName').value=state.projectName;$('instrument').value=state.instrument;$('theme').value=state.theme;
  const l=land();document.documentElement.style.setProperty('--style',l?.color||'#c9c2ae');
  $('style').title=l?.sources?.length?tx('Πηγές: {0}',l.sources.map(x=>tx(x)).join(', ')):'';
}
function renderAnalysis(){
  if(state.view!=='analysis')return;
  $('analysisBody').innerHTML=A.html(projectData(),state.lang,{listen:true});
  for(const id of ['exportPdf','exportMidi'])$(id).disabled=!state.steps.length;
}
function refresh(){
  clampSel();syncControls();renderWheelAndCards();renderNow();renderPreview();renderStrip();renderTransport();renderAnalysis();renderPractice();
  if(state.editor>=0)renderEditor();
}
function renderWheelAndCards(){renderIntents();renderCards();renderWheel();renderMelody();}
/* Melody first: one octave of keys; the note sits near the top of the current chord. */
function renderMelody(){
  const on=state.melody===null?null:pc(state.melody),W=[0,2,4,5,7,9,11],B=[[1,0],[3,1],[6,3],[8,4],[10,5]],w=18;
  const keys=W.map((p,i)=>`<rect class="w${p===on?' on':''}" data-pc="${p}" x="${i*w}" y="0" width="${w-1}" height="26" rx="2"><title>${esc(T.name(p))}</title></rect>`).join('')+
    B.map(([p,i])=>`<rect class="b${p===on?' on':''}" data-pc="${p}" x="${i*w+w*.68}" y="0" width="${w*.62}" height="16" rx="1.5"><title>${esc(T.name(p))}</title></rect>`).join('');
  $('melody').innerHTML=`<span class="lbl" title="${esc(tx('Πάτα μια νότα: οι προτάσεις την κρατούν στην κορυφή.'))}">${esc(tx('Μελωδία'))}</span>`+
    `<svg class="octave" viewBox="0 0 126 27" role="group" aria-label="${esc(tx('Νότα μελωδίας'))}">${keys}</svg>`+
    (on===null?'':`<b class="mel-name">${esc(noteName(state.melody))}</b><button type="button" class="clear" data-act="no-melody" aria-label="${esc(tx('Χωρίς μελωδία'))}" title="${esc(tx('Χωρίς μελωδία'))} (esc)">×</button>`);
}
function setMelody(m,{quiet=false}={}){
  state.melody=Number.isInteger(m)?m:null;state.heard=-1;state.preview=null;
  renderPreview();renderWheelAndCards();renderNow();
  if(state.melody===null){status(tx('Χωρίς μελωδία.'));return;}
  if(!quiet)audition([state.melody],.8);status(tx('Μελωδία {0}: οι προτάσεις την κρατούν στην κορυφή.',noteName(state.melody)));
}
function melodyNear(p){const top=Math.max(...current().notes);return top-5+pc(p-(top-5));}

/* ------------------------------------------------------------ editor */
function openEditor(i=state.sel){if(i<0||!state.steps[i])return;state.editor=i;$('editor').hidden=false;renderEditor();placeEditor();}
/* The editor moves by its header, so the circle and the cards stay in view.
   The place is remembered; a double click on the header puts it back. */
let editorPos=null;try{editorPos=JSON.parse(localStorage.getItem('cl-editor-pos')||'null');}catch(_){}
function placeEditor(){
  const el=$('editor');
  if(!editorPos||el.hidden){Object.assign(el.style,{left:'',top:'',bottom:'',transform:''});return;}
  const r=el.getBoundingClientRect(),x=Math.max(8,Math.min(window.innerWidth-r.width-8,editorPos.x)),y=Math.max(8,Math.min(window.innerHeight-r.height-8,editorPos.y));
  Object.assign(el.style,{left:x+'px',top:y+'px',bottom:'auto',transform:'none'});
}
function dragEditor(e){
  const h=e.target.closest('#editor header');if(!h||e.target.closest('button')||e.button!==0)return;
  const el=$('editor'),r=el.getBoundingClientRect(),dx=e.clientX-r.left,dy=e.clientY-r.top;
  e.preventDefault();h.setPointerCapture?.(e.pointerId);el.classList.add('dragging');
  const move=ev=>{editorPos={x:Math.round(ev.clientX-dx),y:Math.round(ev.clientY-dy)};placeEditor();};
  const up=()=>{h.removeEventListener('pointermove',move);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);el.classList.remove('dragging');
    try{localStorage.setItem('cl-editor-pos',JSON.stringify(editorPos));}catch(_){}};
  h.addEventListener('pointermove',move);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up);
}
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
  const w_=k=>esc(tx(k));
  $('editor').innerHTML=`<header title="${w_('Σύρε για να το μετακινήσεις · διπλό κλικ: αρχική θέση')}"><span class="grip" aria-hidden="true"><svg viewBox="0 0 10 16"><circle cx="2.5" cy="3" r="1.4"/><circle cx="7.5" cy="3" r="1.4"/><circle cx="2.5" cy="8" r="1.4"/><circle cx="7.5" cy="8" r="1.4"/><circle cx="2.5" cy="13" r="1.4"/><circle cx="7.5" cy="13" r="1.4"/></svg></span><h2 id="editorTitle">${w_(tx('Βήμα {0}',i+1))}<span class="sym">${esc(tp(s.label))}</span></h2><button type="button" class="icon-button" data-ed="close" aria-label="${w_('Κλείσιμο')}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>`+
    `<svg class="keys" viewBox="0 0 900 93" role="group" aria-label="${w_('Πάτα πλήκτρα για να προσθέσεις ή να αφαιρέσεις νότες')}">${keys}</svg>`+
    `<div class="tools">`+
    `<div class="group"><span>${w_('Οκτάβα')}</span><button type="button" data-ed="oct-">−</button><button type="button" data-ed="oct+">+</button></div>`+
    `<div class="group"><span>${w_('Αναστροφή')}</span><button type="button" data-ed="inv-">↓</button><button type="button" data-ed="inv+">↑</button></div>`+
    `<div class="group"><span>${w_('Διάταξη')}</span><button type="button" data-ed="v-close">${w_('Κλειστή')}</button><button type="button" data-ed="v-open">${w_('Ανοιχτή')}</button><button type="button" data-ed="v-drop2">Drop 2</button></div>`+
    `<div class="group"><span>${w_('Χτύποι')}</span>${BEATS.map(b=>`<button type="button" class="${(s.beats||4)===b?'on':''}" data-ed="beats" data-b="${b}">${b}</button>`).join('')}</div>`+
    `<span class="spacer"></span><div class="group"><button type="button" data-ed="hear">${w_('▶ Άκου')}</button><button type="button" data-ed="delete">${w_('Αφαίρεση')}</button></div></div>`;
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
  const mess=/^messiaen/.test(state.mode),sc=S.byId(state.mode);
  // A scale also names its nearest church mode, which earlier versions read instead.
  const settings={tonic:state.tonic,mode:mess?'ionian':sc?sc.near:state.mode,scaleFamily:mess?'messiaen':sc?'scale':'diatonic',style:state.style,goal:state.intent,intent:state.intent,bpm:state.bpm};
  if(mess){settings.messiaenMode=Number(state.mode.split('-')[1]);settings.messiaenTrans=0;}
  if(sc)settings.scale=sc.id;
  return {format:'chord-lab-project',version:3,name:state.projectName,settings,
    sequence:state.steps.map(s=>{const row={root:s.root,quality:s.quality||'custom',label:s.label,notes:s.notes,beats:s.beats||4,custom:Boolean(s.custom)};if(s.sourceLabel)row.sourceLabel=String(s.sourceLabel).slice(0,179);return row;})};
}
function readProject(raw){
  const p=PS.normalize(raw),st=p.settings||{};
  const intents=N.INTENTS.map(x=>x.id);
  state.projectName=p.name||tx('Χωρίς τίτλο');
  state.tonic=Number.isInteger(st.tonic)?st.tonic:0;
  state.mode=st.scaleFamily==='messiaen'&&M.PATTERNS[st.messiaenMode]&&st.messiaenMode>1?'messiaen-'+st.messiaenMode:st.scaleFamily==='scale'&&S.byId(st.scale)?st.scale:(T.MODE[st.mode]?st.mode:'ionian');
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
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(KEY_PROJECT,JSON.stringify(projectData()));}catch(_){status(tx('Η τοπική αποθήκευση απέτυχε. Κράτα αντίγραφο JSON.'));}},250);}
function load(){
  for(const k of [KEY_PROJECT,'cl-v15-project','cl-v06-project']){
    let raw=null;try{raw=localStorage.getItem(k);}catch(_){return;}
    if(!raw)continue;
    try{readProject(JSON.parse(raw));if(k!==KEY_PROJECT)status(tx('Άνοιξε το έργο της προηγούμενης έκδοσης.'));return;}
    catch(_){try{localStorage.setItem('cl-v16-recovery-'+Date.now(),raw);}catch(__){}}
  }
}
function library(){try{const rows=JSON.parse(localStorage.getItem(KEY_LIBRARY)||'null');if(Array.isArray(rows))return rows;
  const old=JSON.parse(localStorage.getItem('cl-v15-library')||'[]');return Array.isArray(old)?old.filter(x=>x?.format==='chord-lab-project'):[];}catch(_){return [];}}
function writeLibrary(rows){try{localStorage.setItem(KEY_LIBRARY,JSON.stringify(rows.slice(-64)));}catch(_){status(tx('Η βιβλιοθήκη δεν αποθηκεύτηκε.'));}}
function renderLibrary(){
  const rows=library();
  $('library').innerHTML=rows.length?rows.map((p,i)=>`<li><button type="button" class="open" data-lib="${i}">${esc(p.name)} <small>· ${esc(tx('{0} βήματα',p.sequence?.length||0))}</small></button><button type="button" class="del" data-libdel="${i}" aria-label="${esc(tx('Διαγραφή {0}',p.name))}">×</button></li>`).join(''):`<li class="fine">${esc(tx('Καμία αποθηκευμένη σύνθεση.'))}</li>`;
}
function saveToLibrary(){const rows=library(),p=projectData(),i=rows.findIndex(x=>x.name===p.name);if(i>=0)rows[i]=p;else rows.push(p);writeLibrary(rows);renderLibrary();status(tx('Αποθηκεύτηκε «{0}».',p.name));}
function openFromLibrary(i){const p=library()[i];if(!p)return;stop();remember();try{readProject(p);refresh();save();status(tx('Άνοιξε «{0}».',state.projectName));}catch(e){status(tx('Δεν άνοιξε: {0}',e.message));}}
function newProject(){stop();remember();state.steps=[];state.sel=-1;state.range=null;state.preview=null;state.projectName=tx('Χωρίς τίτλο');closeEditor();refresh();save();status(tx('Νέα σύνθεση. ⌘Z επαναφέρει την προηγούμενη.'));}
function exportJson(){download(JSON.stringify(projectData(),null,2),`${slug(state.projectName)}.json`,'application/json');status(tx('Αποθηκεύτηκε αντίγραφο JSON.'));}
async function importJson(file){
  if(!file)return;if(file.size>2e6){status(tx('Το αρχείο είναι πολύ μεγάλο.'));return;}
  try{const raw=JSON.parse(await file.text());PS.normalize(raw);stop();remember();readProject(raw);refresh();save();status(tx('Άνοιξε «{0}» με {1} βήματα.',state.projectName,state.steps.length));}
  catch(e){status(tx('Δεν άνοιξε το αρχείο: {0}',e.message));}
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
function exportMidi(){if(!state.steps.length){status(tx('Πρόσθεσε πρώτα συγχορδίες.'));return;}download(midiBytes(),`${slug(state.projectName)}-${today()}.mid`,'audio/midi');status(tx('Εξαγωγή MIDI: ένα κομμάτι, οι ακριβείς νότες και διάρκειες.'));}
async function exportPdf(){
  if(!state.steps.length){status(tx('Πρόσθεσε πρώτα συγχορδίες.'));return;}
  const html=R.makeHTML(projectData(),state.lang),name=`${slug(state.projectName)}-${today()}.pdf`;
  if(desktop?.exportPdf){try{const r=await desktop.exportPdf(html,name);status(r?.canceled?tx('Η εξαγωγή PDF ακυρώθηκε.'):tx('Αποθηκεύτηκε το PDF: {0}',r?.path||name));}catch(e){status(tx('Δεν δημιουργήθηκε PDF: {0}',e.message));}return;}
  const w=window.open('','_blank');if(!w){status(tx('Επίτρεψε τα αναδυόμενα παράθυρα για το PDF.'));return;}
  w.document.open();w.document.write(html);w.document.close();w.focus();status(tx('Άνοιξε η ανάλυση: Εκτύπωση → Αποθήκευση ως PDF.'));
}

/* ------------------------------------------------------------ views, settings, lab */
function setView(v){state.view=v;
  // Keys belong to the view, not to the tab that was clicked.
  if(document.activeElement?.closest?.('.views'))document.activeElement.blur();
  // The bar would show the answers: it waits while you practise.
  $('app').classList.toggle('practicing',v==='practice');if(v!=='compose')closeEditor();
  for(const [id,btn] of [['compose','viewCompose'],['analysis','viewAnalysis'],['practice','viewPractice']]){
    $(id).hidden=v!==id;$(btn).classList.toggle('on',v===id);$(btn).setAttribute('aria-pressed',String(v===id));}
  if(v==='analysis')renderAnalysis();
  if(v==='practice'){stop();renderPractice(true);}}

/* ------------------------------------------------------------ ear practice */
const practice={right:0,total:0,last:null};
function practiceRecords(){try{const r=JSON.parse(localStorage.getItem(KEY_PRACTICE)||'{}');return r&&typeof r==='object'?r:{};}catch(_){return {};}}
function savePractice(recs){
  const ids=Object.keys(recs);
  // Keep the store small: the questions due furthest away go first.
  if(ids.length>3000)ids.sort((a,b)=>recs[a].due-recs[b].due).slice(3000).forEach(id=>delete recs[id]);
  try{localStorage.setItem(KEY_PRACTICE,JSON.stringify(recs));}catch(_){}
}
function quizValid(){const it=state.quiz?.item;return Boolean(it&&state.steps[it.i]&&E.itemId(it.kind,state.steps[it.i-1],state.steps[it.i],keyOpts())===it.id);}
function nextQuestion(anyway=false){
  const {item,next}=E.pick(E.items(state.steps,keyOpts()),practiceRecords(),Date.now(),practice.last,anyway);
  state.quiz=item?{item,q:E.question(item,state.steps,keyOpts()),chosen:null}:{item:null,next};
  renderPractice();if(item)playQuiz();
}
/* Questions are heard as plain blocks: the ear follows the harmony, not the pattern. */
function playQuiz(){const it=state.quiz?.item;if(it)transition(state.steps[it.i-1].notes,state.steps[it.i].notes,false);}
function answerQuiz(k){
  const z=state.quiz;if(!z?.item||z.chosen!==null||z.q.options[k]===undefined)return;
  z.chosen=z.q.options[k];const ok=z.chosen===z.q.answer;
  practice.total++;if(ok)practice.right++;practice.last=z.item.id;
  const recs=practiceRecords();recs[z.item.id]=E.grade(recs[z.item.id],ok,Date.now());z.box=recs[z.item.id].box;savePractice(recs);
  renderPractice();
}
function inTime(ms){
  const m=Math.max(1,Math.round(ms/6e4)),h=Math.round(ms/36e5),d=Math.round(ms/864e5);
  if(m<60)return m===1?tx('1 λεπτό'):tx('{0} λεπτά',m);
  if(h<24)return h===1?tx('1 ώρα'):tx('{0} ώρες',h);
  return d===1?tx('1 μέρα'):tx('{0} μέρες',d);
}
const PROMPT={degree:'Ποια βαθμίδα ήρθε;',bass:'Το μπάσο ανέβηκε, κατέβηκε ή έμεινε;',top:'Η πάνω φωνή ανέβηκε, κατέβηκε ή έμεινε;'};
const MOVE={up:'Ανέβηκε',down:'Κατέβηκε',same:'Έμεινε'};
function renderPractice(fresh=false){
  if(state.view!=='practice')return;
  const body=$('practiceBody'),head=`<span class="overline">${esc(tx('ΕΞΑΣΚΗΣΗ ΑΥΤΙΟΥ'))} · ${esc(tx('από τη σύνθεσή σου'))}</span>`;
  if(state.steps.length<2){body.innerHTML=`<div class="analysis-empty">${head}<h2>${esc(tx('Το αυτί μαθαίνει από τη μουσική σου.'))}</h2><p>${esc(tx('Γράψε τουλάχιστον δύο βήματα στη Σύνθεση. Εδώ θα ακούς τις μεταβάσεις σου και θα απαντάς τι άκουσες.'))}</p></div>`;return;}
  if(fresh||!state.quiz||(state.quiz.item&&!quizValid()))return nextQuestion();
  const now=Date.now(),list=E.items(state.steps,keyOpts()),recs=practiceRecords(),waiting=list.filter(it=>(recs[it.id]?.due||0)<=now).length;
  const stats=`<p class="stats">${esc(tx('Σωστές: {0} από {1}',practice.right,practice.total))} · ${esc(tx('Περιμένουν: {0}',waiting))}</p>`;
  const z=state.quiz;
  if(!z.item){body.innerHTML=`${head}<h2>${esc(tx('Τίποτα δεν περιμένει επανάληψη.'))}</h2><p class="detail">${esc(tx('Η επόμενη σε {0}.',inTime(z.next-now)))}</p><div class="quiz-actions"><button type="button" class="btn-primary" data-q="anyway">${esc(tx('Συνέχισε ούτως ή άλλως'))}</button></div>${stats}`;return;}
  const it=z.item,q=z.q,a=state.steps[it.i-1],b=state.steps[it.i],done=z.chosen!==null,ok=done&&z.chosen===q.answer;
  const label=o=>q.kind==='degree'?ti(o):tx(MOVE[o]);
  const context=q.kind==='degree'?tx('Από {0} προς ;',ti(q.from)):tx('Βήματα {0} → {1}',it.i,it.i+1);
  const detail=q.kind==='degree'?`${ti(q.from)} → ${ti(q.answer)}`:q.delta?tx('{0} → {1}, {2} ημιτόνια',noteName(q.from),noteName(q.to),Math.abs(q.delta)):tx('{0}, ίδια νότα',noteName(q.from));
  body.innerHTML=`${head}<h2>${esc(tx(PROMPT[q.kind]))}</h2><p class="detail">${esc(context)}</p>`+
    `<div class="quiz-options">${q.options.map((o,k)=>`<button type="button" class="opt${done?o===q.answer?' right':o===z.chosen?' wrong':'':''}" data-q="opt" data-k="${k}"${done?' disabled':''}><span class="kbd">${k+1}</span>${esc(label(o))}</button>`).join('')}</div>`+
    (done?`<p class="verdict ${ok?'ok':'no'}">${esc(ok?tx('Σωστό.'):tx('Όχι. Ήταν: {0}.',label(q.answer)))} <span>${esc(ok?tx('Ξανά σε {0}.',inTime(E.WAIT[z.box])):tx('Θα ξανάρθει σε λίγο.'))}</span></p>`+
      `<p class="detail">${esc(tp(a.label))} → ${esc(tp(b.label))} · ${esc(detail)}</p>`:'')+
    `<div class="quiz-actions"><button type="button" class="btn-ghost" data-q="replay">${esc(tx('▶ Άκου ξανά'))}<span class="kbd">R</span></button>`+
    (done?`<button type="button" class="btn-primary" data-q="next">${esc(tx('Επόμενη'))}<span class="kbd">⏎</span></button>`:'')+`</div>${stats}`;
}
function openSettings(){$('settings').hidden=false;$('scrim').hidden=false;renderLibrary();$('settings').focus();}
function closeSettings(){
  // Keys go back to the composition, not to a hidden control of the sheet.
  if($('settings').contains(document.activeElement))document.activeElement.blur();
  $('settings').hidden=true;$('scrim').hidden=true;}
function labPost(type){try{$('oldFrame').contentWindow?.postMessage({type:'chord-studio:legacy-'+type},'*');}catch(_){}}
function openLab(){stop();closeSettings();$('oldOverlay').hidden=false;const f=$('oldFrame');if(f.dataset.loaded!=='1'){f.dataset.loaded='1';f.src='legacy/index.html';}else labPost('resume');}
function closeLab(){labPost('pause');$('oldOverlay').hidden=true;}
const KEYS=[['1 · 2 · 3','άκου την πρόταση μέσα στη φράση'],['⏎','πρόσθεσε ό,τι άκουσες'],['Space','αναπαραγωγή / στοπ'],['← →','προηγούμενο / επόμενο βήμα'],['⇧ ← →','επιλογή τμήματος'],['⌥ ← →','μετακίνηση βήματος'],['[ ]','πιο σύντομο / πιο μακρύ'],['L','επανάληψη'],['E','νότες του βήματος'],['⌫','αφαίρεση βήματος'],['⌘D','διπλασιασμός'],['⌘Z · ⇧⌘Z','αναίρεση · επαναφορά'],['⌘S','αποθήκευση στη βιβλιοθήκη'],['⌘1 · ⌘2 · ⌘3','Σύνθεση · Ανάλυση · Εξάσκηση'],['1–4 · R · ⏎','Εξάσκηση: απάντηση · ξανά · επόμενη'],['Esc','άκυρο / κλείσιμο']];

/* ------------------------------------------------------------ input */
function addHeardOrPreview(){
  if(state.heard>=0&&state.suggestions[state.heard])return insert(state.suggestions[state.heard],{sourceLabel:state.suggestions[state.heard].originLabel});
  if(state.preview)return insert(state.preview,{sourceLabel:state.preview.source==='midi'?'Είσοδος MIDI':'Κύκλος πέμπτων',custom:state.preview.source==='midi'});
  if(!state.steps.length)return insert(startChord(),{sourceLabel:'Αφετηρία'});
}
function hear(i){const s=state.suggestions[i];if(!s)return;state.heard=i;state.preview=null;renderPreview();renderWheel();renderNow();
  document.querySelectorAll('.card').forEach(el=>el.classList.toggle('heard',Number(el.dataset.i)===i));
  const lead=inPhrase(s);status(tx('Ακούς: {0}',[...lead,s].map(x=>tp(x.label)).join(' → ')));}
/* A step of the Analysis: the move into it, or the first chord alone. */
function hearStep(i){
  const s=state.steps[i];if(!s)return;const prev=state.steps[i-1];
  if(prev){transition(prev.notes,s.notes);status(tx('Ακούς: {0}',tp(prev.label)+' → '+tp(s.label)));}
  else{audition(s.notes);status(tx('Ακούς: {0}',tp(s.label)));}
  document.querySelectorAll('#analysisBody tr[data-step]').forEach(r=>r.classList.toggle('on',Number(r.dataset.step)===i));
}
/* Cards and their numbers on the wheel point at each other. */
function lightUp(list){
  const on=new Set(list),slots=new Set(list.map(i=>state.suggestions[i]?slotKey(state.suggestions[i]):''));
  document.querySelectorAll('.card').forEach(el=>el.classList.toggle('hot',on.has(Number(el.dataset.i))));
  document.querySelectorAll('#wheel .marker').forEach(el=>el.classList.toggle('hot',on.has(Number(el.dataset.i))));
  document.querySelectorAll('#wheel .seg').forEach(el=>el.classList.toggle('hot',slots.has(el.dataset.ring+':'+el.dataset.i)));
}
/* A starting phrase in the style; turn moves to the next path after each use. */
let phraseTurn=0;
function stylePhrase(){return N.phrase({...keyOpts(),style:state.style,start:startChord(),turn:phraseTurn});}
function startPhrase(){
  if(state.steps.length)return;
  const p=stylePhrase();let chords;
  if(p){chords=p.chords;phraseTurn++;}
  else{chords=[startChord()];
    // No path for this style or collection: the first proposal, three times.
    // In-scale proposals first, so the phrase stays in the chosen scale.
    while(chords.length<4){const list=N.suggest({current:chords[chords.length-1],history:chords,...keyOpts(),style:state.style,intent:state.intent}),c=list.find(x=>x.inKey)||list[0];if(!c)break;chords.push(c);}}
  stop();remember();
  state.steps=chords.map((c,i)=>makeStep(c,{beats:4,sourceLabel:p?p.name:i?c.originLabel:'Αφετηρία'}));
  state.sel=state.steps.length-1;state.preview=null;state.heard=-1;state.range=null;
  refresh();save();playRange();
  status(p?`${tp(p.name)}: ${tx(p.why)}`:tx('Φράση από τις πρώτες προτάσεις: {0}.',state.steps.map(x=>tp(x.label)).join(' → ')));
}
function onKey(e){
  const t=e.target,typing=t.closest?.('input,select,textarea');
  const cmd=e.metaKey||e.ctrlKey;
  if(e.key==='Escape'){
    if(!$('oldOverlay').hidden){closeLab();return;}
    if(!$('settings').hidden){closeSettings();return;}
    if(state.editor>=0){closeEditor();return;}
    if(state.preview||state.heard>=0){state.preview=null;state.heard=-1;state.ext='triad';renderPreview();renderWheelAndCards();renderNow();return;}
    if(state.melody!==null){setMelody(null);return;}
    if(state.range){state.range=null;renderStrip();return;}
    stop();return;
  }
  if(typing||!$('oldOverlay').hidden)return;
  // In the desktop app these come from the menu; do not run them twice.
  if(cmd&&desktop?.hasMenu&&['z','s','d','e','1','2','3',','].includes(e.key.toLowerCase()))return;
  if(cmd&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if(cmd&&e.key.toLowerCase()==='s'){e.preventDefault();saveToLibrary();return;}
  if(cmd&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();return;}
  if(cmd&&e.key==='1'){e.preventDefault();setView('compose');return;}
  if(cmd&&e.key==='2'){e.preventDefault();setView('analysis');return;}
  if(cmd&&e.key==='3'){e.preventDefault();setView('practice');return;}
  if(cmd&&e.key===','){e.preventDefault();openSettings();return;}
  if(cmd||e.altKey&&!['ArrowLeft','ArrowRight'].includes(e.key))return;
  if(t.closest?.('.seg')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();t.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}
  if(t.closest?.('button')&&(e.key==='Enter'||e.key===' '))return;
  // Ear practice has its own keys; the composition does not change from here.
  if(state.view==='practice'){
    if(/^[1-4]$/.test(e.key))answerQuiz(Number(e.key)-1);
    else if(e.key==='Enter'&&state.quiz&&(state.quiz.chosen!==null||!state.quiz.item))nextQuestion(!state.quiz.item);
    else if(e.key===' '||e.key.toLowerCase()==='r')playQuiz();
    else return;
    e.preventDefault();return;
  }
  // The Analysis only reads the piece: Space plays, nothing edits it unseen.
  if(state.view==='analysis'&&e.key!==' ')return;
  if(['1','2','3'].includes(e.key)){e.preventDefault();hear(Number(e.key)-1);return;}
  if(e.key==='Enter'){e.preventDefault();addHeardOrPreview();return;}
  if(e.key===' '){e.preventDefault();togglePlay();return;}
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const d=e.key==='ArrowLeft'?-1:1;
    if(e.altKey){if(state.sel>=0){const to=state.sel+d;if(to>=0&&to<state.steps.length)move(state.sel,d>0?to+1:to);}return;}
    if(e.shiftKey){const end=state.range?(state.range[0]===state.sel?state.range[1]:state.range[0]):state.sel;select(end+d,{extend:true,play:false});return;}
    select(state.sel+d);return;}
  if(e.key==='['){stepBeats(-1);return;}
  if(e.key===']'){stepBeats(1);return;}
  if(e.key.toLowerCase()==='l'){state.loop=!state.loop;renderTransport();if(state.play){stop(false);playRange();}status(state.loop?tx('Επανάληψη ενεργή.'):tx('Επανάληψη ανενεργή.'));return;}
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
    case 'view-practice':return setView('practice');
    case 'settings':return openSettings();
    case 'theory-lab':return openLab();
  }
}

/* ------------------------------------------------------------ language */
/* Static text in index.html keeps its Greek original, so switching back works. */
const ORIGINAL=new WeakMap();
const DYNAMIC='#practiceBody,#pattern,#timbre,#rule,#melody,#wheel,#now,#preview,#cards,#intents,#strip,#editor,#analysisBody,#library,#keysHelp,#status,#midiOut,#mode,#style,#tonic,#lang,#oldFrame,#midiConnect';
function translateStatic(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  for(let n=walker.currentNode;n;n=walker.nextNode()){
    const el=n.nodeType===3?n.parentElement:n;
    if(!el)continue;
    // A dynamic container keeps its own labels static; what is inside it is rendered.
    if(n.nodeType===3?el.closest(DYNAMIC):el.parentElement?.closest(DYNAMIC))continue;
    if(n.nodeType===3){
      const orig=ORIGINAL.has(n)?ORIGINAL.get(n):n.nodeValue;
      if(!GREEK.test(orig))continue;
      ORIGINAL.set(n,orig);const t=orig.trim();n.nodeValue=orig.replace(t,tx(t));
    }else for(const a of ['title','aria-label','placeholder']){
      if(!n.hasAttribute(a))continue;
      let store=ORIGINAL.get(n);if(!store){store={};ORIGINAL.set(n,store);}
      if(!(a in store))store[a]=n.getAttribute(a);
      if(GREEK.test(store[a]))n.setAttribute(a,tx(store[a]));
    }
  }
  if(!state.midi.access){$('midiConnect').textContent=tx('Σύνδεση MIDI');$('midiOut').options[0].textContent=tx('Εσωτερικός ήχος');}
}
function buildSoundSelects(){
  const [p,t]=styleSound(),name=(list,id)=>tx(list.find(x=>x[0]===id)[1]);
  $('pattern').innerHTML=`<option value="auto">${esc(tx('Από το ύφος · {0}',name(PATTERNS,p)))}</option>`+PATTERNS.map(([v,l])=>`<option value="${v}">${esc(tx(l))}</option>`).join('');
  $('timbre').innerHTML=`<option value="auto">${esc(tx('Από το ύφος · {0}',name(TIMBRES,t)))}</option>`+TIMBRES.map(([v,l])=>`<option value="${v}">${esc(tx(l))}</option>`).join('');
  $('pattern').value=state.pattern;$('timbre').value=state.timbre;
}
function buildModeSelect(){
  const opt=v=>`<option value="${v}">${esc(modeLabel(v))}</option>`,group=(label,ids)=>`<optgroup label="${esc(label)}">${ids.map(opt).join('')}</optgroup>`;
  const of=g=>S.SCALES.filter(s=>s.group===g).map(s=>s.id),l=land(),top=STYLE_MODES[state.style];
  $('mode').innerHTML=(top&&l?group(tx('Για το ύφος: {0}',tx(l.name)),top):'')+
    group(tx('Διατονικοί'),MODES.slice(0,7).map(x=>x[0]))+group(tx('Ελάσσονες'),of('minor'))+group(tx('Τζαζ'),of('jazz'))+
    group(tx('Ελληνικοί δρόμοι · συγκερασμένοι'),of('greek'))+group(tx('Πεντατονικές και ολοτονική'),of('colour'))+
    group(tx('Messiaen · συμμετρικοί'),MODES.slice(7).map(x=>x[0]));
  $('mode').value=state.mode;
}
function buildSelects(){
  buildModeSelect();
  // Genres in a listening order: from functional harmony to colour, then traditions.
  const ORDER=['classical','takemitsu','stravinsky','glass','morricone','hadjidakis','byzantine','jazz','electronic'];
  $('style').innerHTML=`<option value="free">${esc(tx('Ελεύθερο'))}</option>`+ORDER.map(id=>L.LANDSCAPES.find(l=>l.id===id)).filter(Boolean).map(l=>`<option value="${l.id}">${esc(tx(l.name))}</option>`).join('');
  $('keysHelp').innerHTML=KEYS.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(tx(v))}</dd>`).join('');
  buildSoundSelects();
  $('rule').innerHTML=RULE_LIST.map(([v,l])=>`<option value="${v}">${esc(tx(l))}</option>`).join('');$('rule').value=state.rule;
}
function applyLanguage(){
  document.documentElement.lang=state.lang;
  if(['Χωρίς τίτλο','Untitled'].includes(state.projectName))state.projectName=tx('Χωρίς τίτλο');
  translateStatic();buildSelects();$('lang').value=state.lang;
  desktop?.setLanguage?.(state.lang);
  state.midi.access?.onstatechange?.();
}
function setLanguage(lang){
  state.lang=lang==='en'?'en':'el';
  try{localStorage.setItem('cl-lang',state.lang);}catch(_){}
  applyLanguage();refresh();if(!$('settings').hidden)renderLibrary();save();
  status(tx('Η διεπαφή είναι στα ελληνικά.'));
}

/* ------------------------------------------------------------ setup */
function setup(){
  try{state.midi.sound=localStorage.getItem('cl-midi-sound')!=='off';}catch(_){}
  try{state.theme=localStorage.getItem('cl-theme')||'ivory';state.instrument=localStorage.getItem('cl-instrument')||'piano';
    state.pattern=localStorage.getItem('cl-pattern')||'auto';state.timbre=localStorage.getItem('cl-timbre')||'auto';}catch(_){}
  if(!['auto',...PATTERNS.map(x=>x[0])].includes(state.pattern))state.pattern='auto';
  if(!['auto',...TIMBRES.map(x=>x[0])].includes(state.timbre))state.timbre='auto';
  if(!['ivory','slate','dark'].includes(state.theme))state.theme='ivory';
  document.body.dataset.theme=state.theme;
  if(desktop?.platform==='darwin')document.body.classList.add('mac-desktop');
  let storedLang=null;try{storedLang=localStorage.getItem('cl-lang');}catch(_){}
  state.lang=I.detect(storedLang,navigator.languages||[navigator.language]);
  $('tonic').innerHTML=T.N.map((n,i)=>`<option value="${i}">${n}</option>`).join('');
  load();
  applyLanguage();
  $('tonic').addEventListener('change',e=>{setContext('tonic',Number(e.target.value));status(tx('Κέντρο {0}.',T.name(state.tonic)));});
  $('mode').addEventListener('change',e=>{setContext('mode',e.target.value);const sc=S.byId(state.mode);
    status(sc?.group==='greek'?tx('{0}: συγκερασμένη απόδοση, όπως στο μπουζούκι. Στη βυζαντινή ψαλτική και στα μακάμ τα διαστήματα διαφέρουν.',tx(sc.name)):tx('Τρόπος: {0}.',modeLabel(state.mode)));});
  $('style').addEventListener('change',e=>{setContext('style',e.target.value);buildSoundSelects();buildModeSelect();const l=land();
    status((l?`${tx(l.name)}: ${tx(l.short)}.${l.sources?.length?' '+tx('Πηγές: {0}.',l.sources.map(x=>tx(x)).join(', ')):''}`:tx('Ελεύθερο: προτάσεις μόνο από την τονικότητα.'))+' '+tx('Ήχος: {0}, {1}.',tx(PATTERNS.find(x=>x[0]===soundPattern())[1]).toLowerCase(),tx(TIMBRES.find(x=>x[0]===soundTimbre())[1]).toLowerCase()));});
  $('viewCompose').addEventListener('click',()=>setView('compose'));
  $('viewAnalysis').addEventListener('click',()=>setView('analysis'));
  $('viewPractice').addEventListener('click',()=>setView('practice'));
  $('practiceBody').addEventListener('click',e=>{const b=e.target.closest('[data-q]');if(!b)return;const a=b.dataset.q;
    if(a==='opt')answerQuiz(Number(b.dataset.k));if(a==='next')nextQuestion();if(a==='anyway')nextQuestion(true);if(a==='replay')playQuiz();});
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
    if(a==='dismiss'){state.preview=null;state.ext='triad';renderPreview();renderWheel();renderNow();}});
  $('intents').addEventListener('click',e=>{const b=e.target.closest('[data-intent]');if(!b)return;state.intent=b.dataset.intent;state.heard=-1;renderWheelAndCards();renderNow();save();
    status(tx(N.INTENTS.find(x=>x.id===state.intent).label)+': '+tx(N.INTENTS.find(x=>x.id===state.intent).hint)+'.');});
  $('cards').addEventListener('click',e=>{const li=e.target.closest('.card');if(!li)return;const i=Number(li.dataset.i);
    if(e.target.closest('[data-act="add"]')){const s=state.suggestions[i];insert(s,{sourceLabel:s.originLabel});return;}
    hear(i);});
  $('melody').addEventListener('click',e=>{if(e.target.closest('[data-act="no-melody"]'))return setMelody(null);
    const k=e.target.closest('[data-pc]');if(!k)return;const p=Number(k.dataset.pc);
    setMelody(state.melody!==null&&pc(state.melody)===p?null:melodyNear(p));});
  $('rule').addEventListener('change',e=>{state.rule=e.target.value;state.heard=-1;renderWheelAndCards();renderNow();
    status(state.rule?tx('Κανόνας: {0}. Οι τρεις προτάσεις τον τηρούν.',tx(RULE_LIST.find(x=>x[0]===state.rule)[1])):tx('Χωρίς κανόνα.'));});
  $('cards').addEventListener('mouseover',e=>{const li=e.target.closest('.card');lightUp(li?[Number(li.dataset.i)]:[]);});
  $('cards').addEventListener('mouseleave',()=>lightUp([]));
  $('wheel').addEventListener('mouseover',e=>{const g=e.target.closest('.seg'),k=g?g.dataset.ring+':'+g.dataset.i:'';
    lightUp(g?state.suggestions.map((c,i)=>slotKey(c)===k?i:-1).filter(i=>i>=0):[]);});
  $('wheel').addEventListener('mouseleave',()=>lightUp([]));
  $('cards').addEventListener('dblclick',e=>{const li=e.target.closest('.card');if(!li||e.target.closest('button'))return;const s=state.suggestions[Number(li.dataset.i)];if(s)insert(s,{sourceLabel:s.originLabel});});
  const strip=$('strip');let drag=-1;
  strip.addEventListener('click',e=>{if(e.target.closest('[data-act="phrase"]'))return startPhrase();const b=e.target.closest('.step');if(b)select(Number(b.dataset.i),{extend:e.shiftKey});});
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
  $('editor').addEventListener('pointerdown',dragEditor);
  $('editor').addEventListener('dblclick',e=>{if(!e.target.closest('header')||e.target.closest('button'))return;editorPos=null;try{localStorage.removeItem('cl-editor-pos');}catch(_){}placeEditor();});
  window.addEventListener('resize',()=>{if(state.editor>=0)placeEditor();});
  $('projectName').addEventListener('change',e=>{state.projectName=(e.target.value||tx('Χωρίς τίτλο')).slice(0,80);save();});
  $('newProject').addEventListener('click',newProject);
  $('saveLibrary').addEventListener('click',saveToLibrary);
  $('importJson').addEventListener('click',()=>$('importFile').click());
  $('importFile').addEventListener('change',async e=>{await importJson(e.target.files?.[0]);e.target.value='';});
  $('library').addEventListener('click',e=>{const o=e.target.closest('[data-lib]');if(o){openFromLibrary(Number(o.dataset.lib));closeSettings();return;}
    const d=e.target.closest('[data-libdel]');if(d){const rows=library();const [gone]=rows.splice(Number(d.dataset.libdel),1);writeLibrary(rows);renderLibrary();status(tx('Διαγράφηκε «{0}» από τη βιβλιοθήκη.',gone?.name));}});
  $('midiConnect').addEventListener('click',()=>connectMidi(false));
  $('midiSound').checked=state.midi.sound;
  $('midiSound').addEventListener('change',e=>{state.midi.sound=e.target.checked;try{localStorage.setItem('cl-midi-sound',state.midi.sound?'on':'off');}catch(_){}
    if(!state.midi.sound)for(const k of [...state.midi.live.keys()])Sound.release(k);
    status(state.midi.sound?tx('Τα πλήκτρα MIDI ακούγονται από την εφαρμογή.'):tx('Τα πλήκτρα MIDI δεν ακούγονται από την εφαρμογή: για όργανα με δικό τους ήχο.'));});
  $('midiOut').addEventListener('change',e=>{midiPanic();state.midi.outId=e.target.value;status(state.midi.outId?tx('Ο ήχος πηγαίνει και στην έξοδο MIDI.'):tx('Μόνο εσωτερικός ήχος.'));});
  for(const id of ['pattern','timbre'])$(id).addEventListener('change',e=>{state[id]=e.target.value;try{localStorage.setItem('cl-'+id,state[id]);}catch(_){}
    // One bar of the current chord in the new pattern and sound.
    if(state.play){stop(false);playRange();}else{stop(false);Sound.stopAll();perform(current().notes,0,Math.max(1.6,240/state.bpm));}});
  $('instrument').addEventListener('change',e=>{state.instrument=e.target.value;try{localStorage.setItem('cl-instrument',state.instrument);}catch(_){}renderNow();});
  $('theme').addEventListener('change',e=>{state.theme=e.target.value;document.body.dataset.theme=state.theme;try{localStorage.setItem('cl-theme',state.theme);}catch(_){}});
  $('lang').addEventListener('change',e=>setLanguage(e.target.value));
  $('openLab').addEventListener('click',openLab);
  $('closeLab').addEventListener('click',closeLab);
  $('oldFrame').addEventListener('load',()=>labPost($('oldOverlay').hidden?'pause':'resume'));
  $('analysisBody').addEventListener('click',e=>{const t=e.target.closest('[data-step]');if(t)hearStep(Number(t.dataset.step));});
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
window.ChordStudio={midiMessage:data=>onMidi({data}),state,refresh,insert,select,undo,redo,projectData,readProject,midiBytes,hear,hearStep,startPhrase,addHeardOrPreview,previewFromWheel,setBeats,playRange,stop,onCommand,setLanguage};
})();
