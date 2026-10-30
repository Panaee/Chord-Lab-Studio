/* Scales beyond the church modes: degrees, chords, the Analysis, the project
   file and the practice, for every scale. */
const assert=require('node:assert/strict');
const S=require('../src/scales.js'),N=require('../src/next-engine.js'),A=require('../src/studio-analysis.js'),PS=require('../src/project-store.js'),E=require('../src/practice-engine.js'),T=require('../src/theory-map.js');
const L=require('../legacy/landscapes.js');
for(const sc of S.SCALES){
  assert.equal(sc.steps[0],0,sc.id);assert.deepEqual(sc.steps,[...new Set(sc.steps)].sort((a,b)=>a-b),sc.id);
  assert(T.MODE[sc.near],sc.id+' names a church mode for older versions');
  const key=N.keyOf({tonic:2,mode:sc.id});assert.equal(key.pcs.length,sc.steps.length);
  const kc=N.keyChords(key);assert(kc.length>=1,sc.id+' has chords');
  for(const c of kc)assert(c.pcs.every(p=>key.pcs.includes(p)),sc.id+': chords stay in the scale');
  if(sc.steps.length===7)assert.equal(kc.length,7,sc.id+': one chord per degree');
  // Proposals in every scale and style, without errors.
  const ring=N.tonicRing({tonic:2,mode:sc.id});
  const start={root:2,notes:ring==='minor'?[50,53,57,62]:ring==='dim'?[50,53,56,62]:ring==='aug'?[50,54,58,62]:[50,54,57,62]};
  for(const style of ['free',...L.LANDSCAPES.map(l=>l.id)])assert(N.suggest({current:start,history:[start],tonic:2,mode:sc.id,style,intent:'motion'}).length>=2,`${sc.id}/${style}`);
}
// Degrees: harmonic minor has a major V and an augmented III; Hijaz a major ♭II.
const hm=N.keyOf({tonic:0,mode:'harmonic-minor'});
assert.deepEqual(N.keyChords(hm).map(c=>N.roman(c,hm)),['i','ii°','♭III+','iv','V','♭VI','vii°']);
assert.deepEqual(N.keyChords(hm,true).map(c=>N.roman(c,hm)).slice(3,7),['iv7','V7','♭VImaj7','vii°7']);
const hj=N.keyOf({tonic:2,mode:'hijaz'});assert.equal(N.roman({root:3,notes:[51,55,58]},hj),'♭II');
assert.equal(N.tonicRing({tonic:0,mode:'saba'}),'minor','Saba is minor');assert.equal(N.tonicRing({tonic:0,mode:'whole-tone'}),'aug');
assert.equal(N.chordFor(7,'major',{tonic:0,mode:'harmonic-minor',extension:'7'}).quality,'7','the 7th of V in harmonic minor');
// Starting phrases: the minor scales of functional harmony take the style's paths; the others use the proposals.
assert(N.phrase({tonic:0,mode:'harmonic-minor',style:'classical',start:{root:0,notes:[48,51,55,60]}}));
assert.equal(N.phrase({tonic:2,mode:'hijaz',style:'morricone',start:{root:2,notes:[50,54,57,62]}}),null);
// Analysis: V7 in C harmonic minor is in the scale and dominant; the key is named.
const project={format:'chord-lab-project',version:3,name:'HM',settings:{tonic:0,mode:'aeolian',scaleFamily:'scale',scale:'harmonic-minor',style:'classical',goal:'motion',bpm:80},
  sequence:[{root:0,quality:'minor',label:'Cm',notes:[48,51,55,60]},{root:7,quality:'7',label:'G7',notes:[47,50,55,65]}]};
const m=A.model(project);assert.equal(m.keyName,'C · Harmonic minor / Αρμονική ελάσσονα');
assert.equal(m.chords[1].harmonic.roman,'V7');assert.equal(m.chords[1].harmonic.inScale,true);assert.equal(m.chords[1].harmonic.functionName,'δεσπόζουσα');
assert.equal(m.chromaticCount,0,'nothing outside the reference');
// The project file keeps the scale; older readers see the nearest church mode.
assert.equal(PS.normalize(project).settings.scale,'harmonic-minor');assert.equal(PS.normalize(project).settings.mode,'aeolian');
// Practice: no degree questions without seven degrees.
const steps=[{root:0,notes:[48,52,55,60]},{root:9,notes:[45,52,57,60]}];
assert(E.items(steps,{tonic:0,mode:'harmonic-minor'}).some(it=>it.kind==='degree'));
assert(!E.items(steps,{tonic:0,mode:'pentatonic-major'}).some(it=>it.kind==='degree'));
console.log(`Scales: ${S.SCALES.length} scales × 10 styles give proposals, degrees and 7ths, Saba minor, whole-tone augmented, phrases, Analysis in harmonic minor, project file, practice passed`);
