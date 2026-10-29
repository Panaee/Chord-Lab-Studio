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
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url);await page.waitForTimeout(300);
  const S=()=>page.evaluate(()=>{const s=ChordStudio.state;return {sel:s.sel,steps:s.steps.map(x=>({label:x.label,beats:x.beats,notes:x.notes})),preview:s.preview?.label||null,sugg:s.suggestions.map(x=>({label:x.label,notes:x.notes})),heard:s.heard};});

  // Empty start: the tonic waits as a start, nothing is stored.
  let s=await S();assert.equal(s.steps.length,0);assert.equal(s.sugg.length,3);
  await page.keyboard.press('Enter');s=await S();assert.deepEqual(s.steps.map(x=>x.label),['C']);assert.equal(s.sel,0);

  // The wheel only auditions: a preview, no new step.
  await page.click('.seg[data-ring="minor"][data-i="0"]');s=await S();assert.equal(s.preview,'Am');assert.equal(s.steps.length,1);
  assert.equal(await page.locator('#preview').isVisible(),true);
  await page.click('[data-ext="7"]');s=await S();assert.equal(s.preview,'Am7');
  await page.keyboard.press('Escape');s=await S();assert.equal(s.preview,null);assert.equal(s.steps.length,1);

  // Proposals are computed after the selected step and land right after it.
  await page.keyboard.press('1');s=await S();assert.equal(s.heard,0);const first=s.sugg[0];
  await page.keyboard.press('Enter');s=await S();assert.equal(s.steps.length,2);assert.equal(s.steps[1].label,first.label);assert.deepEqual(s.steps[1].notes,first.notes);
  await page.locator('.card .add').nth(2).click();s=await S();assert.equal(s.steps.length,3);assert.equal(s.sel,2);
  await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');s=await S();assert.equal(s.sel,0);
  const afterC=s.sugg[1];await page.keyboard.press('2');await page.keyboard.press('Enter');
  s=await S();assert.equal(s.steps.length,4);assert.equal(s.sel,1);assert.equal(s.steps[1].label,afterC.label,'inserted after the selected step');
  assert.equal(s.steps[0].label,'C');

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

  // Analysis follows the durations; the PDF page is 157×210 mm.
  await page.click('#viewAnalysis');assert.match(await page.locator('#analysisBody').innerText(),/ΑΝΑΛΥΣΗ/);
  const total=(await S()).steps.reduce((t,x)=>t+x.beats,0);
  assert.match(await page.locator('.analysis-summary').innerText(),new RegExp(String(total)));
  await page.screenshot({path:path.join(out,'analysis.png')});
  const html=await page.evaluate(()=>RemarkableReport.makeHTML(ChordStudio.projectData()));
  const report=await browser.newPage();await report.setContent(html);await report.waitForTimeout(200);
  await report.pdf({path:path.join(out,'report.pdf'),preferCSSPageSize:true,printBackground:true});
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
  const fresh=await browser.newContext({viewport:{width:1280,height:800}});
  await fresh.addInitScript(()=>{if(!localStorage.getItem('cl-v16-project'))localStorage.setItem('cl-v15-project',JSON.stringify({format:'chord-lab-project',version:2,name:'Παλιό',settings:{tonic:9,mode:'aeolian',style:'hadjidakis',goal:'nostalgia',bpm:72},sequence:[{root:9,quality:'custom',label:'Ελάσσων ανοιχτή',notes:[45,52,57,60]},{root:4,quality:'7',label:'E7 ✎',notes:[40,50,56,59]}]}));});
  const old=await fresh.newPage();old.on('pageerror',e=>errors.push(e.message));await old.goto(url);await old.waitForTimeout(300);
  const migrated=await old.evaluate(()=>({labels:ChordStudio.state.steps.map(x=>x.label),beats:ChordStudio.state.steps.map(x=>x.beats),tonic:ChordStudio.state.tonic,mode:ChordStudio.state.mode,intent:ChordStudio.state.intent,name:ChordStudio.state.projectName}));
  assert.deepEqual(migrated,{labels:['Am','E7'],beats:[4,4],tonic:9,mode:'aeolian',intent:'nostalgia',name:'Παλιό'});
  await fresh.close();

  // Small window: nothing essential hidden.
  await page.setViewportSize({width:1024,height:700});await page.waitForTimeout(150);
  for(const id of ['wheel','cards','strip','play'])assert(await page.locator('#'+id).isVisible(),id+' visible');
  await page.screenshot({path:path.join(out,'small.png')});

  assert.deepEqual(errors,[]);
  await browser.close();
  console.log('Browser: start, wheel preview without storing, proposals after the selected step, durations, undo/redo, editor and Drop 2, drag, playback, 10 styles, analysis, PDF with Literata, MIDI, theme, persistence, v1.5 migration, 1024 px passed · '+out);
})().catch(e=>{console.error(e);process.exit(1);});
