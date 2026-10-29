/* Live piano keyboard under the piano roll: large horizontal keys that light
   up with the notes sounding now (melody / inner voices / bass). Above the
   keys: the degree and chord, the interval(s) in the middle, the inversion
   and key on the right. Each lit key shows its function in the chord
   (1, ♭3, 5, ♭7, 9 …). Dependency-free; the helpers are exported for tests. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KeyboardView = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  const BLACK = new Set([1, 3, 6, 8, 10]);
  const VOICE_ORDER = ["midi", "bass", "chord", "melody", "inner"];
  const VOICE_NAME = {melody: "Μελωδία", inner: "Μεσαίες φωνές", bass: "Μπάσο", chord: "Συγχορδία", midi: "Παίζεις"};
  const SVG = "http://www.w3.org/2000/svg";
  const pc = pitch => ((pitch % 12) + 12) % 12;

  const isBlack = pitch => BLACK.has(pc(pitch));
  const noteName = pitch => NAMES[pc(pitch)] + (Math.floor(pitch / 12) - 1);
  /* A spelled name with its octave: B♯3 sounds as C4, C♭4 as B3. */
  const spelledName = (pitch, name) => !name ? noteName(pitch) :
    name + (Math.floor(pitch / 12) - 1 - (/^B♯/.test(name) && pc(pitch) === 0 ? 1 : 0) + (/^C♭/.test(name) && pc(pitch) === 11 ? 1 : 0));

  /* ------------------------------------------------------------ intervals */
  const SIMPLE = ["Ταυτοφωνία", "Μικρή 2η", "Μεγάλη 2η", "Μικρή 3η", "Μεγάλη 3η", "Καθαρή 4η",
    "Τρίτονο", "Καθαρή 5η", "Μικρή 6η", "Μεγάλη 6η", "Μικρή 7η", "Μεγάλη 7η"];
  const SHORT = ["1", "μ2", "Μ2", "μ3", "Μ3", "Κ4", "Τρ", "Κ5", "μ6", "Μ6", "μ7", "Μ7"];
  const COMPOUND = {13: "Μικρή 9η", 14: "Μεγάλη 9η", 15: "Μικρή 10η", 16: "Μεγάλη 10η", 17: "Καθαρή 11η",
    18: "Αυξημένη 11η", 19: "Καθαρή 12η", 20: "Μικρή 13η", 21: "Μεγάλη 13η"};
  const COMPOUND_SHORT = {13: "μ9", 14: "Μ9", 15: "μ10", 16: "Μ10", 17: "Κ11", 18: "Α11", 19: "Κ12", 20: "μ13", 21: "Μ13"};

  /* Name of an interval in semitones (any size). */
  function intervalName(semitones) {
    const n = Math.abs(Math.round(semitones));
    if (n === 0) return {long: "Ταυτοφωνία", short: "1", simple: "Ταυτοφωνία", compound: false};
    if (n % 12 === 0) {
      const octaves = n / 12;
      const long = octaves === 1 ? "Οκτάβα" : octaves === 2 ? "Δύο οκτάβες" : octaves + " οκτάβες";
      return {long, short: octaves === 1 ? "8" : octaves + "×8", simple: long, compound: false};
    }
    const simple = SIMPLE[n % 12];
    if (n < 12) return {long: simple, short: SHORT[n], simple, compound: false};
    if (COMPOUND[n]) return {long: COMPOUND[n], short: COMPOUND_SHORT[n], simple, compound: true};
    const octaves = Math.floor(n / 12);
    return {long: simple + " + " + octaves + " οκτάβες", short: SHORT[n % 12] + "+" + octaves + "×8", simple, compound: true};
  }

  /* ------------------------------------------------------------- chords */
  const LETTER = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
  function pitchClass(name) {
    const match = /^([A-Ga-g])([#b♯♭]*)$/.exec(String(name || "").trim());
    if (!match) return null;
    let value = LETTER[match[1].toUpperCase()];
    for (const sign of match[2]) value += sign === "#" || sign === "♯" ? 1 : -1;
    return pc(value);
  }
  const QUALITY = {"": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 7, 10], "maj7": [0, 4, 7, 11], "m7": [0, 3, 7, 10],
    "mmaj7": [0, 3, 7, 11], "6": [0, 4, 7, 9], "m6": [0, 3, 7, 9], "sus2": [0, 2, 7], "sus4": [0, 5, 7],
    "add9": [0, 4, 7, 2], "madd9": [0, 3, 7, 2], "dim": [0, 3, 6], "dim7": [0, 3, 6, 9], "m7b5": [0, 3, 6, 10],
    "aug": [0, 4, 8], "5": [0, 7], "9": [0, 4, 7, 10, 2], "maj9": [0, 4, 7, 11, 2], "m9": [0, 3, 7, 10, 2],
    "7sus4": [0, 5, 7, 10], "13": [0, 4, 7, 10, 2, 9], "11": [0, 4, 7, 10, 2, 5]};

  function parseChord(label) {
    const text = String(label || "").trim().replace(/[()]/g, "");
    if (!text || text === "—" || /^N(\.?C\.?)?$/i.test(text)) return null;
    const match = /^([A-G][#b♯♭]*)([^/]*)(?:\/([A-G][#b♯♭]*))?$/.exec(text);
    if (!match) return null;
    const root = pitchClass(match[1]);
    if (root === null) return null;
    const suffix = match[2].replace(/♭/g, "b").replace(/♯/g, "#");
    const tones = QUALITY[suffix] || null;
    return {root, bass: match[3] ? pitchClass(match[3]) : root, quality: suffix, tones: tones || [0, 4, 7], known: Boolean(tones)};
  }

  /* Function of a pitch inside a chord: 1, ♭3, 3, 5, ♭7, 9, ♯11 … */
  function chordDegree(pitch, chord) {
    if (!chord) return "";
    const i = pc(pitch - chord.root);
    const tones = new Set(chord.tones.map(pc));
    if (tones.has(i)) {
      return {0: "1", 1: "♭9", 2: chord.quality === "sus2" ? "2" : "9", 3: "♭3", 4: "3",
        5: chord.quality.includes("sus4") ? "4" : "11", 6: "♭5", 7: "5", 8: "♯5",
        9: chord.quality === "dim7" ? "𝄫7" : chord.quality.includes("6") ? "6" : "13", 10: "♭7", 11: "7"}[i];
    }
    return {0: "1", 1: "♭9", 2: "9", 3: tones.has(4) ? "♯9" : "♭3", 4: "3", 5: "11", 6: tones.has(7) ? "♯11" : "♭5",
      7: "5", 8: tones.has(7) ? "♭13" : "♯5", 9: "13", 10: "♭7", 11: "7"}[i];
  }

  /* Inversion from a chord symbol such as C/E, G7/F, Am, or from the bass
     note actually sounding (soundingBass, MIDI) when one is given. */
  function inversion(label, soundingBass) {
    const chord = parseChord(label);
    if (!chord) return "";
    const bass = Number.isFinite(soundingBass) ? pc(soundingBass) : chord.bass;
    const interval = pc(bass - chord.root);
    if (interval === 0) return "θεμελιώδης κατάσταση";
    if (interval === 3 || interval === 4) return "1η αναστροφή · τρίτη στο μπάσο";
    if (interval >= 6 && interval <= 8) return "2η αναστροφή · πέμπτη στο μπάσο";
    if (interval >= 9 && interval <= 11) return "3η αναστροφή · έβδομη στο μπάσο";
    return "μπάσο " + NAMES[bass] + " · ξένο προς τη συγχορδία";
  }

  /* What the sounding notes form, read as intervals:
     1 note  -> the note (and its function in the chord)
     2 notes -> the interval between them
     3+      -> the intervals above the bass, plus the outer-voice interval. */
  function describe(pitches, chordLabel) {
    const list = [...new Set((pitches || []).map(p => Math.round(p)).filter(Number.isFinite))].sort((a, b) => a - b);
    const chord = parseChord(chordLabel);
    if (!list.length) return {headline: "—", detail: ""};
    if (list.length === 1) {
      const degree = chordDegree(list[0], chord);
      return {headline: noteName(list[0]), detail: degree ? "μία νότα · " + degree + " της " + chordLabel : "μία νότα"};
    }
    const bass = list[0];
    if (list.length === 2) {
      const name = intervalName(list[1] - bass);
      return {headline: name.long,
              detail: noteName(bass) + " → " + noteName(list[1]) + (name.compound ? " · απλό: " + name.simple.toLowerCase() : "")};
    }
    const outer = intervalName(list[list.length - 1] - bass);
    return {headline: stack(list, chord),
            detail: "πάνω από το μπάσο " + noteName(bass) + " · ακραίες φωνές: " + outer.long.toLowerCase()};
  }

  /* Greek interval abbreviation above the bass. The tritone and the
     augmented fifth take their name from the note's role in the chord:
     ♭5 -> ελ5, ♯11 -> αυξ4, ♯5 -> αυξ5. */
  function shortInterval(semitones, upperPitch, chord) {
    const n = pc(semitones);
    if (semitones !== 0 && n === 0) return "8";
    const role = chordDegree(upperPitch, chord);
    if (n === 6) return role === "♯11" || role === "11" ? "αυξ4" : "ελ5";
    if (n === 8) return role === "♯5" ? "αυξ5" : "μ6";
    return SHORT[n];
  }

  /* All intervals above the lowest note, simple, low to high, once each:
     e.g. E–G–C -> "μ3 – μ6", G–B–D–F -> "Μ3 – Κ5 – μ7". */
  function stack(pitches, chord) {
    const list = [...new Set((pitches || []).map(p => Math.round(p)).filter(Number.isFinite))].sort((a, b) => a - b);
    if (list.length < 2) return list.length ? noteName(list[0]) : "—";
    const bass = list[0];
    const seen = new Map();
    list.slice(1).forEach(pitch => {
      const n = pitch - bass;
      const order = pc(n) === 0 ? 12 : pc(n);
      if (!seen.has(order)) seen.set(order, shortInterval(n, pitch, chord));
    });
    return [...seen.entries()].sort((a, b) => a[0] - b[0]).map(([, text]) => text).join(" – ");
  }

  /* Interval line for a whole chord (harmony voices only, no melody): it
     stays put while the chord lasts. */
  function harmonyIntervals(pitches, chordLabel) {
    const list = [...new Set((pitches || []).map(p => Math.round(p)).filter(Number.isFinite))].sort((a, b) => a - b);
    const chord = parseChord(chordLabel);
    if (!list.length) return {headline: "—", detail: ""};
    if (list.length === 1) return {headline: noteName(list[0]), detail: "μία νότα στην αρμονία"};
    if (list.length === 2) {
      const name = intervalName(list[1] - list[0]);
      return {headline: name.long, detail: noteName(list[0]) + " → " + noteName(list[1]) + " · χωρίς τη μελωδία"};
    }
    return {headline: stack(list, chord), detail: "πάνω από το μπάσο " + noteName(list[0]) + " · χωρίς τη μελωδία"};
  }

  /* Interval line of a detected chord: its own tones as simple intervals above
     its bass, low to high, plus a tension only when it sounds for most of the
     chord (presence: pitch class → share of the chord, 0..1). It changes only
     when the chord changes and never includes the melody, so passing notes
     and arpeggio steps cannot make it flicker. */
  function chordIntervals(chordLabel, presence) {
    const chord = parseChord(chordLabel);
    if (!chord || !chord.known) return null;
    const pcs = new Set(chord.tones.map(t => pc(chord.root + t)));
    const added = [];
    for (const [pitchClass, share] of [...(presence || new Map())].sort((a, b) => b[1] - a[1])) {
      if (share >= .45 && !pcs.has(pc(pitchClass)) && pcs.size < 6) { pcs.add(pc(pitchClass)); added.push(NAMES[pc(pitchClass)]); }
    }
    pcs.delete(chord.bass);
    const offsets = [...pcs].map(p => pc(p - chord.bass)).sort((a, b) => a - b);
    if (!offsets.length) return {headline: NAMES[chord.bass], detail: "μία νότα στην αρμονία"};
    const headline = offsets.map(n => shortInterval(n, 48 + chord.bass + n, chord)).join(" – ");
    return {headline, detail: "πάνω από το μπάσο " + NAMES[chord.bass] + (added.length ? " · + " + added.join(", ") + " κρατημένη" : "") + " · χωρίς τη μελωδία"};
  }

  /* -------------------------------------------------------------- layout */
  /* Whole octaves from C to C that cover the piece, at least four octaves,
     clamped to the 88-key piano (A0..C8). */
  function rangeFor(pitches) {
    const valid = (pitches || []).filter(p => Number.isFinite(p) && p >= 0 && p <= 127);
    let low = valid.length ? Math.min(...valid) : 36;
    let high = valid.length ? Math.max(...valid) : 84;
    low = Math.floor(low / 12) * 12;
    high = Math.max(Math.ceil(high / 12) * 12, low + 12);
    while (high - low < 48) {
      if (low > 24) low -= 12;
      if (high - low < 48) high += 12;
    }
    return {min: Math.max(21, low), max: Math.min(108, high)};
  }

  /* Key geometry in white-key units: white keys are 1 wide, black keys 0.6
     wide, centred slightly off the gap the way a real keyboard is. */
  function layout(min, max) {
    const offsets = {1: -.08, 3: .08, 6: -.1, 8: 0, 10: .1};
    const keys = [];
    let white = 0;
    for (let pitch = min; pitch <= max; pitch += 1) {
      if (!isBlack(pitch)) {
        keys.push({pitch, black: false, x: white, width: 1});
        white += 1;
      } else {
        keys.push({pitch, black: true, x: white + offsets[pc(pitch)] - .3, width: .6});
      }
    }
    return {keys, whiteCount: white};
  }

  /* One voice per key: bass first (it defines the harmony), then melody.
     A key is "held" (arpeggio / recent note of the chord) only when no
     note on it is sounding at this instant, and "implied" (a chord tone of
     the symbol that was not transcribed) only when nothing else is on it.
     A note may carry its spelled name (G♯ in A minor). */
  function activeMap(notes) {
    const map = new Map();
    (notes || []).forEach(note => {
      const pitch = Math.round(Number(note.pitch));
      if (!Number.isFinite(pitch)) return;
      const entry = map.get(pitch) || {voices: new Set(), sounding: false, real: false, name: ""};
      entry.voices.add(note.track || "melody");
      entry.sounding = entry.sounding || !note.held;
      entry.real = entry.real || !note.implied;
      entry.name = entry.name || (note.name ? String(note.name) : "");
      map.set(pitch, entry);
    });
    const result = new Map();
    map.forEach((entry, pitch) => {
      const main = VOICE_ORDER.find(v => entry.voices.has(v)) || "melody";
      result.set(pitch, {voice: main, voices: [...entry.voices], held: !entry.sounding, implied: !entry.real, name: entry.name});
    });
    return result;
  }

  /* Arpeggio in one voice: several short notes cycling over 2–4 pitches
     inside the window. Returns the set of pitches, or null. */
  function arpeggio(notes, {maxDuration = .36, minNotes = 3} = {}) {
    if (!notes || notes.length < minNotes) return null;
    const durations = notes.map(n => n.end - n.start).sort((a, b) => a - b);
    const median = durations[Math.floor(durations.length / 2)];
    const pitches = new Set(notes.map(n => Math.round(n.pitch)));
    if (median > maxDuration || pitches.size < 2 || pitches.size > 4 || notes.length <= pitches.size) return null;
    return pitches;
  }

  const UNIT = 30;
  const HEIGHT = 232;
  const music = value => String(value || "").replace(/b(?=[IVXivx])/g, "♭").replace(/#(?=[IVXivx])/g, "♯")
    .replace(/([A-G])b/g, "$1♭").replace(/([A-G])#/g, "$1♯");

  class View {
    constructor({container, chord, degree, inversionLabel, keyLabel, interval, intervalDetail, notesLabel, alternatives, arp, caption, onPress}) {
      Object.assign(this, {container, chordEl: chord, degreeEl: degree, inversionEl: inversionLabel, keyEl: keyLabel,
                           intervalEl: interval, intervalDetailEl: intervalDetail, notesEl: notesLabel, alternativesEl: alternatives,
                           arpEl: arp, captionEl: caption});
      this.intervalSignature = "";
      this.onPress = typeof onPress === "function" ? onPress : null;
      this.range = null;
      this.elements = new Map();
      this.signature = "";
      this.chordSignature = "";
      this.chordLabel = "";
    }

    setRange(min, max) {
      if (this.range && this.range.min === min && this.range.max === max) return;
      this.range = {min, max};
      const {keys, whiteCount} = layout(min, max);
      const svg = document.createElementNS(SVG, "svg");
      svg.setAttribute("viewBox", `0 0 ${whiteCount * UNIT} ${HEIGHT + 6}`);
      svg.setAttribute("class", "live-keys-svg");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "Πληκτρολόγιο πιάνου " + noteName(min) + "–" + noteName(max));
      const defs = document.createElementNS(SVG, "defs");
      defs.innerHTML =
        '<linearGradient id="kv-white" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--key-white-top)"/><stop offset=".86" stop-color="var(--key-white)"/><stop offset="1" stop-color="var(--key-white-edge)"/></linearGradient>' +
        '<linearGradient id="kv-black" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f3a"/><stop offset=".78" stop-color="#1d201d"/><stop offset="1" stop-color="#0f110f"/></linearGradient>' +
        '<pattern id="kv-stripes" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="7" fill="rgba(255,255,255,.42)"/></pattern>';
      svg.appendChild(defs);
      this.elements = new Map();
      const draw = key => {
        const group = document.createElementNS(SVG, "g");
        group.setAttribute("class", "kv-key " + (key.black ? "kv-black" : "kv-white"));
        group.dataset.pitch = String(key.pitch);
        const x = key.x * UNIT + (key.black ? 0 : .6);
        const w = key.width * UNIT - (key.black ? 0 : 1.2);
        const h = key.black ? HEIGHT * .62 : HEIGHT;
        const rect = document.createElementNS(SVG, "rect");
        rect.setAttribute("x", x.toFixed(2));
        rect.setAttribute("y", "-6");
        rect.setAttribute("width", w.toFixed(2));
        rect.setAttribute("height", (h + 6).toFixed(2));
        rect.setAttribute("rx", key.black ? "3.5" : "5");
        rect.setAttribute("class", "kv-face");
        group.appendChild(rect);
        const hatch = rect.cloneNode();
        hatch.setAttribute("class", "kv-hatch");
        group.appendChild(hatch);
        const degree = document.createElementNS(SVG, "text");
        degree.setAttribute("x", (x + w / 2).toFixed(2));
        degree.setAttribute("y", (h - (key.black ? 32 : 40)).toFixed(2));
        degree.setAttribute("class", "kv-degree");
        group.appendChild(degree);
        const dot = document.createElementNS(SVG, "circle");
        dot.setAttribute("cx", (x + w / 2).toFixed(2));
        dot.setAttribute("cy", (h - (key.black ? 54 : 66)).toFixed(2));
        dot.setAttribute("r", key.black ? "4" : "5");
        dot.setAttribute("class", "kv-dot");
        group.appendChild(dot);
        const label = document.createElementNS(SVG, "text");
        label.setAttribute("x", (x + w / 2).toFixed(2));
        label.setAttribute("y", (h - (key.black ? 11 : 14)).toFixed(2));
        label.setAttribute("class", "kv-label");
        label.textContent = !key.black && key.pitch % 12 === 0 ? noteName(key.pitch) : "";
        group.appendChild(label);
        const title = document.createElementNS(SVG, "title");
        title.textContent = noteName(key.pitch);
        group.appendChild(title);
        if (this.onPress) group.addEventListener("pointerdown", event => { event.preventDefault(); this.onPress(key.pitch); });
        svg.appendChild(group);
        this.elements.set(key.pitch, {group, label, degree, title, black: key.black});
      };
      keys.filter(k => !k.black).forEach(draw);
      keys.filter(k => k.black).forEach(draw);
      this.container.replaceChildren(svg);
      this.signature = "";
      this.suggestionSignature = "";
    }

    /* notes: [{pitch, track, held, implied, name}]. With describe=false
       (track playback) the interval line is set by setIntervals. bass: the
       pitch that decides the inversion (NaN: the symbol decides); without
       it, the lowest bass key does. */
    setActive(notes, {describe: autoDescribe = true, bass} = {}) {
      const map = activeMap(notes);
      const signature = this.chordLabel + "|" + autoDescribe + "|" + bass + "|" + [...map.entries()].sort((a, b) => a[0] - b[0])
        .map(([p, v]) => p + v.voice + (v.held ? "h" : "") + (v.implied ? "i" : "") + v.name).join(",");
      if (signature === this.signature) return;
      this.signature = signature;
      this.activeKeys = map;
      const chord = parseChord(this.chordLabel);
      this.elements.forEach((element, pitch) => {
        const active = map.get(pitch);
        element.group.classList.remove("kv-on", "kv-melody", "kv-inner", "kv-bass", "kv-chord", "kv-midi", "kv-held", "kv-implied");
        element.label.textContent = !element.black && pitch % 12 === 0 ? noteName(pitch) : "";
        element.degree.textContent = "";
        element.title.textContent = noteName(pitch);
        if (active) {
          const degree = chordDegree(pitch, chord);
          element.group.classList.add("kv-" + active.voice, active.implied ? "kv-implied" : "kv-on");
          if (active.held && !active.implied) element.group.classList.add("kv-held");
          element.label.textContent = active.name || NAMES[pc(pitch)];
          element.degree.textContent = degree;
          element.title.textContent = spelledName(pitch, active.name) + (degree ? " · " + degree : "") + " · " +
            active.voices.map(v => VOICE_NAME[v] || v).join(", ") + (active.implied ? " · από το σύμβολο, δεν βρέθηκε ως νότα" :
            active.held ? " · αρπέζ / κρατημένη στη συγχορδία" : "");
        }
      });
      // The inversion follows the bass that sounds now, not only the symbol.
      const bassPitches = [...map.entries()].filter(([, v]) => v.voices.includes("bass")).map(([p]) => p);
      const lowest = bass !== undefined ? Number(bass) : bassPitches.length ? Math.min(...bassPitches) : map.size ? Math.min(...map.keys()) : NaN;
      if (this.inversionEl) this.inversionEl.textContent = inversion(this.chordLabel, lowest);
      if (autoDescribe) {
        const description = describe([...map.keys()], this.chordLabel ? music(this.chordLabel) : "");
        this.setIntervals(description.headline, description.detail, false);
      }
      if (this.notesEl) {
        const parts = ["midi", "melody", "inner", "chord", "bass"].map(voice => {
          const pitches = [...map.entries()].filter(([, v]) => v.voices.includes(voice)).map(([p]) => p).sort((a, b) => a - b);
          return pitches.length ? VOICE_NAME[voice] + ": " + pitches.map(p => {
            const entry = map.get(p), notes = [chord ? chordDegree(p, chord) : "", entry.implied ? "σύμβολο" : ""].filter(Boolean);
            return spelledName(p, entry.name) + (notes.length ? " (" + notes.join(", ") + ")" : "");
          }).join(" ") : "";
        }).filter(Boolean);
        this.notesEl.textContent = parts.join("   ·   ") || "—";
      }
      if (this.suggestions && this.suggestions.size) this._paintSuggestions();
    }

    /* Suggested keys in their own colour (items: {pitch, kind: "add" |
       "scale" | "remove", role, optional}). A pressed key is never hidden:
       "add" applies only to keys that are not pressed, "scale" draws a dot,
       "remove" outlines a pressed key the style would leave out. */
    setSuggestions(items) {
      const next = new Map();
      (items || []).forEach(item => {
        const pitch = Math.round(Number(item.pitch));
        if (Number.isFinite(pitch) && (!next.has(pitch) || item.kind !== "scale")) next.set(pitch, item);
      });
      const signature = [...next.entries()].map(([p, i]) => p + i.kind + (i.role || "") + (i.optional ? "o" : "")).join(",");
      if (signature === this.suggestionSignature) return;
      this.suggestionSignature = signature;
      const previous = this.suggestions || new Map();
      this.suggestions = next;
      this._paintSuggestions(previous);
    }

    _paintSuggestions(previous = new Map()) {
      const active = this.activeKeys || new Map();
      this.elements.forEach((element, pitch) => {
        const item = this.suggestions.get(pitch);
        const had = previous.has(pitch) || element.group.classList.contains("kv-suggest");
        element.group.classList.remove("kv-suggest", "kv-suggest-optional", "kv-scale", "kv-remove");
        if (!item) {
          if (had && !active.has(pitch)) {
            element.label.textContent = !element.black && pitch % 12 === 0 ? noteName(pitch) : "";
            element.degree.textContent = "";
            element.title.textContent = noteName(pitch);
          }
          return;
        }
        if (item.kind === "scale") { element.group.classList.add("kv-scale"); return; }
        if (item.kind === "remove") { if (active.has(pitch)) element.group.classList.add("kv-remove"); return; }
        if (active.has(pitch)) return;
        element.group.classList.add("kv-suggest");
        if (item.optional) element.group.classList.add("kv-suggest-optional");
        element.label.textContent = item.name || NAMES[pc(pitch)];
        element.degree.textContent = item.role || "";
        element.title.textContent = noteName(pitch) + " · πρόταση" + (item.role ? " · " + item.role : "") + (item.optional ? " · προαιρετική" : "");
      });
    }

    setCaption(text) {
      if (this.captionEl && this.captionEl.textContent !== text) this.captionEl.textContent = text || "";
    }

    setIntervals(headline, detail, arp) {
      const signature = headline + "|" + detail + "|" + Boolean(arp);
      if (signature === this.intervalSignature) return;
      this.intervalSignature = signature;
      if (this.intervalEl) this.intervalEl.textContent = headline || "—";
      if (this.intervalDetailEl) this.intervalDetailEl.textContent = detail || "";
      if (this.arpEl) this.arpEl.hidden = !arp;
    }

    setChord(label, roman, keyText, alternatives) {
      const text = label && label !== "N" && label !== "—" ? String(label) : "";
      const others = (alternatives || []).filter(Boolean);
      const signature = text + "|" + String(roman) + "|" + String(keyText || "") + "|" + others.join(",");
      if (signature === this.chordSignature) return;
      this.chordSignature = signature;
      this.chordLabel = text;
      if (this.degreeEl) this.degreeEl.textContent = roman && roman !== "N" && roman !== "—" ? music(roman) : "—";
      if (this.chordEl) this.chordEl.textContent = text ? music(text) : "";
      if (this.inversionEl) this.inversionEl.textContent = inversion(text);
      if (this.keyEl) this.keyEl.textContent = keyText ? "Τονικότητα: " + keyText : "";
      if (this.alternativesEl) this.alternativesEl.textContent = others.length ? "ή " + others.map(music).join(" · ") : "";
      this.signature = "";
    }
  }

  return {View, layout, rangeFor, inversion, activeMap, noteName, spelledName, isBlack, intervalName, describe, chordDegree, parseChord, music, chordIntervals,
          stack, harmonyIntervals, arpeggio, shortInterval};
});
