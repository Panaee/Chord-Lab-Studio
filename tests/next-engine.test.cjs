const assert=require('node:assert/strict');
const N=require('../src/next-engine.js');
const L=require('../legacy/landscapes.js');
const T=require('../src/theory-map.js');

const C={root:0,quality:'major',notes:[48,52,55,60]};
const Am={root:9,quality:'minor',notes:[45,52,57,60]};
const key={tonic:0,mode:'ionian'};
const styles=L.LANDSCAPES.map(l=>l.id);
const greek=/[α-ωάέήίόύώ]/i;

// Every style shapes at least two of the three proposals.
const triples=new Set();
for(const style of styles)for(const intent of N.INTENTS.map(i=>i.id)){
  const out=N.suggest({current:C,history:[C],...key,style,intent});
  assert.equal(out.length,3,`${style}/${intent}: three proposals`);
  assert(out.filter(x=>x.origin==='style').length>=2,`${style}/${intent}: two from the style`);
  assert.equal(new Set(out.map(x=>N.sig(x.pcs)+'/'+Math.min(...x.notes))).size,3,'three different chords');
  for(const x of out){
    assert.match(x.label,/^[A-G][♯♭]?/,'a chord symbol, not a colour name');
    assert(!greek.test(x.label.replace(' · ίσον','')),`symbol without prose: ${x.label}`);
    assert(x.notes.length>=1&&x.notes.length<=12);
    assert(x.notes.every(n=>Number.isInteger(n)&&n>=21&&n<=108),`playable range: ${x.notes}`);
    if(x.family==='minor'||x.family==='dim')assert.match(x.roman,/^[♭♯]?(i|ii|iii|iv|v|vi|vii)/,`lower case for ${x.label}: ${x.roman}`);
    if(x.family==='major'||x.family==='dom')assert.match(x.roman,/^[♭♯]?(I|II|III|IV|V|VI|VII)/,`upper case for ${x.label}: ${x.roman}`);
  }
  if(intent==='motion')triples.add(out.map(x=>x.label).join('|'));
}
assert(triples.size>=8,`styles lead to different proposals (${triples.size}/9)`);

// Without a style, proposals come from the key and the moves of one voice.
const free=N.suggest({current:C,history:[C],...key,style:'free',intent:'motion'});
assert(free.every(x=>x.origin==='key'));
assert.deepEqual(free.map(x=>x.label).slice(0,2),['G','F']);

// Style paths continue from your history: Morricone I → ♭VII → IV.
const Bb={root:10,quality:'major',notes:[46,50,53,58]};
const morr=N.suggest({current:Bb,history:[C,Bb],...key,style:'morricone',intent:'motion'});
assert.equal(morr[0].label,'F');assert.match(morr[0].originLabel,/I–♭VII–IV–I/);
// Jazz: ii7 → V7.
const Dm7={root:2,quality:'m7',notes:[50,53,57,60]};
assert(N.suggest({current:Dm7,history:[Dm7],...key,style:'jazz',intent:'motion'}).some(x=>/^G7/.test(x.label)&&x.roman==='V7'));
// Glass: Am → F/A, one note moves and the bass stays.
const glass=N.suggest({current:Am,history:[Am],tonic:9,mode:'aeolian',style:'glass',intent:'motion'});
assert.equal(glass[0].label,'F/A');assert.equal(Math.min(...glass[0].notes),45);assert.equal(glass[0].motion.moves.length,1);
// Byzantine keeps the ison: no thirds anywhere.
for(const x of N.suggest({current:C,history:[C],...key,style:'byzantine',intent:'motion'})){
  const rel=x.pcs.map(p=>T.mod(p-x.root));assert(!rel.includes(3)&&!rel.includes(4),`no third in ${x.label}`);
}
// Stravinsky's second layer reads as a polychord.
assert(N.suggest({current:C,history:[C],...key,style:'stravinsky',intent:'motion'}).some(x=>/ \+ /.test(x.label)));

// Voice leading: common tones stay, the voice count is kept.
const vl=N.voiceLead([48,52,55,60],[5,9,0],5);
assert.equal(vl.length,4);assert(vl.includes(60),'C is held');assert.equal(Math.min(...vl)%12,5,'F in the bass');
const mv=N.motion([48,52,55,60],N.voiceLead([48,52,55,60],[7,11,2],7));
assert(mv.cost<=9,`smooth move to G: ${mv.cost}`);

// The wheel: rings, sevenths from the key, slots.
assert.equal(N.chordFor(7,'major',{...key,extension:'7'}).label.replace(/\/.*/,''),'G7');
assert.equal(N.chordFor(9,'minor',{...key,extension:'7'}).roman,'vi7');
assert.equal(N.chordFor(11,'dim',{...key,extension:'7'}).quality,'m7b5');
assert.deepEqual(N.wheelSlot({root:9,notes:[57,60,64]}),{ring:'minor',index:0});
assert.deepEqual(N.wheelSlot({root:11,notes:[59,62,65]}),{ring:'dim',index:2});
assert.deepEqual(N.wheelSlot({root:7,notes:[55,59,62,65]}),{ring:'major',index:1});
// The key's own chords: seven diatonic triads, or the Messiaen collection's.
assert.equal(N.keyChords(N.keyOf(key)).length,7);
const m2=N.keyOf({tonic:0,mode:'messiaen-2'});assert.equal(m2.pcs.length,8);
assert(N.keyChords(m2).every(ch=>ch.pcs.every(p=>m2.pcs.includes(p))));
// Recognition keeps the played notes and names them.
const rec=N.recognise([52,55,60],key);assert.equal(rec.label,'C/E');assert.deepEqual(rec.notes,[52,55,60]);

