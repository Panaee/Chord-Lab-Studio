/* Greek and English: every phrase the interface, the engine, the analysis or
   the PDF can show has an English translation, and English output carries no
   Greek letters. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const I=require('../src/i18n.js');
const L=require('../legacy/landscapes.js'),T=require('../src/theory-map.js'),P=require('../src/path-engine.js'),M=require('../src/messiaen-engine.js');
const N=require('../src/next-engine.js'),A=require('../src/studio-analysis.js'),R=require('../src/remarkable-report.js');
const greek=/[α-ωΑ-Ωά-ώ]/;
const has=s=>Object.prototype.hasOwnProperty.call(I.EN,s);

// Landscape texts shown on cards and in the analysis.
for(const l of L.LANDSCAPES){
  for(const s of [l.name,l.short,l.idea,l.chordWarning].filter(Boolean))if(greek.test(s))assert(has(s),s);
  for(const c of l.colors)for(const s of [c.name,c.why])if(greek.test(s))assert(has(s),s);
  for(const p of l.progressions)for(const s of [p.name,p.why])if(greek.test(s))assert(has(s),s);
  for(const a of l.addColor||[])for(const s of [a.name,a.why])if(greek.test(s))assert(has(s),s);
}
for(const g of P.GOALS)assert(has(g.label)&&has(g.intro),g.id);
for(const k of Object.keys(T.MODE))assert(has(T.MODE[k].label),k);
for(const n of Object.keys(M.PATTERNS))assert(!greek.test(M.PATTERNS[n].name)||has(M.PATTERNS[n].name),M.PATTERNS[n].name);
for(const x of N.INTENTS)assert(has(x.label)&&has(x.hint),x.id);
// Every Greek string literal in the engine (reasons, origins).
const engine=fs.readFileSync(path.join(__dirname,'../src/next-engine.js'),'utf8');
for(const m of engine.matchAll(/'([^'\n]*[α-ωΑ-Ωά-ώ][^'\n]*)'/g)){const t=m[1].replace(/^ · /,'').trim();assert(has(t)||has(t+' {0}')||/ · /.test(m[1]),'engine: '+m[1]);}
// Every tx('…') in the studio has a translation.
const studio=fs.readFileSync(path.join(__dirname,'../src/studio.js'),'utf8');
for(const m of studio.matchAll(/tx\('([^'\n]+)'/g))if(greek.test(m[1]))assert(has(m[1]),'studio: '+m[1]);

// Placeholders, labels joined by « · », inline names.
assert.equal(I.L('en','Μπήκε {0} στο βήμα {1}.','Am7',3),'Added Am7 at step 3.');
assert.equal(I.L('el','Μπήκε {0} στο βήμα {1}.','Am7',3),'Μπήκε Am7 στο βήμα 3.');
assert.equal(I.parts('en','Glass · Κάν\' το αρπέζ'),'Glass · Make it an arpeggio');
assert.equal(I.inline('en','D Dorian / Δώριος'),'D Dorian');
assert.equal(I.detect(null,['en-GB']),'en');assert.equal(I.detect(null,['el-GR']),'el');assert.equal(I.detect('en',['el']),'en');

// English suggestions, analysis and PDF carry no Greek.
const C={root:0,quality:'major',notes:[48,52,55,60]};
for(const style of ['free',...L.LANDSCAPES.map(l=>l.id)])for(const intent of N.INTENTS.map(x=>x.id)){
  for(const s of N.suggest({current:C,history:[C],tonic:0,mode:'ionian',style,intent})){
    const why=I.L('en',s.reason&&(s.origin!=='style'||s.fit)?s.reason:(s.why||s.reason||''));
    for(const t of [why,I.parts('en',s.originLabel),I.parts('en',s.label),I.inline('en',s.roman)])assert(!greek.test(t),`${style}/${intent}: ${t}`);
  }
}
// A melody note and every rule, in English too.
for(const opts of [{melody:64},{melody:66},...Object.keys(N.RULES).map(rule=>({rule}))])for(const style of ['free','takemitsu','stravinsky','byzantine']){
  for(const s of N.suggest({current:C,history:[C],tonic:0,mode:'ionian',style,intent:'motion',...opts})){
    const why=I.L('en',s.reason&&(s.origin!=='style'||s.fit)?s.reason:(s.why||s.reason||''));
    for(const t of [why,I.parts('en',s.originLabel),I.parts('en',s.label)])assert(!greek.test(t),`${style}/${JSON.stringify(opts)}: ${t}`);
  }
}
const project=(settings)=>({format:'chord-lab-project',version:3,name:'Test',settings,sequence:[
  {root:0,quality:'major',label:'C',notes:[48,52,55,60]},{root:7,quality:'7',label:'G7',notes:[47,53,55,62]},{root:0,quality:'major',label:'C/E',notes:[52,55,60,64],beats:2},
  {root:2,quality:'custom',label:'Dm(9)(11)',notes:[50,52,55,65]},{root:1,quality:'major',label:'D♭',notes:[49,53,56]},{root:0,quality:'custom',label:'C · ίσον',notes:[48,60]}]});
for(const settings of [{tonic:0,mode:'ionian',style:'takemitsu',goal:'motion',bpm:84},{tonic:9,mode:'aeolian',style:'free',goal:'release',bpm:70},
  {tonic:2,mode:'dorian',style:'jazz',goal:'tension',bpm:120},{tonic:0,mode:'ionian',scaleFamily:'messiaen',messiaenMode:2,messiaenTrans:0,style:'stravinsky',goal:'mystery',bpm:90}]){
  const p=project(settings);
  const a=A.html(p,'en').replace(/<[^>]+>/g,' ');assert(!greek.test(a),'analysis: '+(a.match(/\S*[α-ωΑ-Ωά-ώ]\S*/)||[])[0]);
  const r=R.makeHTML(p,'en').replace(/<style>[\s\S]*?<\/style>/,'').replace(/<[^>]+>/g,' ');assert(!greek.test(r),'report: '+(r.match(/\S*[α-ωΑ-Ωά-ώ]\S*/)||[])[0]);
  assert(greek.test(A.html(p)),'Greek stays the default');
}
console.log(`i18n: ${Object.keys(I.EN).length} phrases; landscapes, engine, studio, analysis and PDF in English without Greek letters; Greek stays the default`);
