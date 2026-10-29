const assert=require('node:assert/strict'),G=require('../src/guitar-engine.js');
for(const notes of [[60,64,67],[60,63,67],[60,64,67,71],[57,60,64,67],[62,65,69,72]]){
  const s=G.suggest(notes,notes[0]%12);
  assert(s,'Shape exists');assert.equal(s.frets.length,6);assert.equal(s.missing.length,0, 'Triads and simple sevenths covered');
  const played=s.frets.filter(f=>f>=0);
  assert(played.length>=3);const active=s.frets.filter(f=>f>0);assert(!active.length||Math.max(...active)-Math.min(...active)<=4);
  const sound=new Set(s.frets.map((f,i)=>f>=0?G.pc(G.TUNING[i]+f):null));
  for(const n of notes)assert(sound.has(G.pc(n)));
}
for(const chromatic of [[60,61,62,63,64,65,66,67]]){
 const s=G.suggest(chromatic,0);assert(s&&s.missing.length>0,'Six-string instrument signals omitted notes');
}
console.log('Guitar: 6 strings standard tuning, coverage, fret span, omitted-note warning passed');
