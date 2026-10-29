'use strict';
const assert=require('node:assert/strict');
const P=require('../src/path-engine.js'),H=require('../src/harmonic-context.js'),M=require('../src/messiaen-engine.js');
const A=require('../src/studio-analysis.js'),G=require('../src/guitar-engine.js'),C=require('../src/core.js'),R=require('../src/remarkable-report.js');
const T=require('../src/theory-map.js'),F=require('../src/fifths-engine.js');

assert.equal(H.context(P.chord(7,'7'),0).functionName,'δεσπόζουσα');
assert.equal(H.context(P.chord(7,'minor'),0).functionName,'','Chromatic Gm is not a C-major dominant');
assert.equal(H.context(P.chord(0,'sus2'),0).functionName,'','A root without the defining third cannot establish the tonic triad');
assert.equal(H.context(P.chord(2,'major'),0).functionName,'','Chromatic II needs context before assigning function');
assert.equal(H.context(P.chord(2,'minor'),0).functionName,'προδεσπόζουσα');
assert.equal(H.context(P.chord(8,'major'),0,'aeolian').roman,'♭VI');
assert.equal(H.context(P.chord(6,'dim'),0,'lydian').roman,'♯iv°');
assert.equal(H.context(P.chord(1,'major'),0,'phrygian').roman,'♭II');
assert.match(H.context(P.chord(6,'dim'),0,'lydian').keyName,/Lydian/);
for(const mode of Object.keys(T.MODE)){
 const triads=F.degrees(0,mode),sevenths=F.degrees(0,mode,true),oldTriads=T.chordDegrees(0,mode);
 for(let i=0;i<7;i++){
  assert.equal(triads[i].roman,H.context(triads[i],0,mode).roman,'Wheel degrees and analysis use the same modal accidentals');
  assert.equal(oldTriads[i].roman,triads[i].roman,'TheoryMap retains the same degree convention');
  assert.equal(sevenths[i].roman,H.context(sevenths[i],0,mode).roman,'Seventh chords keep modal root alterations');
 }
}
const doubled=P.chord(0,'major',[48,60,64,67]);
assert.doesNotThrow(()=>P.voiceNear(doubled,P.chord(9,'minor',[45,57,60,64])));

const low=P.chord(0,'major',[48,52,55]),high=P.chord(0,'major',[72,76,79]);
const octave=A.transition(low,high);
assert.equal(octave.cost,72,'Octave shifts use the actual MIDI movement');
assert.deepEqual(octave.pairs.map(p=>p.delta),[24,24,24]);
assert.deepEqual(octave.common,[0,4,7]);assert.deepEqual(octave.held,[]);
const remove=A.transition(P.chord(0,'major',[60,64,67]),P.chord(0,'major',[60,67]));
assert.deepEqual(remove.removed,[64]);assert.equal(remove.cost,0);
const add=A.transition(P.chord(0,'major',[60,67]),P.chord(0,'major',[60,64,67]));
assert.deepEqual(add.added,[64]);assert.equal(add.cost,0);
const before=structuredClone(low);A.transition(low,high);assert.deepEqual(low,before,'Analysis must not rewrite stored notes');
assert.match(A.analyzeChord(P.chord(0,'major',[64,67,72])).inversion,/1η αναστροφή/);
assert.match(A.analyzeChord(P.chord(7,'7',[65,67,71,74])).inversion,/3η αναστροφή/);
const inconsistent={root:0,quality:'major',label:'C (old metadata)',notes:[63,67,72]};
const corrected=A.analyzeChord(inconsistent,{tonic:0,mode:'ionian'});
assert.equal(corrected.harmonic.roman,'i');assert.equal(corrected.quality,'Ελάσσων τριάδα');
assert.match(corrected.inversion,/1η αναστροφή/);assert.equal(corrected.chord.label,inconsistent.label,'Preserve original metadata for review');
assert.deepEqual(inconsistent.notes,[63,67,72]);
const borrowing=A.analyzeChord(P.chord(5,'minor'),{tonic:0,mode:'ionian'});
assert(borrowing.modalRelations.some(x=>/Aeolian/.test(x)),'Fm can be read as borrowing from parallel C minor');
assert.match(A.html({settings:{tonic:0,mode:'ionian'},sequence:[P.chord(5,'minor')]}),/Πιθανός modal δανεισμός/);
const cadence=A.transition(P.chord(2,'7'),P.chord(7,'major'));
assert.equal(cadence.cadence.targetRoot,7);assert.match(cadence.cadence.text,/δεν τεκμηριώνει από μόνη της μετατροπία/);
assert.equal(A.transition(P.chord(2,'minor'),P.chord(7,'major')).cadence,null,'Minor seventh motion alone is not a dominant cadence');
assert.equal(A.model({sequence:[],settings:{}}).chords.length,0);
assert.match(A.html({sequence:[],settings:{}}),/θεωρία ξεκινά/);

const options={tonic:0,mode:'ionian',style:'morricone',goal:'suspension',limit:3};
const now=P.chord(0,'major');
const fresh=H.suggestions(now,options),history=[P.chord(5,'major'),P.chord(5,'major')];
const contextual=H.suggestions(now,{...options,history});
assert.notDeepEqual(fresh.map(c=>c.pcs),contextual.map(c=>c.pcs),'Recent chain history changes the shortlist');
assert.deepEqual(contextual,H.suggestions(now,{...options,history}),'No random proposals');
const f=P.chord(5,'major'),comparison=P.compare(now,f);
assert(P.scoreCandidate(now,f,comparison,{...options,history}).score<P.scoreCandidate(now,f,comparison,options).score);
for(let i=1;i<=7;i++){
 const col=M.collection(i,0,0),proposals=M.suggestions(now,{...options,messiaenMode:i,history});
 assert.equal(proposals.length,3);
 for(const ch of proposals)assert(ch.pcs.every(p=>col.pitchClasses.includes(p)));
}

