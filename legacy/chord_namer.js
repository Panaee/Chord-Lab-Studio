/* Chord names from notes you play (MIDI), and Roman-numeral degrees.

   The name of a chord comes from its ROOT, the note the chord is built on in
   thirds, not from the lowest note. The lowest note only decides the
   inversion: C–E–G with E at the bottom is still C major, written C/E.
   When the same notes allow two readings (C6 = Am7/C), the bass decides
   which one is preferred. Dependency-free; exported for node tests. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ChordNamer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SHARP = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const pc = value => ((value % 12) + 12) % 12;

  /* quality: [tones, optional tones, complexity]. The fifth is optional
     where it is perfect; altered fifths are required. */
  const QUALITIES = [
    ["", [0, 4, 7], [7], 0], ["m", [0, 3, 7], [7], 0], ["7", [0, 4, 7, 10], [7], .3],
    ["maj7", [0, 4, 7, 11], [7], .35], ["m7", [0, 3, 7, 10], [7], .3], ["mmaj7", [0, 3, 7, 11], [7], .6],
    ["6", [0, 4, 7, 9], [7], .7], ["m6", [0, 3, 7, 9], [7], .7], ["dim", [0, 3, 6], [], .4],
    ["dim7", [0, 3, 6, 9], [], .5], ["m7b5", [0, 3, 6, 10], [], .45], ["aug", [0, 4, 8], [], .5],
    ["sus4", [0, 5, 7], [], .4], ["sus2", [0, 2, 7], [], .5], ["7sus4", [0, 5, 7, 10], [], .55],
    ["5", [0, 7], [], .2],
  ];
  /* Added tones: semitones above the root -> written tension. */
  const TENSION = {1: "b9", 2: "9", 3: "#9", 5: "11", 6: "#11", 8: "b13", 9: "13"};

  function format(quality, extras) {
    const ext = new Set(extras);
    const seventh = ["7", "maj7", "m7", "mmaj7"].includes(quality);
    // Stacked extensions on a seventh chord: C7 + 9 -> C9, Cm7 + 9 + 11 -> Cm11.
    if (seventh && ext.has(2) && !ext.has(1) && !ext.has(3)) {
      const base = {"7": "", "maj7": "maj", "m7": "m", "mmaj7": "mMaj"}[quality];
      let top = 9;
      if (ext.has(5)) top = 11;
      if (ext.has(9) && top === 11) top = 13;
      ext.delete(2);
      if (top >= 11) ext.delete(5);
      if (top === 13) ext.delete(9);
      return base + top + [...ext].sort((a, b) => a - b).map(i => "(" + TENSION[i] + ")").join("");
    }
    if ((quality === "" || quality === "m") && ext.size === 1 && ext.has(2)) return quality + "add9";
    if (quality === "6" && ext.size === 1 && ext.has(2)) return "6/9";
    return quality + [...ext].sort((a, b) => a - b).map(i => "(" + TENSION[i] + ")").join("");
  }

  /* The bass of a slash chord is spelled from the root's letter, so a chord
     tone keeps its degree: E/G#, not E/Ab; Bb/D, not Bb/D. */
  const LETTERS = "CDEFGAB", LETTER_PC = [0, 2, 4, 5, 7, 9, 11], STEP = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
  function spellAbove(rootName, semitones, quality) {
    const rootLetter = LETTERS.indexOf(rootName[0]);
    const rootPc = pc(LETTER_PC[rootLetter] + (rootName.includes("#") ? 1 : rootName.includes("b") ? -1 : 0));
    let step = STEP[semitones];
    if (semitones === 6 && /dim|b5/.test(quality)) step = 4;
    if (semitones === 8 && quality === "aug") step = 4;
    if (semitones === 9 && quality === "dim7") step = 6;
    const letter = (rootLetter + step) % 7;
    let diff = pc(rootPc + semitones - LETTER_PC[letter]);
    if (diff > 6) diff -= 12;
    if (Math.abs(diff) > 1) return SHARP[pc(rootPc + semitones)];
    return LETTERS[letter] + (diff === 1 ? "#" : diff === -1 ? "b" : "");
  }

  /* Candidate readings of a set of MIDI pitches, best first. */
  function readings(pitches) {
    const list = [...new Set((pitches || []).map(Number).filter(Number.isFinite).map(Math.round))].sort((a, b) => a - b);
    if (list.length < 2) return [];
    const bass = pc(list[0]);
    const classes = [...new Set(list.map(pc))];
    if (classes.length < 2) return [];
    // Two different notes are an interval, not a chord, except the open
    // fifth (power chord, C5).
    const results = [];
    classes.forEach(rootPc => {
      const intervals = new Set(classes.map(p => pc(p - rootPc)));
      QUALITIES.forEach(([quality, tones, optional, complexity]) => {
        if (quality === "5" && intervals.size !== 2) return;
        if (intervals.size === 2 && quality !== "5") return;
        const required = tones.filter(t => !optional.includes(t));
        if (!required.every(t => intervals.has(t))) return;
        const extras = [...intervals].filter(i => !tones.includes(i));
        if (!extras.every(i => TENSION[i])) return;
        // No altered or doubled thirds: a #9 needs a major third, b3 is not a tension of minor.
        if (extras.includes(3) && !tones.includes(4)) return;
        if (extras.includes(8) && tones.includes(8)) return;
        const matched = tones.filter(t => intervals.has(t)).length;
        let score = matched * 2 - extras.length * 1.1 - complexity;
        if (rootPc === bass) score += 1.6;
        else if (tones.includes(pc(bass - rootPc))) score += .4;   // inversion
        else score -= .8;                                           // non-chord bass
        if (!intervals.has(7) && optional.includes(7)) score -= .35;
        const symbol = SHARP[rootPc] + format(quality, extras);
        const label = symbol + (rootPc !== bass ? "/" + spellAbove(SHARP[rootPc], pc(bass - rootPc), quality) : "");
        results.push({label, symbol, root: rootPc, bass, quality, extras, score});
      });
    });
    results.sort((a, b) => b.score - a.score);
    const seen = new Set();
    return results.filter(r => !seen.has(r.label) && seen.add(r.label));
  }

  function nameChord(pitches) {
    const all = readings(pitches);
    if (!all.length) return null;
    const best = all[0];
    return {...best, alternatives: all.slice(1).filter(r => best.score - r.score <= 1.6).slice(0, 2).map(r => r.label)};
  }

  /* Roman numeral of a chord root in a key (no inversion suffix). */
  const MODES = {major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10], harmonic_minor: [0, 2, 3, 5, 7, 8, 11], melodic_minor: [0, 2, 3, 5, 7, 9, 11],
    ionian: [0, 2, 4, 5, 7, 9, 11], aeolian: [0, 2, 3, 5, 7, 8, 10]};
  const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

  function roman(chord, tonicPc, mode) {
    if (!chord || !Number.isFinite(tonicPc)) return "";
    const name = String(mode || "major").toLowerCase();
    const scale = MODES[name] || (name.includes("minor") || name === "blues" ? MODES.minor : MODES.major);
    const relative = pc(chord.root - tonicPc);
    let degree = scale.indexOf(relative), accidental = "";
    if (degree < 0) {
      const options = scale.map((value, index) => [((relative - value + 6) % 12 + 12) % 12 - 6, index]);
      options.sort((a, b) => Math.abs(a[0]) - Math.abs(b[0]) || a[0] - b[0]);
      const [shift, index] = options[0];
      degree = index;
      accidental = shift > 0 ? "♯".repeat(shift) : "♭".repeat(-shift);
    }
    const q = chord.quality;
    const minor = q.startsWith("m") && !q.startsWith("maj") || q === "dim" || q === "dim7" || q === "m7b5";
    const numeral = minor ? NUMERALS[degree].toLowerCase() : NUMERALS[degree];
    const suffix = {"": "", m: "", dim: "°", dim7: "°7", m7b5: "ø7", aug: "+", m7: "7", m6: "6", mmaj7: "maj7"}[q];
    return accidental + numeral + (suffix !== undefined ? suffix : q);
  }

  const pitchClassOf = name => {
    const match = /^([A-Ga-g])([#b♯♭]*)$/.exec(String(name || "").trim());
    if (!match) return NaN;
    let value = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11}[match[1].toUpperCase()];
    for (const sign of match[2]) value += sign === "#" || sign === "♯" ? 1 : -1;
    return pc(value);
  };

  return {nameChord, readings, roman, pitchClassOf};
});