// The bass moves by octaves, never off its note (Dm high → E7 kept E in the bass).
const e7=N.voiceLead([62,65,69,74],[4,8,11,2],4);assert.equal(Math.min(...e7)%12,4,'E in the bass');assert(Math.min(...e7)<=62);

// Starting phrases: the style's paths on the tonic, four chords first, voice count kept.
const startAm={root:9,notes:[57,60,64,69]};
const mor=N.phrase({tonic:9,mode:'aeolian',style:'morricone',start:startAm});
assert.equal(mor.name,'Κινηματογραφική μουσική · i–♭VII–♭VI–V');assert.deepEqual(mor.chords.map(c=>c.label),['Am','G','F','E']);
assert(mor.chords.every(c=>c.notes.length===4));
assert.equal(N.phrase({tonic:9,mode:'aeolian',style:'morricone',start:startAm,turn:1}).name,'Κινηματογραφική μουσική · i–♭II–V7–i (ναπολιτάνικη)');
const startC={root:0,notes:[48,52,55,60]};
assert.deepEqual(N.phrase({tonic:0,mode:'ionian',style:'jazz',start:startC}).chords.map(c=>c.label),['Cmaj7','Am7','Dm7','G7']);
assert.deepEqual(N.phrase({tonic:0,mode:'ionian',style:'byzantine',start:startC}).chords.map(c=>c.notes.length),[2,2,2],'ison');
assert.equal(N.phrase({tonic:0,mode:'ionian',style:'free',start:startC}),null);
assert.equal(N.phrase({tonic:0,mode:'messiaen-3',style:'morricone',start:startC}),null);
for(const l of L.LANDSCAPES)for(const [tonic,mode,start] of [[0,'ionian',startC],[9,'aeolian',startAm]]){
  const p=N.phrase({tonic,mode,style:l.id,start});assert(p&&p.chords.length>=3,l.id+' '+mode);
  assert.equal(p.chords[0].root,tonic,'starts on the tonic');
  for(const c of p.chords)assert(Math.min(...c.notes)>=28&&Math.max(...c.notes)<=100,`${l.id}: ${c.label} in range`);
}

// Melody first: every proposal holds the note, with the note on top.
for(const style of ['free',...L.LANDSCAPES.map(l=>l.id)])for(const m of [64,66,70]){
  const r=N.suggest({current:startC,history:[startC],tonic:0,mode:'ionian',style,intent:'motion',melody:m});
  assert(r.length>=1,`${style} harmonises ${m}`);
  for(const c of r){assert.equal(Math.max(...c.notes)%12,m%12,`${style}: ${c.label} has ${m} on top`);assert(Math.min(...c.notes)<Math.max(...c.notes)-4);}
}
assert.deepEqual(N.underMelody([48,52,55,60],[0,4,7],64),[48,52,55,60,64]);
assert.deepEqual(N.underMelody([48,52,55,60,67],[0,4,7],64),[48,52,55,60,64],'voices above the note go below it');
// Rules: every proposal keeps the rule, in every style.
for(const style of ['free',...L.LANDSCAPES.map(l=>l.id)])for(const rule of Object.keys(N.RULES)){
  const r=N.suggest({current:startC,history:[startC],tonic:0,mode:'ionian',style,intent:'motion',rule});
  assert(r.length===3,`${style}/${rule}: three proposals (${r.length})`);
  const s={...startC,pcs:[0,4,7]},key=N.keyOf({tonic:0,mode:'ionian'});
  for(const c of r)assert(N.RULES[rule](c,s,key),`${style}/${rule}: ${c.label}`);
}
const down=N.suggest({current:startC,history:[startC],tonic:0,mode:'ionian',style:'free',intent:'motion',rule:'bass-down'});
assert(down.every(c=>Math.min(...c.notes)>=43),'the bass walks down by the nearest chord tone');
// A suspension: its resolution is among the proposals, named as such.
for(const [notes,res] of [[[48,53,55,60],'C'],[[45,50,52,57],'Am']]){
  const cur={root:notes[0]%12,notes},r=N.suggest({current:cur,history:[cur],tonic:0,mode:'ionian',style:'free',intent:'motion'});
  const hit=r.find(x=>x.label===res);assert(hit&&hit.originLabel==='Λύση της καθυστέρησης',`sus4 → ${res}: ${r.map(x=>x.label)}`);
}
console.log(`NextChords: 9 styles × 6 intents shape ≥2 of 3 proposals (${triples.size} distinct sets), symbols and Roman case, path continuation, Glass bass, Byzantine ison, voice leading, wheel slots, starting phrases, melody on top, rules passed`);
