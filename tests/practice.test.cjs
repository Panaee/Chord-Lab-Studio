/* Ear practice: questions from the piece, answers that match the notes, and
   Leitner scheduling. */
const assert=require('node:assert/strict');
const E=require('../src/practice-engine.js');
const steps=[{root:0,notes:[48,52,55,60]},{root:5,notes:[53,57,60,65]},{root:7,notes:[55,59,62,65]},{root:0,notes:[48,52,55,60]}];
const key={tonic:0,mode:'ionian'};
const list=E.items(steps,key);
assert.equal(list.length,9,'three moves × three kinds');
assert.equal(E.items(steps,{tonic:0,mode:'messiaen-2'}).length,6,'no degrees in a Messiaen collection');
// Degree: the answer is among four distinct options; sevenths drop to the plain degree.
const rnd=(()=>{let x=7;return ()=>(x=(x*16807)%2147483647)/2147483647;})();
const deg=E.question(list.find(it=>it.kind==='degree'&&it.i===2),steps,key,rnd);
assert.equal(deg.answer,'V');assert.equal(deg.from,'IV');
assert.equal(new Set(deg.options).size,4);assert(deg.options.includes('V'));
assert.equal(E.plain('V7'),'V');assert.equal(E.plain('viiø'),'vii°');assert.equal(E.plain('IVmaj7'),'IV');
// Bass and top voice follow the real notes.
const bass=E.question(list.find(it=>it.kind==='bass'&&it.i===1),steps,key);assert.equal(bass.answer,'up');assert.equal(bass.delta,5);
const top=E.question(list.find(it=>it.kind==='top'&&it.i===3),steps,key);assert.equal(top.answer,'down');
const same=E.question({kind:'bass',i:1},[{root:0,notes:[48,52,55]},{root:9,notes:[48,52,57]}],key);assert.equal(same.answer,'same');
// Leitner: a right answer waits longer each time; a wrong one is due again now.
const now=1e12;let r=E.grade(null,true,now);assert.deepEqual(r,{box:1,due:now+E.WAIT[1]});
r=E.grade(r,true,now);assert.equal(r.box,2);assert.equal(r.due,now+E.WAIT[2]);
assert.deepEqual(E.grade(r,false,now),{box:0,due:now});
// Pick: due items first, not the same one twice in a row; nothing due gives the next time.
const records={};let last=null;const seen=new Set();
for(let k=0;k<9;k++){const {item}=E.pick(list,records,now,last);assert(item);assert.notEqual(item.id,last);seen.add(item.id);records[item.id]=E.grade(records[item.id],true,now);last=item.id;}
assert.equal(seen.size,9,'every question once');
const none=E.pick(list,records,now,last);assert.equal(none.item,null);assert.equal(none.next,now+E.WAIT[1]);
assert(E.pick(list,records,now,last,true).item,'practice anyway');
records[list[4].id]=E.grade(records[list[4].id],false,now);assert.equal(E.pick(list,records,now,null).item.id,list[4].id,'a wrong answer comes back');
// Ids follow the notes and the key, so an edited step is a new question.
assert.notEqual(E.itemId('bass',steps[0],steps[1],key),E.itemId('bass',steps[0],steps[2],key));
console.log('Ear practice: 3 kinds per move, degree options, real bass/top motion, Leitner boxes, due order, no repeats passed');
