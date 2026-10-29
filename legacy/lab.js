/* Chord Lab — ο δάσκαλος στο πιάνο.
   Ό,τι παίζεις στο MIDI (ή με κλικ) περνά από τον δάσκαλο (teacher.js):
   τι ακούγεται, πώς το κρίνει το ύφος, πού μπορείς να πας. Πάνω από τα
   πλήκτρα ο χάρτης δείχνει τι θα έκανε κάθε νότα· από κάτω οι κάρτες
   δείχνουν μία κίνηση τη φορά. */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const L = window.Landscapes, KV = window.KeyboardView, T = window.Teacher;
  const {NAMES, pc} = L;
  const MODES = T.MODE_NAME;
  const escape = text => String(text).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"}[c]));
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  function store(key, value) {
    try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, String(value)); }
    catch { return null; }
    return null;
  }

  const state = {
    landscape: L.byId(store("cl-landscape") || "takemitsu").id,
    tonic: Number(store("cl-tonic")) || 0, mode: MODES[store("cl-mode")] ? store("cl-mode") : "major",
    sound: store("cl-sound") !== "0", map: store("cl-map") !== "0", scale: Number(store("cl-scale")) || 0,
    held: new Map(), sustain: false, sustained: new Set(), latched: new Set(),
    current: [], previous: [], history: [], view: null, items: [], selected: -1, quiz: null,
    access: null, settleTimer: 0,
  };

  const keys = new KV.View({container: $("live-keys"), onPress: pitch => toggleLatch(pitch)});
  keys.setRange(36, 96);

  /* ------------------------------------------------------------ helpers */
  const landscape = () => L.byId(state.landscape);
  const scale = () => { const land = landscape(); return land.scales[((state.scale % land.scales.length) + land.scales.length) % land.scales.length]; };
  const wrap = (index, length) => length ? ((index % length) + length) % length : 0;
  const sounding = () => [...new Set([...state.held.keys(), ...state.sustained, ...state.latched])].sort((a, b) => a - b);
  function ensureRange(pitches) {
    const all = [36, 96, ...pitches.filter(Number.isFinite)];
    const next = KV.rangeFor([Math.min(...all), Math.max(...all)]);
    if (!keys.range || next.min !== keys.range.min || next.max !== keys.range.max) { keys.setRange(next.min, next.max); keys.chordSignature = ""; }
  }

  /* ------------------------------------------------------------ the keys */
  /* Pressed keys: what sounds now, or, when the hands have left the keys,
     the last thing you played (dimmer), so the lesson stays readable. */
  function renderKeys() {
    const now = sounding();
    const shown = now.length ? now : state.current;
    $("board").classList.toggle("released", !now.length && state.current.length > 0);
    ensureRange(shown.concat(previewPitches()));
    const a = state.view && state.view.analysis && same(state.view.analysis.pitches || [], shown) ? state.view.analysis : T.analyze(shown);
    const base = a.chord ? a.chord.symbol.split("(")[0].replace(/♯/g, "#").replace(/♭/g, "b") : "";
    keys.setChord(base, "", "");
    keys.setActive(shown.map(pitch => ({pitch, track: "midi", name: a.name ? a.name(pitch) : NAMES[pc(pitch)]})), {describe: false});
    paintMap();
    octaveLabels();
  }

  /* ------------------------------------------------------------ the teacher */
  function speak() {
    const now = state.current;
    state.view = T.speak(state.landscape, now, {previous: state.previous, history: state.history.map(h => h.pitches),
      tonic: state.tonic, mode: state.mode, scale: scale()});
    const view = state.view;
    document.documentElement.style.setProperty("--suggest", landscape().color);
    $("lens-line").textContent = landscape().name + " · " + view.lens.want;
    $("t-title").hidden = true;
    showDisplay(view.display, view.sub, view.state === "empty");
    $("meter-fill").style.width = Math.round(view.tension * 100) + "%";
    $("meter-word").textContent = now.length > 1 ? view.tensionWord : "";
    $("meter").classList.toggle("off", now.length < 2);
    const ICON = {did: "↳", yes: "✓", warn: "!", no: "✕", if: "→", "": "·", fact: "·"};
    const CLASS = {did: "did", yes: "yes", warn: "warn", no: "no", if: "if", "": "say", fact: "fact"};
    let html = "", chipsPlaced = false;
    view.lines.forEach(([kind, text]) => {
      html += "<li class=\"line " + CLASS[kind] + "\"><i aria-hidden=\"true\">" + ICON[kind] + "</i><span>" + escape(text) + "</span></li>";
      if (!chipsPlaced && view.tryChips && (kind === "no" || kind === "warn")) {
        chipsPlaced = true;
        html += "<li class=\"line try\"><i aria-hidden=\"true\"></i><span>" + escape(view.tryChips.word) + ": " +
          view.tryChips.items.map((x, i) => "<button type=\"button\" class=\"try-chip\" data-try=\"" + i + "\">" + escape(x.label) + "</button>").join(" ") + "</span></li>";
      }
    });
    $("t-lines").innerHTML = html;
    state.items = view.cards.concat(view.routes);
    state.selected = -1;
    renderCards();
    renderPath();
    renderKeys();
    keys.setSuggestions([]);
    drawStrip();
  }

  /* The big readout above the keys: one name you can read from the piano. */
  function showDisplay(display, sub, idle) {
    const d = display || {big: "", alt: "", inv: -1};
    $("d-big").textContent = idle ? "Πάτα μια νότα" : d.big;
    $("d-big").classList.toggle("idle", Boolean(idle));
    $("d-alt").innerHTML = escape(d.alt || "").replace(/\n/g, "<br>");
    $("d-sub").textContent = idle ? "" : sub || "";
    $("d-key").textContent = T.keyText({tonic: state.tonic, mode: state.mode});
    $("d-inv").hidden = !(d.inv >= 0);
    [...$("d-inv").querySelectorAll("span")].forEach((span, i) => span.classList.toggle("on", i === d.inv));
  }
  /* C keys carry only their octave number, the way a keyboard is read. */
  function octaveLabels() {
    keys.elements.forEach((element, pitch) => {
      if (element.black || pitch % 12) return;
      const busy = element.group.classList.contains("kv-on") || element.group.classList.contains("kv-suggest") || element.group.classList.contains("kv-implied");
      if (!busy) element.label.textContent = String(Math.floor(pitch / 12) - 1);
    });
  }

  function renderCards() {
    const view = state.view;
    $("next").hidden = !view || !view.cards.length;
    if (!view) return;
    $("cards-title").textContent = view.cardsTitle || "Πού πας από εδώ";
    let html = "", group = "";
    view.cards.forEach((card, i) => {
      const heading = card.kind === "identity" ? "Η νότα σου στην κορυφή, άλλο μπάσο από κάτω" : card.kind === "color" ? "Η νότα σου στο μπάσο: τα χρώματα του ύφους" : "";
      if (heading && heading !== group) { group = heading; html += "<p class=\"cards-group\">" + escape(heading) + "</p>"; }
      html += "<button type=\"button\" class=\"nx k-" + card.kind + (i === state.selected ? " selected" : "") + "\" data-item=\"" + i + "\" role=\"option\" aria-selected=\"" + (i === state.selected) + "\">" +
        "<span class=\"c-tag\">" + escape(card.tag || "") + "</span><b class=\"c-label\">" + escape(card.label) + "</b>" +
        (card.line ? "<span class=\"c-line\">" + escape(card.line) + "</span>" : "") +
        "<span class=\"c-why\">" + escape(card.why || "") + (card.use && i === state.selected ? " <em>Ενορχήστρωση: " + escape(card.use) + "</em>" : "") + "</span>" +
        (i === state.selected && !state.held.size ? "<span class=\"c-keep\" data-keep=\"" + i + "\">Enter · κράτα το</span>" : "") + "</button>";
    });
    $("cards").innerHTML = html;
    $("routes-wrap").hidden = !view.routes.length;
    $("routes").innerHTML = view.routes.map((route, j) => {
      const i = view.cards.length + j;
      return "<button type=\"button\" class=\"route" + (i === state.selected ? " selected" : "") + "\" data-item=\"" + i + "\"><b>" + escape(route.label) + "</b><span>" +
        route.chords.map(c => escape(c.label) + (c.roman ? "<small>" + escape(c.roman) + "</small>" : "")).join("<i>→</i>") + "</span>" +
        (i === state.selected ? "<em>" + escape(route.why) + "</em>" : "") + "</button>";
    }).join("");
  }

  function renderPath() {
    const steps = state.history.slice(-7);
    $("path").innerHTML = steps.map((h, i) => (i && h.short ? "<i>" + escape(h.short) + "</i>" : "") +
      "<button type=\"button\" class=\"step" + (i === steps.length - 1 ? " now" : "") + "\" data-path=\"" + (state.history.length - steps.length + i) + "\">" + escape(h.label) + "</button>").join("");
  }

  /* ------------------------------------------------------------ map and arcs */
  function selectedItem() { return state.selected >= 0 ? state.items[state.selected] : null; }
  function previewPitches() { const item = selectedItem(); return item ? (item.to || []) : []; }

  function keyBox(pitch, strip) {
    const element = keys.elements.get(pitch);
    if (!element) return null;
    const r = element.group.querySelector(".kv-face").getBoundingClientRect();
    return {x: r.left + r.width / 2 - strip.left, w: r.width, black: element.black};
  }

  /* Over a chord the map keeps only the clear answers (yes, no); over one or two notes it shows all. */
  const mapEntries = view => !view ? [] : state.current.length >= 3 ? view.map.filter(m => m.level === "yes" || m.level === "no") : view.map;
  function paintMap() {
    const view = state.view;
    const map = state.map && view && !state.quiz && state.selected < 0 && state.current.length ? mapEntries(view) : [];
    const levels = new Map(map.map(m => [m.pitch, m.level]));
    keys.elements.forEach((element, pitch) => {
      element.group.classList.remove("map-yes", "map-warn", "map-no");
      const level = levels.get(pitch);
      if (level) element.group.classList.add("map-" + level);
    });
  }

  function drawStrip() {
    const strip = $("map-strip");
    const box = strip.getBoundingClientRect();
    const view = state.view, item = selectedItem();
    let html = "";
    if (item && (item.moved || item.kind === "route" || item.kind === "recolor")) {
      // Arcs: which key leaves, which key comes.
      const moved = item.moved || pairs(state.current, item.to);
      const svg = moved.map(m => {
        const a = keyBox(m.from, box), b = keyBox(m.to, box);
        if (!a || !b) return "";
        const y = 34, lift = Math.min(26, 10 + Math.abs(b.x - a.x) / 6);
        return "<path d=\"M" + a.x.toFixed(1) + " " + y + " C " + a.x.toFixed(1) + " " + (y - lift) + ", " + b.x.toFixed(1) + " " + (y - lift) + ", " + b.x.toFixed(1) + " " + (y - 3) + "\"/>" +
          "<circle cx=\"" + b.x.toFixed(1) + "\" cy=\"" + (y - 1) + "\" r=\"3.2\"/>";
      }).join("");
      html = "<svg class=\"arcs\" width=\"" + box.width + "\" height=\"" + box.height + "\">" + svg + "</svg>";
    } else if (state.map && view && view.map.length && !state.quiz) {
      html = mapEntries(view).map(m => {
        const b = keyBox(m.pitch, box);
        if (!b) return "";
        return "<span class=\"mk " + (m.level || "plain") + (b.black ? " up" : "") + "\" style=\"left:" + b.x.toFixed(1) + "px\" title=\"" + escape(m.text) + "\">" + escape(m.label) + "</span>";
      }).join("");
    }
    strip.innerHTML = html;
  }
  /* Voices matched low to high, for arcs between two chords of any size. */
  function pairs(from, to) {
    const out = [];
    const a = from.filter(p => !to.includes(p)), b = to.filter(p => !from.includes(p));
    a.forEach((p, i) => { if (b.length) out.push({from: p, to: b[Math.min(i, b.length - 1)]}); });
    return out;
  }

  /* ------------------------------------------------------------ selecting a card */
  function select(index) {
    const count = state.items.length;
    if (!count) return;
    state.selected = index < 0 ? -1 : wrap(index, count);
    const item = selectedItem();
    renderCards();
    const suggestions = [];
    if (item) {
      const target = item.to || [];
      const a = T.analyze(target);
      const optional = item.optional || [];
      target.filter(p => !state.current.includes(p)).forEach(p => suggestions.push({pitch: p, kind: "add", optional: optional.includes(p),
        role: roleLabel(p, a), name: a.name(p)}));
      if (["move", "route", "recolor"].includes(item.kind)) state.current.filter(p => !target.includes(p)).forEach(p => suggestions.push({pitch: p, kind: "remove", role: "−"}));
    }
    renderKeys();
    keys.setSuggestions(suggestions);
    octaveLabels();
    drawStrip();
    const selected = document.querySelector("#next .selected");
    if (selected && selected.scrollIntoView) selected.scrollIntoView({block: "nearest", inline: "nearest"});
  }
  function roleLabel(pitch, a) {
    if (a.chord) return KV.chordDegree(pitch, a.chord.parsed) || "";
    return pitch === a.bass ? "" : T.ivName(pitch - a.bass).short;
  }
  function step(delta) {
    if (state.quiz) { if (delta > 0) skip(); return; }
    if (!state.items.length) return;
    select(state.selected < 0 ? (delta > 0 ? 0 : state.items.length - 1) : state.selected + delta);
    if (state.sound) listen();
  }
  /* Enter: keep the card's notes (click mode), so the lesson goes on from there. */
  function keep() {
    const item = selectedItem();
    if (!item || state.held.size) return;
    const target = item.kind === "route" ? item.chain[1] || item.to : item.to;
    state.latched = new Set(target);
    commit(true);
  }

  /* ------------------------------------------------------------ sound */
  let audio = null;
  function context() {
    if (!audio) { const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return null; audio = new Ctx(); }
    if (audio.state === "suspended") audio.resume();
    return audio;
  }
  function playChord(pitches, at = 0, length = 1.5) {
    const ctx = context(); if (!ctx || !pitches.length) return;
    const start = ctx.currentTime + at + .03, master = ctx.createGain();
    master.gain.value = Math.min(.2, .55 / pitches.length); master.connect(ctx.destination);
    pitches.forEach(pitch => {
      const frequency = 440 * Math.pow(2, (pitch - 69) / 12);
      [[1, "triangle", 1], [2, "sine", .22], [3, "sine", .06]].forEach(([multiple, type, amount]) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = type; osc.frequency.value = frequency * multiple;
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(amount, start + .012);
        gain.gain.exponentialRampToValueAtTime(.0001 + amount * .001, start + length);
        osc.connect(gain); gain.connect(master); osc.start(start); osc.stop(start + length + .05);
      });
    });
  }
  function playSequence(chords) {
    chords.filter(c => c && c.length).forEach((pitches, i, list) => playChord(pitches, i * 1.15, list.length > 1 ? 1.25 : 1.8));
  }
  function listen() {
    if (state.quiz) return playSequence([state.current]);
    const item = selectedItem(), now = state.current;
    if (!item) return playSequence([now]);
    if (item.kind === "route") return playSequence(item.chain);
    if (item.kind === "move" || item.kind === "recolor") return playSequence([now, item.to]);
    return playSequence([item.to]);
  }

  /* ------------------------------------------------------------ input */
  /* A chord arrives over a few milliseconds and leaves the same way: the
     teacher waits until the notes settle. Letting go of only some keys must
     last a little longer before it counts, so that lifting a hand does not
     read as a lesson about each note on the way out. */
  function settle(immediate) {
    clearTimeout(state.settleTimer);
    const now = sounding();
    if (!now.length) { renderKeys(); return; }
    const removalOnly = state.current.length && now.every(p => state.current.includes(p));
    state.settleTimer = setTimeout(() => commit(false), immediate ? 0 : removalOnly ? 450 : 110);
  }
  function commit(force) {
    const now = sounding();
    if (!now.length) { renderKeys(); return; }
    if (!force && same(now, state.current)) { renderKeys(); return; }
    if (same(now, state.current)) return;
    state.previous = state.current;
    state.current = now;
    if (state.quiz) { answer(); return; }
    speak();
    state.history.push({pitches: now, label: state.view.path.label, short: state.view.path.short});
    if (state.history.length > 40) state.history.shift();
    renderPath();
  }
  function toggleLatch(pitch) {
    const setup = state.quiz ? state.quiz.q.setup : [];
    if (setup.length && !setup.includes(pitch)) state.latched = new Set([...setup, pitch]);   // one answer at a time
    else if (state.latched.has(pitch)) state.latched.delete(pitch); else state.latched.add(pitch);
    if (state.sound && state.latched.has(pitch)) playChord([pitch], 0, .9);
    commit(true);
    if (!sounding().length && !state.quiz) clearAll();
  }
  function clearAll() {
    state.latched.clear(); state.current = []; state.previous = []; state.history = [];
    speak();
  }
  function restore(index) {
    const entry = state.history[index];
    if (!entry || state.held.size) return;
    state.latched = new Set(entry.pitches);
    commit(true);
  }

  function selectLandscape(id) {
    state.landscape = L.byId(id).id; state.scale = 0;
    store("cl-landscape", state.landscape); drawLandscapes();
    if (state.quiz) nextQuestion(); else speak();
  }

  /* ------------------------------------------------------------ ρώτα με */
  /* Questions to answer on the keys: the map hides, you play, the teacher
     corrects. Score counts first tries. */
  function startQuiz() {
    clearTimeout(state.settleTimer);
    state.quiz = {n: 0, right: 0, asked: 0};
    $("quiz-button").classList.add("on");
    nextQuestion();
  }
  function stopQuiz() {
    if (!state.quiz) return;
    clearTimeout(state.quiz.timer);
    state.quiz = null;
    $("quiz-button").classList.remove("on");
    $("quiz-actions").hidden = true;
    $("board").classList.remove("quiz");
    state.latched.clear(); state.current = []; state.previous = []; state.history = [];
    speak();
  }
  function nextQuestion() {
    const quiz = state.quiz;
    if (!quiz) return;
    clearTimeout(quiz.timer);
    quiz.q = T.quizQuestion(state.landscape, quiz.n);
    quiz.n += 1; quiz.tried = false; quiz.done = false; quiz.lines = [];
    state.latched = new Set(quiz.q.setup);
    state.current = T.clean(quiz.q.setup); state.previous = []; state.history = [];
    state.items = []; state.selected = -1;
    keys.setSuggestions([]);
    renderQuiz();
    if (state.sound && quiz.q.setup.length) playChord(quiz.q.setup, 0, .9);
  }
  function renderQuiz() {
    const quiz = state.quiz, q = quiz.q;
    document.documentElement.style.setProperty("--suggest", landscape().color);
    $("lens-line").textContent = "Ρώτα με · ερώτηση " + quiz.n + (quiz.asked ? " · σωστές με την πρώτη " + quiz.right + "/" + quiz.asked : "");
    $("t-title").hidden = false;
    $("t-title").textContent = q.ask;
    const how = q.setup.length ? "Το " + NAMES[pc(q.setup[0])] + " κρατιέται μόνο του. Πάτα την απάντηση στο MIDI ή με κλικ· ο χάρτης κρύβεται για να θυμηθείς."
      : "Παίξε στο MIDI ή με κλικ. Ο δάσκαλος ακούει κάθε βήμα.";
    const solved = quiz.done ? T.display(state.current, state.landscape) : null;
    showDisplay(solved || {big: q.setup.length ? T.display(q.setup, state.landscape).big + " + ;" : ";", alt: "", inv: -1}, solved ? "" : "Ρώτα με", false);
    $("meter").classList.add("off"); $("meter-word").textContent = ""; $("meter-fill").style.width = "0";
    const ICON = {yes: "✓", no: "✕", did: "↳", if: "→", fact: "·"};
    $("t-lines").innerHTML = (quiz.lines.length ? [] : [["fact", how]]).concat(quiz.lines).map(([kind, text]) => "<li class=\"line " + kind + "\"><i aria-hidden=\"true\">" + ICON[kind] + "</i><span>" + escape(text) + "</span></li>").join("");
    $("quiz-actions").hidden = false;
    $("board").classList.add("quiz");
    $("next").hidden = true;
    $("path").innerHTML = "";
    renderKeys();
    drawStrip();
  }
  function answer() {
    const quiz = state.quiz, q = quiz.q;
    const result = q.check(state.current, state.previous);
    if (result.state === "wait") { renderKeys(); return; }
    if (result.state === "progress") quiz.lines = [["did", result.text]];
    else if (result.state === "ok") {
      if (!quiz.done) { quiz.done = true; quiz.asked += 1; if (!quiz.tried) quiz.right += 1; }
      quiz.lines = [["yes", "Σωστά. " + result.text]];
      clearTimeout(quiz.timer);
      quiz.timer = setTimeout(nextQuestion, 2600);
    } else {
      quiz.tried = true;
      quiz.lines = [["no", result.text], ["if", q.hint]];
    }
    renderQuiz();
  }
  function reveal() {
    const quiz = state.quiz;
    if (!quiz) return;
    quiz.tried = true;
    const ref = quiz.q.setup.length ? quiz.q.setup[0] : null, a = T.analyze(quiz.q.answer);
    const items = quiz.q.answer.filter(p => !state.current.includes(p)).map(p => ({pitch: p, kind: "add", name: ref === null ? a.name(p) : T.spellOver(ref, p),
      role: ref === null ? "" : T.ivName(p - ref).short}));
    quiz.lines = quiz.lines.filter(l => l[0] !== "if").concat([["if", quiz.q.show + " " + quiz.q.hint]]);
    renderQuiz();
    keys.setSuggestions(items);
    octaveLabels();
    if (state.sound) playSequence(quiz.q.demo);
  }
  function skip() {
    const quiz = state.quiz;
    if (!quiz) return;
    if (!quiz.done) quiz.asked += 1;
    nextQuestion();
  }
  function cycleLandscape(delta) {
    const index = L.LANDSCAPES.findIndex(l => l.id === state.landscape);
    selectLandscape(L.LANDSCAPES[wrap(index + delta, L.LANDSCAPES.length)].id);
  }

  function onMidi(event) {
    const [status, data1, data2 = 0] = event.data || [];
    const type = status & 0xf0, channel = status & 0x0f;
    if (channel === 9) {                      // pads: controls, not notes
      if (type === 0x90 && data2 > 0) ({36: () => step(-1), 37: () => step(1), 38: listen, 39: () => cycleLandscape(1)})[data1]?.();
      return;
    }
    if (type === 0x90 && data2 > 0) { state.held.set(data1, data2); state.sustained.delete(data1); }
    else if (type === 0x80 || (type === 0x90 && data2 === 0)) { state.held.delete(data1); if (state.sustain) state.sustained.add(data1); }
    else if (type === 0xb0 && data1 === 64) { state.sustain = data2 >= 64; if (!state.sustain) state.sustained.clear(); }
    else if (type === 0xb0 && (data1 === 120 || data1 === 123)) { state.held.clear(); state.sustained.clear(); }
    else return;
    renderKeys();
    settle(false);
  }
  function midiStatus() {
    const target = $("midi-status");
    if (!state.access) return;
    const names = [...state.access.inputs.values()].filter(i => i.state !== "disconnected").map(i => i.name);
    target.textContent = names.length ? "MIDI: " + names.join(", ") : "Δεν βρέθηκε πληκτρολόγιο MIDI. Σύνδεσέ το και περίμενε λίγο.";
    target.classList.toggle("idle", !names.length);
    $("midi-button").hidden = true;
  }
  function bindInputs() {
    if (!state.access) return;
    for (const input of state.access.inputs.values()) input.onmidimessage = onMidi;
    midiStatus();
    // On Windows without multi-client MIDI another program (e.g. Ableton) can
    // hold the keyboard exclusively; the port then never opens.
    setTimeout(() => {
      const busy = [...state.access.inputs.values()].filter(i => i.state === "connected" && i.connection !== "open").map(i => i.name);
      if (busy.length) {
        $("midi-status").textContent = "MIDI: " + busy.join(", ") + " — πιασμένο από άλλη εφαρμογή (π.χ. Ableton). Στα Windows χωρίς τη νέα υπηρεσία MIDI άνοιξε πρώτα το Chord Lab ή κλείσε την άλλη εφαρμογή.";
        $("midi-status").classList.add("idle");
      }
    }, 1500);
  }
  async function enableMidi() {
    const target = $("midi-status");
    if (!navigator.requestMIDIAccess) {
      target.textContent = "Αυτός ο browser δεν υποστηρίζει MIDI (π.χ. Safari). Άνοιξε το Chord Lab από το start_chordlab_mac.command ή σε Chrome/Edge.";
      target.classList.add("idle"); return;
    }
    try { state.access = await navigator.requestMIDIAccess({sysex: false}); }
    catch (error) { target.textContent = "Δεν δόθηκε πρόσβαση στο MIDI. Επίτρεψέ το από το εικονίδιο στη γραμμή διευθύνσεων και πάτα «Σύνδεση MIDI»."; target.classList.add("idle"); return; }
    state.access.onstatechange = bindInputs;
    bindInputs();
  }

  /* ------------------------------------------------------------ controls */
  function drawLandscapes() {
    $("landscapes").innerHTML = L.LANDSCAPES.map(l => "<button type=\"button\" role=\"radio\" class=\"lens" + (l.id === state.landscape ? " selected" : "") +
      "\" aria-checked=\"" + (l.id === state.landscape) + "\" data-landscape=\"" + l.id + "\" style=\"--tone:" + l.color + "\" title=\"" + escape(l.short) + "\">" + escape(l.name.split(" / ")[0]) + "</button>").join("");
  }

  $("key-tonic").innerHTML = NAMES.map((name, i) => "<option value=\"" + i + "\">" + name + "</option>").join("");
  $("key-tonic").value = String(state.tonic); $("key-mode").value = state.mode;
  $("key-tonic").addEventListener("change", () => { state.tonic = Number($("key-tonic").value); store("cl-tonic", state.tonic); speak(); });
  $("key-mode").addEventListener("change", () => { state.mode = $("key-mode").value; store("cl-mode", state.mode); speak(); });
  $("sound-toggle").checked = state.sound;
  $("sound-toggle").addEventListener("change", () => { state.sound = $("sound-toggle").checked; store("cl-sound", state.sound ? "1" : "0"); });
  $("map-toggle").checked = state.map;
  $("map-toggle").addEventListener("change", () => { state.map = $("map-toggle").checked; store("cl-map", state.map ? "1" : "0"); paintMap(); drawStrip(); });
  $("clear-button").addEventListener("click", () => { if (state.quiz) stopQuiz(); else clearAll(); });
  $("quiz-button").addEventListener("click", () => { if (state.quiz) stopQuiz(); else startQuiz(); });
  $("quiz-show").addEventListener("click", reveal);
  $("quiz-skip").addEventListener("click", skip);
  $("quiz-stop").addEventListener("click", stopQuiz);
  $("midi-button").addEventListener("click", enableMidi);
  $("listen-button").addEventListener("click", listen);
  $("prev-button").addEventListener("click", () => step(-1));
  $("next-button").addEventListener("click", () => step(1));
  $("landscapes").addEventListener("click", event => { const button = event.target.closest("[data-landscape]"); if (button) selectLandscape(button.dataset.landscape); });
  $("next").addEventListener("click", event => {
    if (event.target.closest("[data-keep]")) { keep(); return; }
    const button = event.target.closest("[data-item]");
    if (!button) return;
    const index = Number(button.dataset.item);
    if (index === state.selected) { listen(); return; }
    select(index);
    if (state.sound) listen();
  });
  $("t-lines").addEventListener("click", event => {
    const chip = event.target.closest("[data-try]");
    if (!chip || !state.view || !state.view.tryChips) return;
    const alt = state.view.tryChips.items[Number(chip.dataset.try)];
    const t = state.view.transition, rejected = t && t.added.length ? t.added[t.added.length - 1] : null;
    const to = state.current.filter(p => p !== rejected).concat(alt.pitch).sort((a, b) => a - b);
    state.items = state.view.cards.concat(state.view.routes).concat([{kind: "move", to, moved: rejected === null ? [] : [{from: rejected, to: alt.pitch}], label: alt.label, why: ""}]);
    select(state.items.length - 1);
    if (state.sound) playSequence([state.current, to]);
  });
  $("path").addEventListener("click", event => { const button = event.target.closest("[data-path]"); if (button) restore(Number(button.dataset.path)); });
  document.addEventListener("keydown", event => {
    if (event.target.closest("select, input")) return;
    if (event.key === "ArrowRight") { step(1); event.preventDefault(); }
    else if (event.key === "ArrowLeft") { step(-1); event.preventDefault(); }
    else if (event.key === "ArrowDown") { cycleLandscape(1); event.preventDefault(); }
    else if (event.key === "ArrowUp") { cycleLandscape(-1); event.preventDefault(); }
    else if (event.key === " ") { listen(); event.preventDefault(); }
    else if (event.key === "Enter" && state.selected >= 0) { keep(); event.preventDefault(); }
    else if (event.key === "Escape") { if (state.quiz) stopQuiz(); else if (state.selected >= 0) select(-1); else clearAll(); }
  });
  window.addEventListener("resize", () => drawStrip());

  function showTab(name) {
    ["live", "theory"].forEach(tab => {
      $(tab).hidden = tab !== name;
      $("tab-" + tab).classList.toggle("active", tab === name);
      $("tab-" + tab).setAttribute("aria-selected", String(tab === name));
    });
    if (name === "live") requestAnimationFrame(drawStrip);
  }
  $("tab-live").addEventListener("click", () => showTab("live"));
  $("tab-theory").addEventListener("click", () => showTab("theory"));

  /* ------------------------------------------------------------ theory */
  const INTERVAL_EN = ["P8", "m2", "M2", "m3", "M3", "P4", "A4 / d5", "P5", "m6", "M6", "m7", "M7"];
  function drawTheory() {
    const ivRows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0].map(n => {
      const iv = T.IV[n];
      return "<tr><td><b>" + escape(n ? iv.short : "8") + "</b><small>" + escape(INTERVAL_EN[n]) + " · " + (n || 12) + " ημιτ.</small></td><td>" + escape(iv.char) +
        "</td><td><span class=\"calm\" style=\"--v:" + iv.stab + "\"></span></td><td>" + escape(iv.go) + "</td><td><button type=\"button\" class=\"tbtn\" data-iv=\"" + (n || 12) + "\">Άκου</button></td></tr>";
    }).join("");
    const intervals = "<article class=\"card wide\"><h2>Σκέψη με διαστήματα</h2>" +
      "<p class=\"idea\">Κάθε νότα που προσθέτεις είναι ένα διάστημα πάνω από το μπάσο. Κάθε διάστημα έχει χαρακτήρα και τάση: κάπου θέλει να πάει. Μάθε τις τάσεις και θα ξέρεις την επόμενη κίνηση πριν την παίξεις.</p>" +
      "<table class=\"iv-table\"><thead><tr><th>Διάστημα</th><th>Χαρακτήρας</th><th>Ηρεμία</th><th>Πού πάει</th><th></th></tr></thead><tbody>" + ivRows + "</tbody></table>" +
      "<p class=\"small\">Γραφή: πρώτα το είδος, μετά ο αριθμός (μ3, Κ5). Μεγαλύτερα από την οκτάβα: μ9, Μ9, Κ11, αυξ11, μ13, Μ13 (η 9η είναι 2η + οκτάβα κ.ο.κ.). Οι ονομασίες οκτάβας είναι επιστημονικές: C4 είναι το μεσαίο Ντο, που στο Ableton λέγεται C3.</p></article>";
    const PLR = [["P", [48, 52, 55], [48, 51, 55], "C → Cm"], ["R", [48, 52, 55], [48, 52, 57], "C → Am/C"], ["L", [48, 52, 55], [47, 52, 55], "C → Em/B"], ["L", [57, 60, 64], [57, 60, 65], "Am → F/A"]];
    const moves = "<article class=\"card wide\"><h2>Κράτα δύο, κίνησε μία</h2>" +
      "<p class=\"idea\">Η πιο απλή μετάβαση: δύο δάχτυλα μένουν, ένα κινείται ημιτόνιο ή τόνο. Από μια μείζονα ή ελάσσονα τριάδα, τρεις τέτοιες κινήσεις δίνουν τρία συγγενικά ακόρντα. Η θεωρία τις λέει P, R, L (νεορημανική θεωρία)· ο δάσκαλος τις ονομάζει όταν τις παίζεις.</p><div class=\"plr\">" +
      PLR.map(([k, a, b, label], i) => "<div><b>" + k + " · " + escape(label) + "</b><span>" + escape(T.PLR_TEXT[k][1]) + "</span><button type=\"button\" class=\"tbtn\" data-plr=\"" + i + "\">Άκου</button></div>").join("") +
      "</div><p class=\"small\">Και άλλες κινήσεις μίας φωνής που αξίζει να ακούς: 4→3 (η καθυστέρηση λύνεται), 7→8 (ο προσαγωγέας κλείνει), ♭6→5 (ο στεναγμός), 8→7→♭7→6 πάνω από την ίδια ρίζα (η κατιούσα γραμμή). Το τρίτονο λύνεται με δύο φωνές: ημιτόνιο η καθεμία, σε αντίθετη κίνηση.</p></article>";
    const ROW = id => {
      const s = T.lensSummary(id), land = L.byId(id);
      const list = items => (items || []).join(" · ") || "—";
      return "<tr style=\"--tone:" + land.color + "\"><td><span class=\"swatch\"></span><b>" + escape(land.name) + "</b></td><td>" + escape(T.LENS[id].want) + "</td><td class=\"y\">" + escape(list(s.yes)) +
        "</td><td class=\"w\">" + escape(list(s.warn)) + "</td><td class=\"n\">" + escape(list(s.no)) + "</td></tr>";
    };
    const lenses = "<article class=\"card wide\"><h2>Πώς ακούει κάθε ύφος</h2><p class=\"idea\">Η ίδια νότα αλλάζει κρίση με το ύφος. Η 5η που στην κλασική αρμονία στερεώνει, στο Takemitsu κλειδώνει την αιώρηση. Ο πίνακας δείχνει τα διαστήματα πάνω από το μπάσο.</p>" +
      "<table class=\"lens-table\"><thead><tr><th>Ύφος</th><th>Θέλει</th><th>Ναι</th><th>Προσοχή</th><th>Όχι</th></tr></thead><tbody>" + L.LANDSCAPES.map(l => ROW(l.id)).join("") + "</tbody></table>" +
      "<p class=\"small\">Γενικεύσεις ύφους για σύνθεση, από σημειώσεις σύνθεσης και αρμονίας. Δεν αναλύουν συγκεκριμένα έργα. Τα βυζαντινά είναι προσεγγίσεις σε 12 ημιτόνια.</p></article>";
    const cards = L.LANDSCAPES.map(land => "<details class=\"card lens-card\" style=\"--tone:" + land.color + "\"><summary><span class=\"swatch\"></span><b>" + escape(land.name) + "</b> <small>" + escape(land.short) + "</small></summary>" +
      "<p class=\"idea\">" + escape(land.idea) + "</p><div class=\"two\"><div><h3>Προτίμα</h3><ul>" + land.prefer.map(x => "<li>" + escape(x) + "</li>").join("") + "</ul></div>" +
      "<div><h3>Απόφυγε</h3><ul>" + land.avoid.map(x => "<li>" + escape(x) + "</li>").join("") + "</ul></div></div>" +
      "<h3>Χρώματα πάνω σε μία νότα</h3><ul class=\"colors\">" + land.colors.map((c, i) => "<li><b>" + escape(c.name) + "</b> <button type=\"button\" class=\"tbtn\" data-try=\"" + land.id + ":" + i + "\">Δοκίμασε</button><br>" + escape(c.why) + "</li>").join("") + "</ul>" +
      "<h3>Επόμενα βήματα</h3><ul>" + land.progressions.map(p => "<li><b>" + escape(p.name) + "</b> · " + escape(p.romans.join(" – ")) + "<br>" + escape(p.why) + "</li>").join("") + "</ul>" +
      "<h3>Στην πράξη</h3><ul>" + land.tips.map(x => "<li>" + escape(x) + "</li>").join("") + "</ul></details>").join("");
    $("theory-content").innerHTML = intervals + moves + lenses + "<div class=\"lens-cards\">" + cards + "</div>";
  }
  $("theory-content").addEventListener("click", event => {
    const iv = event.target.closest("[data-iv]");
    if (iv) { playSequence([[60, 60 + Number(iv.dataset.iv)]]); return; }
    const move = event.target.closest("[data-plr]");
    if (move) {
      const PLR = [[[48, 52, 55], [48, 51, 55]], [[48, 52, 55], [48, 52, 57]], [[48, 52, 55], [47, 52, 55]], [[57, 60, 64], [57, 60, 65]]];
      playSequence(PLR[Number(move.dataset.plr)]); return;
    }
    const button = event.target.closest("[data-try]"); if (!button) return;
    const [id, index] = button.dataset.try.split(":");
    selectLandscape(id);
    state.latched = new Set([48]); state.current = []; state.previous = []; state.history = [];
    showTab("live");
    commit(true);
    const at = state.items.findIndex(item => item.kind === "color" && item.index === Number(index));
    if (at >= 0) { select(at); if (state.sound) listen(); }
  });

  drawLandscapes();
  drawTheory();
  speak();
  enableMidi();
  window.ChordLab = {state, onMidi, listen, step, select, selectLandscape, commit, clearAll, startQuiz, stopQuiz, nextQuestion};
})();
