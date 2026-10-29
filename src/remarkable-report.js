/* Reading report as PDF (157×210 mm, tablet and e-reader size, Literata) from the saved composition, shared with Analysis. */
(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./studio-analysis.js'):root.StudioAnalysis,node?require('./report-fonts.js'):root.ReportFonts,node?require('./i18n.js'):root.I18N);
 if(node)module.exports=api;else root.RemarkableReport=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(A,Fonts,I){
 'use strict';
 const esc=A.esc;
 function reportModel(project){
  if(!project||!Array.isArray(project.sequence)||!project.sequence.length)throw Error('Η αλυσίδα είναι άδεια.');
  return A.model(project);
 }
 function makeHTML(project,lang='el'){
  const m=reportModel(project),count=m.chords.length,W=(x,...a)=>esc(I.L(lang,x,...a));
  const rows=m.chords.map(x=>A.stepHTML(x,lang)
   .replace('class="analysis-step"',`class="analysis-step step${x.chord.notes.length>8?' long-step':''}"`)
   .replace('</article>',`<div class="notes-caption">${W('Δικές μου σημειώσεις / ακρόαση')}</div><div class="ruled"></div></article>`)).join('');
  return `<!doctype html><html lang="${lang==='en'?'en':'el'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${W('Chord Lab · Ανάλυση')}</title><style>
 ${Fonts?Fonts.css:''}
 @page{size:157mm 210mm;margin:14mm 16mm 15mm 16mm}
 *{box-sizing:border-box}html,body{margin:0;padding:0}
 body{font-family:Literata,serif;font-weight:420;font-size:11.5pt;line-height:1.62;color:#000;background:#fff;text-align:left;font-variant-numeric:lining-nums}
 b,strong,th,dt{font-weight:700}
 .toolbar{position:sticky;top:0;z-index:5;background:#ecebe7;padding:10px 18px;font:13px/1.3 -apple-system,sans-serif;border-bottom:1px solid #aaa;display:flex;align-items:center;justify-content:space-between;gap:12px}
 .toolbar button{border:1px solid #333;background:#222;color:#fff;border-radius:6px;padding:9px 16px;font-size:13px;cursor:pointer}
 .document{max-width:125mm;margin:10mm auto;padding:0 0 12mm}
 .overline{font-size:8.5pt;letter-spacing:.12em;font-weight:700}
 h1{font-size:19pt;font-weight:800;margin:3mm 0 2mm;line-height:1.2}h2{font-size:13.5pt;font-weight:700;margin:5mm 0 2mm;line-height:1.3}h3{font-size:15pt;font-weight:700;margin:0 0 1mm;line-height:1.25}h4{font-size:11.5pt;font-weight:700;margin:3mm 0 1.5mm}
 p{margin:1.5mm 0}.meta{margin:4mm 0;border-top:.8pt solid #000;border-bottom:.5pt solid #000;padding:2.5mm 0}.meta p{margin:1mm 0}.intro{margin:4mm 0 5mm}
 table{width:100%;border-collapse:collapse;font-size:10pt;line-height:1.45;margin:2mm 0}th,td{text-align:left;vertical-align:top;padding:1.4mm 1.6mm;border-bottom:.4pt solid #000;overflow-wrap:anywhere}th{border-bottom:.8pt solid #000}thead{display:table-header-group}tr{break-inside:avoid}
 .analysis-table th:nth-child(1){width:10%}.analysis-table th:nth-child(2){width:22%}.analysis-table th:nth-child(3){width:16%}.analysis-table th:nth-child(5){width:15%}
 .step{break-inside:avoid;page-break-inside:avoid;border-top:.6pt solid #000;padding:4mm 0}.long-step{break-inside:auto;page-break-inside:auto}
 .analysis-step-heading{display:flex;align-items:flex-start;gap:3mm;break-after:avoid}
 .analysis-number{flex:0 0 8mm;font-size:10pt;font-weight:700;border:.8pt solid #000;text-align:center;line-height:8mm;width:8mm;height:8mm}
 .degree-badge{font-weight:700}.analysis-step-heading>div>span{font-size:10pt}
 .analysis-facts{display:grid;grid-template-columns:1fr;gap:1mm;margin:3mm 0}.analysis-facts div{display:flex;gap:3mm}.analysis-facts dt{flex:0 0 34mm;font-size:10pt}.analysis-facts dd{margin:0;font-size:10.5pt;overflow-wrap:anywhere}
 .analysis-source,.analysis-method{font-size:9.5pt;font-style:italic}.analysis-transition{margin:3mm 0;border-left:1pt solid #000;padding-left:3mm}.analysis-transition p{font-size:10.5pt}.analysis-transition .analysis-method{font-size:9pt}
 .analysis-pivots,.analysis-theory,.analysis-heuristic{font-size:10.5pt}.analysis-heuristic{border-top:.4pt dotted #000;padding-top:2mm}.analysis-voices td{padding:.8mm 1.6mm}
 .notes-caption{font-size:9pt;font-style:italic;margin:4mm 0 2mm}.ruled{height:16mm;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 7.6mm,#000 7.6mm,#000 7.9mm)}
 .ending{border-top:.8pt solid #000;margin-top:6mm;padding-top:3mm;break-inside:avoid}.small{font-size:10pt}.end-lines{height:32mm;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 7.6mm,#000 7.6mm,#000 7.9mm)}
 @media print{.toolbar{display:none!important}.document{max-width:none;margin:0;padding:0}}
 @media screen and (max-width:700px){.document{padding:0 16px}.step{break-inside:auto}}
 </style></head><body><div class="toolbar"><span>PDF · 157×210 mm · Literata</span><button onclick="window.print()">${W('Εκτύπωση / Αποθήκευση PDF')}</button></div><main class="document"><div class="overline">CHORD LAB STUDIO 1.6</div><h1>${esc(project.name||I.L(lang,'Η αρμονική αλυσίδα μου'))}</h1><div class="meta"><p><b>${W('Αναφορά:')}</b> ${esc(I.inline(lang,m.keyName))}${m.mess?W(' · συμμετρική συλλογή Messiaen'):''}</p><p><b>${W('Συνθετική λογική:')}</b> ${W(m.style)} · <b>${W('Πρόθεση:')}</b> ${W(m.goal)}</p><p><b>${W('Σύνθεση:')}</b> ${W('{0} βήματα · {1} BPM · {2} χτύποι · {3} βήματα εκτός αναφοράς',count,m.bpm,m.totalBeats,m.chromaticCount)}</p></div><div class="intro"><b>${W('Ακολουθία:')}</b> ${m.chords.map(x=>esc(I.parts(lang,x.name))).join(' → ')}<p class="small">${W(m.goalIntro)}</p></div><h2>${W('Πίνακας σύνθεσης')}</h2>${A.summaryTable(m,lang)}${rows}<section class="ending"><h2>${W('Τι έμαθα από αυτή την αλυσίδα;')}</h2><p class="small">${W('Ποιες αλλαγές ακούγονται πειστικές; Ποια φωνή θα κρατήσεις και ποια θα μετακινήσεις;')}</p><div class="end-lines"></div><p class="small">${W('Μεθοδολογία: βαθμίδες ως προς την ενεργή αναφορά κατά την εξαγωγή. Οι νότες και οκτάβες είναι τα πραγματικά αποθηκευμένα MIDI δεδομένα. Η κίνηση φωνών είναι ελάχιστη αντιστοίχιση χωρίς διασταύρωση· οι επιπλέον φωνές δηλώνονται ως προσθήκες ή αποχωρήσεις. Κοινές συγχορδίες και μεμονωμένες πτώσεις δεν αποδεικνύουν μετατροπία. Οι κρίσεις του συνθετικού ύφους είναι δημιουργικές ευρετικές και δηλώνονται χωριστά από τα θεωρητικά δεδομένα.')}</p></section></main></body></html>`;
 }
 return {reportModel,makeHTML};
});
