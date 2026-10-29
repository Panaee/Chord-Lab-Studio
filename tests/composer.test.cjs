const assert=require('node:assert/strict');
const T=require('../src/theory-map');const P=require('../src/path-engine');const C=require('../src/core');
const n=P.chord(0,'major');assert.deepEqual(n.pcs,[0,4,7]);
const x=P.candidates(n,{style:'takemitsu',tonic:0,mode:'ionian',goal:'suspension'});
assert.equal(x.length,4);assert(x.some(c=>c.source==='palette'));
assert(x.some(c=>['transform','degree'].includes(c.source)));
for(const c of x){assert(c.pcs.length>=2);assert(c.notes.every(Number.isFinite));assert(c.notes.every(m=>m>=0&&m<128));assert(c.explain.summary.length>10);assert(c.why.length);}
assert.equal(T.transformations(T.triad(0,'major')).length,3);
for(const g of P.GOALS){const res=P.candidates(n,{style:'morricone',goal:g.id});assert.equal(res.length,4);}
let modes=['ionian','dorian','phrygian','lydian','mixolydian','aeolian','locrian'];for(const mode of modes){const degree=T.chordDegrees(0,mode);assert.equal(degree.length,7);}
// Voice leading is an explainable transformation, not a random position.
const r=P.compare(P.chord(0,'major'),P.chord(9,'minor'));
assert.deepEqual(r.common,[0,4]);assert.equal(r.cost,2);
let midi=C.makeMidi([{midi:[60,64,67]},{midi:[57,60,64]}],84);assert.equal(Buffer.from(midi.subarray(0,4)).toString(),'MThd');
let different=P.candidates(n,{style:'takemitsu',goal:'tension'}).map(c=>c.pcs.join(','));
assert.notDeepEqual(x.map(c=>c.pcs.join(',')),different,'Changing expression should change the path shortlist');
console.log('Composer Paths: theory, composer/style, goal, motion and MIDI checks passed');