for(let root=0;root<12;root++)for(const quality of ['major','minor','maj7','m7']){
 const chord=P.chord(root,quality),shape=G.suggest(chord.notes,root);
 assert(shape&&shape.fingerEstimate<=4,'Practical four-finger shape');
 const fretted=shape.frets.filter(f=>f>0);
 assert(!fretted.length||Math.max(...fretted)-Math.min(...fretted)<=3,'All frets fit the visible four-fret diagram');
 assert.equal(shape.missing.length,0,'Ordinary triads and sevenths retain all pitch classes');
 for(let i=0;i<6;i++)if(shape.frets[i]>=0)assert(chord.pcs.includes(G.pc(G.TUNING[i]+shape.frets[i])));
}
assert.equal(G.fingerCount([1,3,3,2,1,1]),3,'F major barre');
assert.equal(G.fingerCount([-1,0,2,2,1,0]),2,'Am can use a partial barre across D and G');
assert.equal(G.fingerCount([2,0,2,0,2,0]),3,'Open strings prevent a continuous barre');

const project={format:'chord-lab-project',version:2,settings:{tonic:0,mode:'ionian',style:'morricone',goal:'nostalgia',bpm:100},sequence:[low,high,P.chord(7,'7')]};
const model=A.model(project),report=R.makeHTML(project);
assert.equal(model.chords.length,3);assert.equal(model.chords[1].comparison.cost,72);
assert.match(report,/Πίνακας σύνθεσης/);assert.match(report,/C3 · E3 · G3/);assert.match(report,/C5 · E5 · G5/);
assert.match(report,/72 ημιτόνια/);assert.match(report,/Συνθετική ευρετική/);assert.match(report,/δεν αποδεικνύει ότι έγινε μετατροπία/);
const malicious=structuredClone(project);malicious.sequence[0].label='<script>alert(1)</script>';
assert(!A.html(malicious).includes('<script>'));assert(!R.makeHTML(malicious).includes('<script>'));

// Parse the SMF, checking exact voices/timing instead of a header-only smoke test.
const bytes=C.makeMidi(project.sequence.map(ch=>({midi:ch.notes})),100);
assert.equal(Buffer.from(bytes.slice(0,4)).toString(),'MThd');
assert.equal((bytes[12]<<8)|bytes[13],480);
let pos=22,tick=0;const events=[];
const variable=()=>{let value=0,b;do{b=bytes[pos++];value=(value<<7)|(b&127);}while(b&128);return value;};
while(pos<bytes.length){
 tick+=variable();const status=bytes[pos++];
 if(status===0xff){const type=bytes[pos++],length=variable(),data=[...bytes.slice(pos,pos+length)];pos+=length;events.push({tick,type,data});}
 else{const pitch=bytes[pos++],velocity=bytes[pos++];events.push({tick,status,pitch,velocity});}
}
const ons=events.filter(e=>e.status===0x90),offs=events.filter(e=>e.status===0x80);
assert.deepEqual(ons.map(e=>e.pitch),project.sequence.flatMap(c=>c.notes));
let index=0;
project.sequence.forEach((ch,i)=>{for(const pitch of ch.notes){assert.equal(ons[index].tick,i*1920);assert.equal(offs[index].tick,i*1920+1860);index++;}});
assert.deepEqual(events.find(e=>e.type===0x51).data,[9,39,192],'100 BPM is 600000 microseconds per beat');
assert.deepEqual(events.find(e=>e.type===0x58).data,[4,2,24,8],'4/4 time signature');
assert.equal(events.find(e=>e.type===0x2f).tick,project.sequence.length*1920,'Track retains the full final four-beat measure');
// Independent exhaustive assignment checks preserve the old optimal tie order.
const subsets=(xs,n)=>n===0?[[]]:xs.flatMap((x,i)=>subsets(xs.slice(i+1),n-1).map(rest=>[x,...rest]));
function bruteMotion(a,b){let best=null;function walk(i,rest,pairs,cost){if(i===a.length){if(!best||cost<best.cost)best={cost,pairs};return;}rest.forEach((to,j)=>{let delta=(to-a[i]+12)%12;if(delta>6)delta-=12;walk(i+1,rest.filter((_,k)=>j!==k),[...pairs,{from:a[i],to,delta}],cost+Math.abs(delta));});}walk(0,b,[],0);return {...best,common:best.pairs.filter(p=>p.delta===0).length};}
for(let size=1;size<=4;size++)for(const a of subsets([0,1,4,6,7,10],size))for(const b of subsets([0,1,4,6,7,10],size))assert.deepEqual(T.motion({pcs:a},{pcs:b}),bruteMotion(a,b));
const began=Date.now(),dense=T.motion({pcs:Array.from({length:12},(_,i)=>i)},{pcs:Array.from({length:12},(_,i)=>(i+6)%12)});
assert.equal(dense.cost,0);assert.equal(dense.common,12);assert(Date.now()-began<1000,'Dense twelve-pitch clusters must not trigger factorial search');
console.log('Studio music: real-octave voice assignment, functions, chain history, seven Messiaen modes, guitar feasibility, live report and parsed MIDI passed');
