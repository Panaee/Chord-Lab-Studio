/* Real-browser check of the studio: node tests/browser-v16.cjs
   Needs Playwright with Chromium (CHORD_CHROME may point to a Chromium binary).
   CHORD_TEST_OUTPUT keeps screenshots and the rendered PDF. */
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {pathToFileURL}=require('node:url');
let playwright;try{playwright=require('playwright');}catch(_){console.log('Playwright is not installed: skipped.');process.exit(0);}
const out=process.env.CHORD_TEST_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'chord-lab-'));
const url=pathToFileURL(path.join(__dirname,'..','index.html')).href;

(async()=>{
  const browser=await playwright.chromium.launch(process.env.CHORD_CHROME?{executablePath:process.env.CHORD_CHROME}:{});
  const page=await browser.newPage({viewport:{width:1280,height:800},locale:'el-GR'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url);await page.waitForTimeout(300);
  const S=()=>page.evaluate(()=>{const s=ChordStudio.state;return {sel:s.sel,steps:s.steps.map(x=>({label:x.label,beats:x.beats,notes:x.notes})),preview:s.preview?.label||null,sugg:s.suggestions.map(x=>({label:x.label,notes:x.notes})),heard:s.heard};});

  // A Greek system opens in Greek.
  assert.equal(await page.evaluate(()=>ChordStudio.state.lang),'el');
  // Empty start: the tonic waits as a start, nothing is stored.
  let s=await S();assert.equal(s.steps.length,0);assert.equal(s.sugg.length,3);
  // The empty bar names the three gestures and offers a phrase in the style.
  assert.match(await page.locator('#strip').innerText(),/1 2 3/);
  assert.match(await page.locator('[data-act="phrase"]').innerText(),/Ιμπρεσιονιστικό/);
  await page.keyboard.press('Enter');s=await S();assert.deepEqual(s.steps.map(x=>x.label),['C']);assert.equal(s.sel,0);

  // The wheel only auditions: a preview, no new step.
  await page.click('.seg[data-ring="minor"][data-i="0"]');s=await S();assert.equal(s.preview,'Am');assert.equal(s.steps.length,1);
  assert.equal(await page.locator('#preview').isVisible(),true);
  await page.click('[data-ext="7"]');s=await S();assert.equal(s.preview,'Am7');
  // A form belongs to the chord it was chosen for: the outline stays, only that chord shows it, the next chord starts as a triad.
  await page.click('[data-ext="sus4"]');s=await S();assert.equal(s.preview,'Asus4');
  assert.equal(await page.$eval('.seg.pre',e=>e.dataset.ring+':'+e.dataset.i),'minor:0');
  assert.equal(await page.locator('.seg[data-ring="minor"][data-i="0"] .n').textContent(),'Asus4');
  assert.equal(await page.locator('.seg[data-ring="minor"][data-i="1"] .n').textContent(),'Em');
  assert.match(await page.locator('#preview .hint').innerText(),/sus4: .*Am\./);
  await page.click('.seg[data-ring="major"][data-i="1"]');s=await S();assert.equal(s.preview,'G');
  assert.equal(await page.locator('.seg[data-ring="minor"][data-i="0"] .n').textContent(),'Am');
  await page.click('[data-ext="7"]');assert.match(await page.locator('#preview .hint').innerText(),/^V7: /);
  await page.keyboard.press('Escape');s=await S();assert.equal(s.preview,null);assert.equal(s.steps.length,1);

  // Proposals are computed after the selected step and land right after it.
  await page.keyboard.press('1');s=await S();assert.equal(s.heard,0);const first=s.sugg[0];
  await page.keyboard.press('Enter');s=await S();assert.equal(s.steps.length,2);assert.equal(s.steps[1].label,first.label);assert.deepEqual(s.steps[1].notes,first.notes);
  await page.locator('.card .add').nth(2).click();s=await S();assert.equal(s.steps.length,3);assert.equal(s.sel,2);
  await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');s=await S();assert.equal(s.sel,0);
  const afterC=s.sugg[1];await page.keyboard.press('2');await page.keyboard.press('Enter');
  s=await S();assert.equal(s.steps.length,4);assert.equal(s.sel,1);assert.equal(s.steps[1].label,afterC.label,'inserted after the selected step');
  assert.equal(s.steps[0].label,'C');

  // A proposal is heard after the two last steps; the keyboard shows what stays, leaves and arrives.
  await page.keyboard.press('1');
  assert.match(await page.locator('#status').innerText(),/^Ακούς: \S+ → \S+ → \S+$/);
  assert.match(await page.locator('#now .eyebrow').innerText(),/→/);
  assert.equal(await page.locator('#now .legend').count(),1);
  assert(await page.locator('#now .mini rect.arrive, #now .mini rect.leave').count()>0);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#now .legend').count(),0);

  // MIDI keys: each one sounds while held; a chord let go key by key stays whole for Return.
  const key=d=>page.evaluate(d=>ChordStudio.midiMessage(d),d);
  await key([0x90,57,90]);await page.waitForTimeout(50);await key([0x90,60,90]);await page.waitForTimeout(50);await key([0x90,64,90]);await page.waitForTimeout(60);
  assert.equal(await page.evaluate(()=>ChordStudio.state.midi.live.size),3,'three keys sound');
  await key([0x80,64,0]);await page.waitForTimeout(120);await key([0x80,60,0]);await page.waitForTimeout(120);await key([0x80,57,0]);
  assert.deepEqual(await page.evaluate(()=>[ChordStudio.state.preview.label,ChordStudio.state.preview.notes,ChordStudio.state.melody,ChordStudio.state.midi.live.size]),['Am',[57,60,64],null,0]);
  assert.match(await page.locator('#status').innerText(),/^Από το MIDI: Am\. ⏎/);
  await page.keyboard.press('Escape');
  await key([0xB0,64,127]);await key([0x90,48,80]);await key([0x80,48,0]);assert.equal(await page.evaluate(()=>ChordStudio.state.midi.live.size),1,'the pedal holds it');
  await key([0xB0,64,0]);assert.equal(await page.evaluate(()=>ChordStudio.state.midi.live.size),0);
  await page.evaluate(()=>{ChordStudio.state.melody=null;ChordStudio.refresh();});

  // Durations, undo and redo.
  await page.keyboard.press(']');await page.keyboard.press(']');s=await S();assert.equal(s.steps[1].beats,8);
  await page.keyboard.press('[');s=await S();assert.equal(s.steps[1].beats,6);
  const before=JSON.stringify(s.steps);
  await page.keyboard.press('Backspace');s=await S();assert.equal(s.steps.length,3);
  await page.keyboard.press('Control+z');s=await S();assert.equal(JSON.stringify(s.steps),before);
  await page.keyboard.press('Control+Shift+z');s=await S();assert.equal(s.steps.length,3);
  await page.keyboard.press('Control+z');

  // The note editor: Drop 2 keeps the bass, clicking a key adds a note.
  await page.keyboard.press('ArrowRight');await page.keyboard.press('e');assert(await page.locator('#editor').isVisible());
  s=await S();const bass=Math.min(...s.steps[2].notes);
  await page.click('[data-ed="v-drop2"]');s=await S();assert.equal(Math.min(...s.steps[2].notes),bass);
  const count=s.steps[2].notes.length;await page.click('#editor rect[data-n="84"]');s=await S();assert.equal(s.steps[2].notes.length,count+1);
  await page.screenshot({path:path.join(out,'editor.png')});
  await page.keyboard.press('Escape');assert(!(await page.locator('#editor').isVisible()));

  // Drag a step to the front.
  const labels=(await S()).steps.map(x=>x.label);
  await page.locator('.step[data-i="3"]').dragTo(page.locator('.step[data-i="0"]'),{targetPosition:{x:5,y:20}});
  s=await S();assert.equal(s.steps[0].label,labels[3]);

  // Playback walks through the steps and stops.
  await page.keyboard.press('Space');await page.waitForTimeout(250);assert(await page.evaluate(()=>Boolean(ChordStudio.state.play)));
  assert.equal(await page.locator('.step.playing').count(),1);
  await page.keyboard.press('Space');assert(!(await page.evaluate(()=>Boolean(ChordStudio.state.play))));

  // Every style shapes the proposals shown.
  const sets=new Set();
  for(const style of await page.$$eval('#style option',o=>o.map(x=>x.value))){await page.selectOption('#style',style);sets.add((await S()).sugg.map(x=>x.label).join('|'));}
  assert(sets.size>=8,`styles change the proposals (${sets.size})`);
  await page.selectOption('#style','takemitsu');
  await page.screenshot({path:path.join(out,'compose.png')});

  // Scales: the genre's own come first; harmonic minor lights V, the centre names it, the project keeps it.
  await page.selectOption('#style','classical');
  assert.equal(await page.$eval('#mode optgroup',g=>g.label),'Για το ύφος: Κλασική');
  await page.selectOption('#mode','harmonic-minor');
  assert.equal(await page.locator('#wheel .center .m').textContent(),'Αρμονική ελ.');
  assert.match(await page.getAttribute('.seg[data-ring="major"][data-i="1"]','class'),/dia/);
  assert.equal(await page.evaluate(()=>ChordStudio.projectData().settings.scale),'harmonic-minor');
  await page.selectOption('#mode','hijaz');assert.match(await page.locator('#status').innerText(),/μπουζούκι/);
  await page.selectOption('#mode','ionian');await page.selectOption('#style','takemitsu');

  // Playback pattern and sound follow the style unless chosen.
  assert.match(await page.locator('#pattern option').first().innerText(),/^Από το ύφος · Μπλοκ$/);
  assert.match(await page.locator('#timbre option').first().innerText(),/^Από το ύφος · Pad$/);
  await page.selectOption('#style','glass');assert.match(await page.locator('#pattern option').first().innerText(),/Αρπέζ/);
  await page.selectOption('#style','takemitsu');
  await page.evaluate(()=>{ChordStudio.state.pattern='pulse';ChordStudio.state.timbre='strings';});
  await page.keyboard.press('Space');await page.waitForTimeout(500);assert(await page.evaluate(()=>Boolean(ChordStudio.state.play)));await page.keyboard.press('Space');
  await page.evaluate(()=>{ChordStudio.state.pattern='auto';ChordStudio.state.timbre='auto';});

  // Melody first: the circle keeps the chords that hold the note, the proposals keep it on top.
  await page.click('#melody rect[data-pc="4"]');
  const mel=await page.evaluate(()=>({m:ChordStudio.state.melody,tops:ChordStudio.state.suggestions.map(x=>Math.max(...x.notes)%12)}));
  assert.equal(mel.m%12,4);assert(mel.tops.length&&mel.tops.every(t=>t===4));
  assert(await page.locator('#wheel .seg.off').count()>0);assert.equal(await page.locator('#wheel .seg.off[data-ring="minor"][data-i="0"]').count(),0,'Am holds E');
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>ChordStudio.state.melody),null);
  // A rule holds all three proposals.
  await page.selectOption('#rule','no-five');
  assert(await page.evaluate(()=>ChordStudio.state.suggestions.every(x=>x.root!==7)),'no G');
  await page.selectOption('#rule','');

  // The note editor moves by its header and remembers where; a double click puts it back.
  await page.keyboard.press('e');const ed0=await page.locator('#editor').boundingBox();const hd=await page.locator('#editor header h2').boundingBox();
  await page.mouse.move(hd.x+10,hd.y+6);await page.mouse.down();await page.mouse.move(hd.x+10,hd.y-300,{steps:6});await page.mouse.up();
  const ed1=await page.locator('#editor').boundingBox();assert(ed1.y<ed0.y-200,'editor moved');
  await page.keyboard.press('Escape');await page.keyboard.press('e');assert.equal(Math.round((await page.locator('#editor').boundingBox()).y),Math.round(ed1.y));
  await page.dblclick('#editor header h2');assert.equal(Math.round((await page.locator('#editor').boundingBox()).y),Math.round(ed0.y));
  await page.keyboard.press('Escape');

  // Cards and their numbers on the wheel point at each other.
  await page.hover('.card[data-i="0"]');
  assert.deepEqual(await page.$$eval('#wheel .marker.hot',m=>m.map(x=>x.dataset.i)),['0']);
  assert(await page.locator('#wheel .seg.hot').count()>=1);
  const slot=await page.evaluate(()=>{const w=NextChords.wheelSlot(ChordStudio.state.suggestions[1]);return [w.ring,w.index];});
  await page.hover(`.seg[data-ring="${slot[0]}"][data-i="${slot[1]}"] .n`,{force:true});
  assert((await page.$$eval('.card.hot',c=>c.map(x=>x.dataset.i))).includes('1'));
  // Functions in major and minor; none in the other modes. Proposals outside the scale say so.
  const fnOf=(ring,i)=>page.getAttribute(`.seg[data-ring="${ring}"][data-i="${i}"]`,'class');
  assert.match(await fnOf('major',1),/fn-d/);assert.match(await fnOf('major',11),/fn-s/);assert.match(await fnOf('minor',0),/fn-t/);
  assert.equal(await page.locator('#wheel .legend').count(),1);
  await page.selectOption('#mode','dorian');assert.equal(await page.locator('#wheel [class*="fn-"]').count(),0);
  await page.selectOption('#mode','ionian');
  assert.deepEqual(await page.$$eval('.card',c=>c.map(x=>Boolean(x.querySelector('.out')))),await page.evaluate(()=>ChordStudio.state.suggestions.map(x=>!x.inKey)));

  // Analysis follows the durations; the PDF page is 157×210 mm.
  await page.click('#viewAnalysis');assert.match(await page.locator('#analysisBody').innerText(),/ΑΝΑΛΥΣΗ/);
  const total=(await S()).steps.reduce((t,x)=>t+x.beats,0);
  assert.match(await page.locator('.analysis-summary').innerText(),new RegExp(String(total)));
  await page.screenshot({path:path.join(out,'analysis.png')});
  await page.click('#viewCompose');
  // Ear practice: a question from the piece, an answer, the next one; the bar waits meanwhile.
  await page.keyboard.press('Control+3');assert(await page.locator('#practice').isVisible());
  assert.match(await page.locator('#practiceBody h2').innerText(),/;$/);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.getElementById('strip')).visibility),'hidden');
  await page.keyboard.press('1');assert.equal(await page.locator('#practiceBody .verdict').count(),1);
  const stored=await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('cl-v16-practice')||'{}')).length);assert.equal(stored,1);
  await page.keyboard.press('Enter');assert.equal(await page.locator('#practiceBody .verdict').count(),0);
  const count0=(await S()).steps.length;await page.keyboard.press('Backspace');assert.equal((await S()).steps.length,count0,'practice keys do not edit the piece');
  await page.click('#viewAnalysis');
  // The Analysis only reads: editing keys do nothing there.
  const shown=(await S()).steps.length;await page.keyboard.press('Backspace');await page.keyboard.press('Enter');assert.equal((await S()).steps.length,shown,'no edits from the Analysis');
  // Each step of the Analysis can be heard: the table rows and ▶.
  assert.equal(await page.locator('.analysis-step .listen').count(),total>0?(await S()).steps.length:0);
  await page.click('tr[data-step="1"]');assert.match(await page.locator('#status').innerText(),/^Ακούς: \S+ → \S+$/);
  assert.equal(await page.locator('tr.on').getAttribute('data-step'),'1');
  const html=await page.evaluate(()=>RemarkableReport.makeHTML(ChordStudio.projectData()));
  const report=await browser.newPage();await report.setContent(html);await report.waitForTimeout(200);
  await report.pdf({path:path.join(out,'report.pdf'),preferCSSPageSize:true,printBackground:true});
  assert(!/data-step|class="listen"/.test(html),'no listening controls in the PDF');
  const size=await report.evaluate(()=>document.fonts.check('420 11.5pt Literata'));assert(size,'Literata loaded for the report');
  await page.click('#viewCompose');

  // MIDI file: header, one track, tempo and the real durations.
  const midi=await page.evaluate(()=>Array.from(ChordStudio.midiBytes()));
  assert.deepEqual(midi.slice(0,4),[77,84,104,100]);assert.deepEqual(midi.slice(14,18),[77,84,114,107]);

  // Settings, theme and persistence across a reload.
  await page.click('#openSettings');await page.selectOption('#theme','dark');await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.body.dataset.theme),'dark');
  const saved=(await S()).steps.map(x=>x.label);await page.waitForTimeout(400);
  await page.reload();await page.waitForTimeout(300);
  assert.deepEqual((await S()).steps.map(x=>x.label),saved);
  assert.equal(await page.evaluate(()=>document.body.dataset.theme),'dark');

  // A v1.5 project in storage opens, with colour names turned into symbols.
  // (A fresh profile, as on the first start of 1.6 after 1.5.)
  const fresh=await browser.newContext({viewport:{width:1280,height:800},locale:'el-GR'});
  await fresh.addInitScript(()=>{if(!localStorage.getItem('cl-v16-project'))localStorage.setItem('cl-v15-project',JSON.stringify({format:'chord-lab-project',version:2,name:'Παλιό',settings:{tonic:9,mode:'aeolian',style:'hadjidakis',goal:'nostalgia',bpm:72},sequence:[{root:9,quality:'custom',label:'Ελάσσων ανοιχτή',notes:[45,52,57,60]},{root:4,quality:'7',label:'E7 ✎',notes:[40,50,56,59]}]}));});
  const old=await fresh.newPage();old.on('pageerror',e=>errors.push(e.message));await old.goto(url);await old.waitForTimeout(300);
  const migrated=await old.evaluate(()=>({labels:ChordStudio.state.steps.map(x=>x.label),beats:ChordStudio.state.steps.map(x=>x.beats),tonic:ChordStudio.state.tonic,mode:ChordStudio.state.mode,intent:ChordStudio.state.intent,name:ChordStudio.state.projectName}));
  assert.deepEqual(migrated,{labels:['Am','E7'],beats:[4,4],tonic:9,mode:'aeolian',intent:'nostalgia',name:'Παλιό'});
  await fresh.close();

  // A starting phrase: Morricone in A minor gives i–♭VII–♭VI–V and plays it; after ⌘Z the next path is offered.
  const ph=await browser.newContext({viewport:{width:1280,height:800},locale:'el-GR'});const pp=await ph.newPage();pp.on('pageerror',e=>errors.push(e.message));
  await pp.goto(url);await pp.waitForTimeout(300);
  await pp.selectOption('#tonic','9');await pp.selectOption('#mode','aeolian');await pp.selectOption('#style','morricone');
  assert.equal(await pp.locator('#now .sym').innerText(),'Am','the start chord is named from its notes');
  await pp.click('[data-act="phrase"]');
  assert.deepEqual(await pp.evaluate(()=>ChordStudio.state.steps.map(s=>s.label)),['Am','G','F','E']);
  assert(await pp.evaluate(()=>Boolean(ChordStudio.state.play)),'the phrase plays');
  assert.match(await pp.locator('#status').innerText(),/^Κινηματογραφική μουσική · i–♭VII–♭VI–V: /);
  await pp.keyboard.press('Space');await pp.keyboard.press('Control+z');
  assert.equal(await pp.evaluate(()=>ChordStudio.state.steps.length),0);
  assert.match(await pp.locator('[data-act="phrase"]').innerText(),/ναπολιτάνικη/);
  await pp.evaluate(()=>ChordStudio.setLanguage('en'));
  assert.doesNotMatch(await pp.locator('#strip').innerText(),/[α-ωΑ-Ωά-ώ]/);
  await pp.click('[data-act="phrase"]');assert.doesNotMatch(await pp.locator('#status').innerText(),/[α-ωΑ-Ωά-ώ]/);
  await ph.close();

  // English: no Greek letters anywhere visible, in labels or in options; back to Greek.
  const greekLeft=()=>page.evaluate(()=>{const G=/[α-ωΑ-Ωά-ώ]/,out=[],ov=document.getElementById('oldOverlay');
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
    for(let n=w.currentNode;n;n=w.nextNode()){const el=n.nodeType===3?n.parentElement:n;if(!el||ov.contains(el)||el.closest('#lang'))continue;
      if(n.nodeType===3){if(G.test(n.nodeValue)&&el.offsetParent!==null)out.push(n.nodeValue.trim());}
      else for(const a of ['title','aria-label'])if(G.test(n.getAttribute(a)||''))out.push(a+': '+n.getAttribute(a));}
    for(const o of document.querySelectorAll('option,optgroup'))if(!o.closest('#lang')&&G.test(o.textContent+(o.label||'')))out.push('option: '+o.textContent);
    return out;});
  await page.click('#openSettings');await page.selectOption('#lang','en');await page.keyboard.press('Escape');
  assert.equal(await page.locator('#status').innerText(),'The interface is in English.');
  await page.click('.seg[data-ring="major"][data-i="1"]');await page.keyboard.press('2');
  assert.deepEqual(await greekLeft(),[],'compose in English');
  await page.keyboard.press('e');assert.deepEqual(await greekLeft(),[],'editor in English');await page.keyboard.press('Escape');
  await page.click('#viewAnalysis');assert.deepEqual(await greekLeft(),[],'analysis in English');
  await page.click('#viewPractice');assert.deepEqual(await greekLeft(),[],'practice in English');await page.keyboard.press('2');assert.deepEqual(await greekLeft(),[],'practice answer in English');
  await page.click('#viewCompose');await page.click('#melody rect[data-pc="7"]');assert.deepEqual(await greekLeft(),[],'melody in English');await page.keyboard.press('Escape');
  await page.click('#openSettings');assert.deepEqual(await greekLeft(),[],'settings in English');
  assert.equal(await page.evaluate(()=>document.documentElement.lang),'en');
  // Piano keys keep light whites and dark blacks in every theme.
  for(const theme of ['ivory','slate','dark']){await page.evaluate(t=>{document.body.dataset.theme=t;},theme);
    const [w,bk]=await page.evaluate(()=>{const lum=c=>{const m=c.match(/\d+/g).map(Number);return .2126*m[0]+.7152*m[1]+.0722*m[2];};
      return [lum(getComputedStyle(document.querySelector('#melody rect.w')).fill),lum(getComputedStyle(document.querySelector('#melody rect.b')).fill)];});
    assert(w>bk+80,`${theme}: white keys lighter than black keys`);}
  await page.evaluate(()=>{document.body.dataset.theme='dark';});
  await page.selectOption('#lang','el');await page.keyboard.press('Escape');
  assert.equal(await page.locator('#viewCompose').innerText(),'Σύνθεση');

  // Small window: nothing essential hidden.
  await page.setViewportSize({width:1024,height:700});await page.waitForTimeout(150);
  for(const id of ['wheel','cards','strip','play'])assert(await page.locator('#'+id).isVisible(),id+' visible');
  await page.screenshot({path:path.join(out,'small.png')});

  assert.deepEqual(errors,[]);
  await browser.close();
  console.log('Browser: start, wheel preview without storing, proposals after the selected step, durations, undo/redo, editor and Drop 2, drag, playback, 10 styles, analysis, PDF with Literata, MIDI, theme, persistence, v1.5 migration, starting phrase, phrase listening, patterns and sounds, melody first, rules, ear practice, movable editor, voice-leading keys, card and wheel links, functions, Analysis listening, English and back, 1024 px passed · '+out);
})().catch(e=>{console.error(e);process.exit(1);});
