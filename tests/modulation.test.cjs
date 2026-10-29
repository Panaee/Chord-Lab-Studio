const assert=require('node:assert/strict');
const M=require('../src/modulation-engine.js'),F=require('../src/fifths-engine.js');
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
for(let i=0;i<12;i++)for(const minor of [false,true]){
  const origin=F.at(i,minor),dests=M.destinations(origin);
  assert.equal(dests.length,5);
  assert.equal(new Set(dests.map(d=>M.identity(d.key))).size,5,'five distinct close keys');
  for(const d of dests){
    assert(d.shared===6||d.shared===7,'adjacent signatures share six pitches; relatives share seven');
    assert(d.pivots.length>0,`At least one common triad between ${origin.name} and ${d.key.name}`);
    for(const p of d.pivots){
      assert(!p.roman,'no ambiguous unqualified Roman analysis');
      const scores=M.rankPivots(d.pivots, null);
      assert(scores.every(q=>q.sourceRoman&&q.targetRoman));
      const route=M.path(origin,d.key,p);
      assert.equal(route.steps.length,3);
      assert.equal(route.steps[0].root,p.root);
      assert.equal(route.steps[1].root,(d.key.root+7)%12);
      assert.equal(route.steps[2].root,d.key.root);
      assert.equal(route.steps[2].quality,d.key.minor?'minor':'major');
    }
  }
}
const c=F.at(0,false),g=F.at(1,false),am=F.at(0,true);
assert.equal(M.overlap(c,g),6);assert.equal(M.overlap(c,am),7);
assert(M.commonChords(c,g).some(p=>p.label==='Am'&&p.sourceRoman==='vi'&&p.targetRoman==='ii'));
const amPivot=M.commonChords(c,g).find(p=>p.label==='Am');
const example=M.path(c,g,amPivot);
assert.deepEqual(example.steps.map(x=>x.label),['Am','D7','G']);
assert.deepEqual(example.degrees,['vi → ii','V7 / G','I']);
console.log('Modulation: 24 origins × 5 close destinations × pivots, Roman renaming and bridge → V7 → arrival passed');
