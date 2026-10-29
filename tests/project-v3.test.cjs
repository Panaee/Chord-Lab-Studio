const assert=require('node:assert/strict');
const PS=require('../src/project-store.js');
const A=require('../src/studio-analysis.js');
const R=require('../src/remarkable-report.js');

const v1={format:'chord-lab-project',version:1,settings:{tonic:0,mode:'ionian',style:'free',goal:'suspension',bpm:84},sequence:[{root:0,quality:'major',label:'C',notes:[48,52,55]}]};
const v2={...v1,version:2,name:'Παλιό',sequence:[...v1.sequence,{root:7,quality:'7',label:'G7',notes:[43,47,50,53]}]};
const v3={format:'chord-lab-project',version:3,name:'Νέο',settings:{tonic:9,mode:'aeolian',style:'glass',goal:'motion',intent:'motion',bpm:96},
  sequence:[{root:9,quality:'minor',label:'Am',notes:[45,52,57,60],beats:8},{root:5,quality:'major',label:'F/A',notes:[45,53,57,60],beats:2,custom:true}]};

// Older files open and come out as version 3; durations are optional.
for(const p of [v1,v2,v3])assert.equal(PS.normalize(p).version,3);
assert.equal(PS.normalize(v2).sequence[1].beats,undefined);
assert.deepEqual(PS.normalize(v3).sequence.map(s=>s.beats),[8,2]);
assert.equal(PS.normalize(v3).settings.intent,'motion');
for(const beats of [0,17,2.5,'4'])assert.throws(()=>PS.normalize({...v3,sequence:[{...v3.sequence[0],beats}]}),/διάρκεια/);
assert.throws(()=>PS.normalize({...v3,version:4}),/Μη υποστηριζόμενο/);

// Analysis and the PDF report follow the real durations.
const m=A.model(v3);assert.equal(m.totalBeats,10);
assert.match(A.html(v3),/<td>8<\/td>/);
assert.match(A.html(v3),/ΑΝΑΛΥΣΗ/);
// A custom chord keeps the symbol the studio stored for its notes.
assert.equal(A.analyzeChord(v3.sequence[1],v3.settings).name,'F/A');
assert.match(R.makeHTML(v3),/10 χτύποι/);
assert.match(R.makeHTML(v3),/<h1>Νέο<\/h1>/);
console.log('Project v3: v1/v2 migration, per-step beats with validation, analysis totals, stored custom symbols and report title passed');
