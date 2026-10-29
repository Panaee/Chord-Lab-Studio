const assert=require('node:assert/strict');
const H=require('../src/harmonic-context.js');
const P=require('../src/path-engine.js');
const F=require('../src/fifths-engine.js');
const start=P.chord(0,'major');
function list(tonic,mode='ionian',style='takemitsu',goal='suspension'){
 return H.suggestions(start,{tonic,mode,style,goal,limit:4});
}
const c=list(0),g=list(7),d=list(2);
assert.equal(c.length,4);assert.equal(g.length,4);
assert.notDeepEqual(g.map(x=>x.label),c.map(x=>x.label),'wheel click must really change suggestions');
assert.notDeepEqual(d.map(x=>x.label),g.map(x=>x.label));
assert.equal(g[0].root,7,'new key tonic first, when different from current chord');
assert.equal(g[0].harmony.roman,'I');
assert.equal(H.context(P.chord(0,'major'),7).roman,'IV');
assert.equal(H.context(P.chord(7,'7'),0).roman,'V7');
assert.equal(H.context(P.chord(9,'minor'),0).roman,'vi');
assert.equal(H.context(P.chord(5,'major'),7).roman,'♭VII');
assert.equal(H.context(P.chord(9,'minor'),9,'aeolian').roman,'i');
assert.equal(H.context(P.chord(11,'dim'),0).roman,'vii°');
assert.equal(H.context(P.chord(2,'minor'),0).roman,'ii');
assert.equal(H.context(P.chord(2,'major'),0).roman,'II');
assert.equal(H.context(P.chord(0,'major'),7).inScale,true);
assert.equal(H.context(P.chord(5,'major'),7).inScale,false);
for(const mode of ['ionian','aeolian']){
 for(let tonic=0;tonic<12;tonic++){
  for(const style of ['free','takemitsu','classical','morricone']){
   for(const goal of P.GOALS.map(x=>x.id)){
    const options=list(tonic,mode,style,goal);
    assert.equal(options.length,4,`${tonic} ${mode} ${style} ${goal}`);
    assert(options.every(c=>!!c.harmony?.roman && Array.isArray(c.notes)&&c.notes.length),'all options must have notes and explicit roman degrees');
    assert.equal(new Set(options.map(c=>c.pcs.join(','))).size,4,'no duplicates');
    const diatonic=options.filter(c=>c.source==='circle-degree');
    assert(diatonic.length>=2,'at least two key-dependent suggestions');
    const inScaleSet=new Set(F.degrees(tonic,mode,false).map(d=>d.root));
    assert(diatonic.every(c=>inScaleSet.has(c.root)),'diatonic sources must belong to selected key');
   }
  }
 }
}
console.log('Harmonic context: 24 tonal centers × 4 styles × 6 goals, Roman labels, chromatic flags and key-dependent recommendations passed');
