const assert=require('node:assert/strict');
const M=require('../src/messiaen-engine.js');
const T=require('../src/theory-map.js');
const P=require('../src/path-engine.js');
const expected={1:2,2:3,3:4,4:6,5:6,6:6,7:6};
for(let i=1;i<=7;i++){
 const patterns=new Set();
 for(let t=0;t<12;t++){let col=M.collection(i,0,t);patterns.add(col.pitchClasses.join(','));
   const set=new Set(col.pitchClasses);
   const proposals=M.suggestions(P.chord(0,'major'),{messiaenMode:i,tonic:0,transposition:t,goal:'mystery',style:'takemitsu'});
   assert.equal(proposals.length,4,`M${i} must have 4 chord proposals`);
   for(const candidate of proposals){assert.ok(candidate.pcs.every(pc=>set.has(pc)),`M${i} candidate outside chosen collection`);assert.match(candidate.theory,/Messiaen|M\d/);assert.ok(candidate.harmony.roman.startsWith('M'+i));}
 }
 assert.equal(patterns.size,expected[i]);
 const source=M.collection(i);assert.equal(source.offsets.length,source.pitchClasses.length);assert.equal(source.intervals.reduce((a,b)=>a+b),12);
}
// Known test: octatonic C C# Eb E F# G A Bb
assert.deepEqual(M.collection(2).pitchClasses,[0,1,3,4,6,7,9,10]);
assert.equal(M.collection(1).pitchClasses.join(','),'0,2,4,6,8,10');
console.log('Messiaen modes: all 7 modes, unique transpositions, pitch-set membership, four grounded suggestions passed');
