/* Analysis of the saved composition. Facts use actual MIDI octaves;
 * composer comments remain explicitly aesthetic heuristics. Offline UMD. */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./theory-map.js'):root.TheoryMap,
  node?require('./path-engine.js'):root.ComposerPaths,
  node?require('./harmonic-context.js'):root.HarmonicContext,
  node?require('./messiaen-engine.js'):root.MessiaenModes,
  node?require('./fifths-engine.js'):root.FifthsLab,
  node?require('./modulation-engine.js'):root.ModulationLab,
  node?require('../legacy/chord_namer.js'):root.ChordNamer,
  node?require('../legacy/teacher.js'):root.Teacher,
  node?require('../legacy/landscapes.js'):root.Landscapes);
 if(node)module.exports=api;else root.StudioAnalysis=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(T,P,H,M,F,Mod,CN,Teacher,L){
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pc=T.mod,unique=xs=>[...new Set(xs)].sort((a,b)=>a-b);
 const pitchName=n=>T.name(n)+(Math.floor(n/12)-1);
 const qualityToNamer={major:'',minor:'m',mMaj7:'mmaj7'};
 const namerToQuality={'':'major',m:'minor',mmaj7:'mMaj7'};
 const clean=ch=>{
  const notes=unique((ch.notes||ch.midi||[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=127));
  if(!notes.length)throw Error('Η συγχορδία δεν έχει έγκυρες MIDI νότες.');
  return {...ch,notes,pcs:unique(notes.map(pc)),root:Number.isInteger(ch.root)?pc(ch.root):pc(notes[0]),quality:ch.quality||'custom'};
 };
 function inversion(ch){
  const interval=pc(ch.notes[0]-ch.root),q=P.QUAL[ch.quality];
  if(interval===0)return 'Θεμελιώδης κατάσταση';
  if(!q||ch.quality==='custom')return 'Μπάσο '+pitchName(ch.notes[0])+' · ελεύθερη διάταξη';
  if(!q.notes.map(pc).includes(interval))return 'Ξένο μπάσο '+pitchName(ch.notes[0]);
  if([3,4].includes(interval))return '1η αναστροφή · τρίτη στο μπάσο';
  if([6,7,8].includes(interval))return '2η αναστροφή · πέμπτη στο μπάσο';
  if([9,10,11].includes(interval))return '3η αναστροφή · έβδομη στο μπάσο';
  return 'Μπάσο '+pitchName(ch.notes[0])+' · ανοιχτό voicing';
 }
 function analyzeChord(input,settings={}){
  const stored=clean(input),readings=CN.readings(stored.notes);
  const expected=Object.prototype.hasOwnProperty.call(qualityToNamer,stored.quality)?qualityToNamer[stored.quality]:stored.quality;
  const matches=(root,quality)=>P.QUAL[quality]&&T.samePcs(unique(P.QUAL[quality].notes.map(n=>pc(root+n))),stored.pcs);
  const validStored=matches(stored.root,stored.quality);
  const exactReading=r=>{const q=namerToQuality[r.quality]??r.quality,tones=P.QUAL[q]?.notes||L.TONES[r.quality];return tones&&T.samePcs(unique([...tones,...r.extras].map(n=>pc(r.root+n))),stored.pcs);};
  const reading=(validStored?readings.find(x=>x.root===stored.root&&x.quality===expected):null)||readings.find(exactReading)||readings[0]||null;
  // Keep the saved interpretation when its complete pitch set still matches.
  // Otherwise infer a separate theory view; never rewrite the saved JSON.
  const chord=stored;
  const readingQuality=reading?(namerToQuality[reading.quality]??reading.quality):'custom';
  const inferredQuality=reading?(Object.keys(P.QUAL).find(q=>matches(reading.root,q))||readingQuality):'custom';
  const theoryChord=validStored?chord:{...chord,root:reading?.root??stored.root,quality:inferredQuality};
  const recognized=reading?Teacher.pretty(reading.label):null;
  // A stored custom chord keeps the symbol the studio gave it for these exact notes.
  const storedSymbol=stored.quality==='custom'&&typeof stored.label==='string'&&stored.label&&!/[α-ωά-ώ·]/i.test(stored.label)?stored.label:null;
  const name=storedSymbol||(validStored?((reading?.root===stored.root?recognized:stored.label)||recognized||'Ελεύθερη συλλογή'):(recognized||stored.label||'Ελεύθερη συλλογή'));
  const tonic=Number.isInteger(settings.tonic)?settings.tonic:0,mode=T.MODE[settings.mode]?settings.mode:'ionian';
  const mess=settings.scaleFamily==='messiaen';
  const col=mess?M.collection(Number(settings.messiaenMode)||2,tonic,Number(settings.messiaenTrans)||0):null;
  const harmonic=mess?M.context(theoryChord,col):H.context(theoryChord,tonic,mode);
  const teacher=Teacher.analyze(chord.notes);
  const labelQuality={major:'Μείζων τριάδα',minor:'Ελάσσων τριάδα',maj7:'Μείζων έβδομη',m7:'Ελάσσων έβδομη','7':'Έβδομη δεσπόζουσας',dim:'Ελαττωμένη τριάδα',dim7:'Ελαττωμένη έβδομη',m7b5:'Μισοελαττωμένη έβδομη',aug:'Αυξημένη τριάδα',sus2:'Sus2',sus4:'Sus4',quartal:'Τεταρτογενής συλλογή',custom:'Ελεύθερη συλλογή'};
  const modePcs=id=>T.MODE[id].steps.map(n=>pc(tonic+n));
  const modalRelations=!mess&&!harmonic.inScale?Object.keys(T.MODE).filter(id=>id!==mode&&stored.pcs.every(p=>modePcs(id).includes(p))).map(id=>T.MODE[id].label):[];
  return {chord,theoryChord,name,recognized,reading,harmonic,modalRelations,inversion:inversion(theoryChord),quality:labelQuality[theoryChord.quality]||theoryChord.quality,
   notesText:chord.notes.map(pitchName).join(' · '),pcsText:chord.pcs.map(T.name).join(' · '),
   tension:teacher.tension,tensionText:Teacher.tensionWord(teacher.tension),collection:col};
 }
 function transition(before,after){
  const a=clean(before),b=clean(after),A=a.notes,B=b.notes;
  const memo=new Map();
  // Ordered minimum-distance matching: every voice of the smaller voicing
  // is matched once; only surplus voices are added/removed. No octave folding.
  function match(i,j){
   const key=i+':'+j;if(memo.has(key))return memo.get(key);
   if(i===A.length)return {cost:0,pairs:[],added:B.slice(j),removed:[]};
   if(j===B.length)return {cost:0,pairs:[],added:[],removed:A.slice(i)};
   const tail=match(i+1,j+1);
   let best={cost:Math.abs(B[j]-A[i])+tail.cost,pairs:[{from:A[i],to:B[j],delta:B[j]-A[i]},...tail.pairs],added:tail.added,removed:tail.removed};
   const leftA=A.length-i,leftB=B.length-j;
   if(leftA>leftB){const alt=match(i+1,j);if(alt.cost<best.cost)best={...alt,removed:[A[i],...alt.removed]};}
   if(leftB>leftA){const alt=match(i,j+1);if(alt.cost<best.cost)best={...alt,added:[B[j],...alt.added]};}
   memo.set(key,best);return best;
  }
  const motion=match(0,0);
  const from=analyzeChord(a),to=analyzeChord(b),rootMotion=pc(to.theoryChord.root-from.theoryChord.root);
  const dominant=from.theoryChord.quality==='7'&&[0,4,7,10].every(n=>a.pcs.includes(pc(from.theoryChord.root+n)));
  const arrival=['major','minor'].includes(to.theoryChord.quality);
  const cadence=dominant&&arrival&&rootMotion===5?{from:from.name,to:to.name,targetRoot:to.theoryChord.root,
   text:`Τοπική πτώση ${from.name} → ${to.name}: δεσπόζουσα 7η προς τονική μία πέμπτη κάτω. Ένδειξη τοπικής τονικοποίησης· δεν τεκμηριώνει από μόνη της μετατροπία.`}:null;
  return {...motion,cadence,common:a.pcs.filter(p=>b.pcs.includes(p)),held:A.filter(n=>B.includes(n)),
   gone:a.pcs.filter(p=>!b.pcs.includes(p)),gained:b.pcs.filter(p=>!a.pcs.includes(p)),
   bassDelta:B[0]-A[0]};
 }
 function pivotsFor(chord,settings){
  if(settings.scaleFamily==='messiaen'||!['ionian','aeolian'].includes(settings.mode||'ionian'))return [];
  const from=F.keyFrom(settings.tonic||0,settings.mode||'ionian');
  return Mod.destinations(from).flatMap(destination=>destination.pivots
   .filter(p=>T.samePcs(p.pcs,chord.pcs))
   .map(p=>({destination:destination.key.name,from:p.sourceRoman,to:p.targetRoman,label:p.label}))).slice(0,5);
 }
 function model(project={}){
  const s=project.settings||{},settings={...s,tonic:Number.isInteger(s.tonic)?s.tonic:0,mode:T.MODE[s.mode]?s.mode:'ionian'};
  const land=L.LANDSCAPES.find(l=>l.id===settings.style),goal=P.byGoal(settings.goal);
  const chords=(project.sequence||[]).map((ch,i)=>{
   const analyzed=analyzeChord(ch,settings);
   const previous=i?project.sequence[i-1]:null;
   const comparison=previous?transition(previous,ch):null;
   const context={tonic:settings.tonic,mode:settings.mode==='ionian'?'major':settings.mode==='aeolian'?'minor':settings.mode};
   const lesson=land?Teacher.review(settings.style,Teacher.analyze(analyzed.chord.notes),context):[];
   const movement=land&&previous?Teacher.transition(settings.style,previous.notes,analyzed.chord.notes):null;
   const advice=[...lesson,...(movement?.lines||[])].filter(line=>['yes','warn','no'].includes(line[0])).map(line=>line[1]);
   const heuristic=advice[0]||(land?land.idea:'Άκου τη διαφορά και αξιολόγησέ την με βάση τη συνθετική πρόθεση.');
   return {...analyzed,index:i,comparison,pivots:pivotsFor(analyzed.chord,settings),heuristic,goal:goal.label};
  });
  const col=settings.scaleFamily==='messiaen'?M.collection(Number(settings.messiaenMode)||2,settings.tonic,Number(settings.messiaenTrans)||0):null;
  return {chords,settings,keyName:col?col.notation:T.name(settings.tonic)+' · '+T.MODE[settings.mode].label,
   modeName:col?col.name:T.MODE[settings.mode].label,style:land?.name||'Ελεύθερη αρμονία',goal:goal.label,goalIntro:goal.intro,mess:!!col,col,
   bpm:Number(settings.bpm)||84,totalBeats:(project.sequence||[]).reduce((t,ch)=>t+(Number(ch.beats)||4),0),
   chromaticCount:chords.filter(x=>!x.harmonic.inScale).length};
 }
 function voicesHTML(cmp){
  const rows=cmp.pairs.map(p=>`<tr><td>${esc(pitchName(p.from))}</td><td>${esc(pitchName(p.to))}</td><td>${p.delta>0?'+':''}${p.delta} ημιτ.</td></tr>`)
   .concat(cmp.added.map(n=>`<tr><td>—</td><td>${esc(pitchName(n))}</td><td>νέα φωνή</td></tr>`),cmp.removed.map(n=>`<tr><td>${esc(pitchName(n))}</td><td>—</td><td>αποχώρηση</td></tr>`));
  return `<table class="analysis-voices"><thead><tr><th>Από</th><th>Προς</th><th>Κίνηση</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
 }
 function transitionHTML(cmp){
  if(!cmp)return '<p>Αφετηρία της αποθηκευμένης αλυσίδας.</p>';
  const list=xs=>xs.length?xs.map(T.name).join(' · '):'καμία';
  return `<p><b>Κοινές τονικές κλάσεις:</b> ${esc(list(cmp.common))}. <b>Νέες:</b> ${esc(list(cmp.gained))}. <b>Αποχωρούν:</b> ${esc(list(cmp.gone))}.</p><p><b>Ακριβώς κρατημένες νότες:</b> ${esc(cmp.held.length?cmp.held.map(pitchName).join(' · '):'καμία')}. <b>Συνολική κίνηση:</b> ${cmp.cost} ημιτόνια.</p>${voicesHTML(cmp)}${cmp.cadence?`<p class="analysis-cadence">${esc(cmp.cadence.text)}</p>`:''}<p class="analysis-method">Ελάχιστη κίνηση χωρίς διασταύρωση, με πραγματικές οκτάβες. Η αντιστοίχιση είναι πρόταση φωνών για το αποθηκευμένο voicing.</p>`;
 }
 function summaryTable(m){
  return `<div class="analysis-table-wrap"><table class="analysis-table"><thead><tr><th>Βήμα</th><th>Συγχορδία</th><th>Βαθμίδα</th><th>Νότες / οκτάβες</th><th>Χτύποι</th></tr></thead><tbody>${m.chords.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}</td><td>${esc(x.harmonic.roman)}</td><td>${esc(x.notesText)}</td><td>${Number(x.chord.beats)||4}</td></tr>`).join('')}</tbody></table></div>`;
 }
 function stepHTML(x){
  const pivot=x.pivots.length?`<p class="analysis-pivots"><b>Πιθανά pivot:</b> ${x.pivots.map(p=>`${esc(p.destination)} (${esc(p.from)} → ${esc(p.to)})`).join(' · ')}. Η κοινή συγχορδία επιτρέπει μια διαδρομή· δεν αποδεικνύει ότι έγινε μετατροπία.</p>`:'';
  const modal=x.modalRelations.length?`<p class="analysis-modal"><b>Πιθανός modal δανεισμός:</b> οι πραγματικές νότες ανήκουν στους παράλληλους τρόπους ${esc(x.modalRelations.join(' · '))}. Η κοινή συλλογή επιτρέπει αυτή την ανάγνωση· δεν αποδεικνύει πρόθεση δανεισμού.</p>`:'';
  return `<article class="analysis-step"><header class="analysis-step-heading"><span class="analysis-number">${String(x.index+1).padStart(2,'0')}</span><div><h3>${esc(x.name)}</h3><span class="degree-badge">${esc(x.harmonic.roman)}</span> <span>${esc(x.harmonic.qualification)}</span></div></header><dl class="analysis-facts"><div><dt>Ποιότητα</dt><dd>${esc(x.quality)}</dd></div><div><dt>Θέση</dt><dd>${esc(x.inversion)}</dd></div><div><dt>Νότες / οκτάβες</dt><dd>${esc(x.notesText)}</dd></div><div><dt>Λειτουργία / σχέση</dt><dd>${esc(x.harmonic.functionName||((x.harmonic.inScale?'Εντός ':'Εκτός ')+(x.collection?'συμμετρικής συλλογής':'επιλεγμένου τρόπου')))}</dd></div></dl>${x.chord.label&&x.chord.label!==x.name?`<p class="analysis-source">Αποθηκευμένη επιλογή: ${esc(x.chord.label)} · ρίζα αναφοράς ${esc(T.name(x.chord.root))}.</p>`:''}<section class="analysis-transition"><h4>Σύνδεση με το προηγούμενο βήμα</h4>${transitionHTML(x.comparison)}</section>${modal}${pivot}<p class="analysis-theory"><b>Θεωρητικό δεδομένο:</b> ${esc(x.harmonic.roman)} ως προς ${esc(x.harmonic.keyName)}. ${esc(x.harmonic.functionName?'Η λειτουργία προϋποθέτει και ακουστικό/φραστικό πλαίσιο.':'Η συγκεκριμένη συλλογή δεν θεμελιώνει από μόνη της λειτουργική αρμονία.')}</p><p class="analysis-heuristic"><b>Συνθετική ευρετική:</b> ${esc(x.heuristic)} <span>Πρόθεση: ${esc(x.goal)}.</span></p></article>`;
 }
 function html(project){
  const m=model(project);
  if(!m.chords.length)return '<div class="analysis-empty"><span>ANALYSIS</span><h2>Η θεωρία ξεκινά από τη μουσική σου.</h2><p>Πρόσθεσε συγχορδίες στη Σύνθεση. Εδώ θα εμφανιστούν οι πραγματικές νότες, οι βαθμίδες και η κίνηση κάθε φωνής.</p></div>';
  return `<div class="analysis-intro"><span>ΑΝΑΛΥΣΗ · ${esc(m.keyName)}</span><h2>Η αρμονία που έγραψες.</h2><p>${esc(m.style)} · ${esc(m.goal)}. Οι εξηγήσεις ακολουθούν τα αποθηκευμένα βήματα και τις οκτάβες τους.</p></div><div class="analysis-summary"><article><strong>${m.chords.length}</strong><span>συγχορδίες</span></article><article><strong>${m.totalBeats}</strong><span>χτύποι · ${m.bpm} BPM</span></article><article><strong>${m.chromaticCount}</strong><span>εκτός αναφοράς</span></article></div>${summaryTable(m)}${m.chords.map(stepHTML).join('')}`;
 }
 return {model,html,analyzeChord,transition,pitchName,summaryTable,stepHTML,transitionHTML,voicesHTML,esc};
});
