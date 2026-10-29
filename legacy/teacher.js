/* Chord Lab — ο δάσκαλος.

   Ακούει ό,τι παίζεις και απαντά σε τρία πράγματα:
   1. τι ακούγεται: διάστημα, συγχορδία, ένταση·
   2. πώς το κρίνει το ύφος που διάλεξες: ναι, με προσοχή ή όχι, με την αιτία·
   3. πού μπορείς να πας: μία φωνή κινείται, ή η ίδια νότα μπαίνει σε άλλο ακόρντο.

   Οι κρίσεις είναι γενικεύσεις ύφους για σύνθεση, από την ύλη των τοπίων
   (enorchistrosi, armonia). Δεν αναλύουν συγκεκριμένα έργα.
   Χρειάζεται chord_namer.js, keyboard_view.js, landscapes.js· εξάγεται για node tests. */
(function (root, factory) {
  "use strict";
  const common = typeof module === "object" && module.exports;
  const api = factory(common ? require("./chord_namer.js") : root.ChordNamer,
    common ? require("./keyboard_view.js") : root.KeyboardView,
    common ? require("./landscapes.js") : root.Landscapes);
  if (common) module.exports = api; else root.Teacher = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (CN, KV, L) {
  "use strict";

  /* ------------------------------------------------------------ βασικά */
  const pc = n => ((n % 12) + 12) % 12;
  const NAMES = L.NAMES;
  const clean = list => [...new Set((list || []).map(Number).filter(Number.isFinite).map(Math.round))]
    .filter(p => p >= 0 && p <= 127).sort((a, b) => a - b);
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const LETTERS = "CDEFGAB";
  const DEFAULT_LETTER = [0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
  const STEP = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
  const accidentals = name => (String(name).match(/[♯♭]/g) || []).length + 2 * (String(name).match(/[𝄪𝄫]/g) || []).length;
  const SEVERITY = {no: 3, warn: 2, yes: 1, "": 0};

  /* Chord symbols as the namer writes them (C#m7b5, Cmaj7(#11)), in music type. */
  const pretty = text => String(text || "")
    .replace(/([A-G])#/g, "$1♯").replace(/([A-G])b/g, "$1♭")
    .replace(/\(b(\d+)\)/g, "(♭$1)").replace(/\(#(\d+)\)/g, "(♯$1)")
    .replace(/(\d)b(\d)/g, "$1♭$2").replace(/(\d)#(\d)/g, "$1♯$2")
    .replace(/mmaj7/g, "m(maj7)").replace(/mMaj/g, "m(maj)");

  /* The upper note spelled as an interval over the lower one (D + 6 = G♯);
     the plain name wins when it needs fewer accidentals (B + 6 = F). */
  function spellOver(lower, upper, lowerLetter) {
    const letter = Number.isInteger(lowerLetter) ? lowerLetter : DEFAULT_LETTER[pc(lower)];
    const name = L.spell(pc(upper), letter + STEP[pc(upper - lower)]);
    const plain = NAMES[pc(upper)];
    return /[𝄪𝄫]/.test(name) || accidentals(name) > accidentals(plain) ? plain : name;
  }
  const letterOf = name => LETTERS.indexOf(String(name)[0]);
  const withOctave = (pitch, name) => KV.spelledName(pitch, name || NAMES[pc(pitch)]);

  /* ------------------------------------------------------------ διαστήματα
     Χαρακτήρας και τάση κάθε διαστήματος: η ύλη που ο δάσκαλος
     επαναλαμβάνει ώσπου να γίνει τρόπος σκέψης. stab: πόσο ήρεμο ακούγεται
     πάνω από το μπάσο (για τον πίνακα της θεωρίας). */
  const IV = [
    {short: "8", long: "οκτάβα", char: "ταύτιση· πάχος χωρίς νέο χρώμα", stab: 1,
      go: "Δεν ζητά κίνηση. Κούνησε τη μία φωνή κατά βήμα για να γεννηθεί διάστημα."},
    {short: "μ2", long: "μικρή 2η", char: "τριβή, αιχμή", stab: .05,
      go: "Η πιο έντονη τριβή. Λύνεται όταν μία φωνή φύγει βηματικά. Απλωμένη σε μ9 τρίβει πιο μαλακά."},
    {short: "Μ2", long: "μεγάλη 2η", char: "αέρας, ήπια τριβή", stab: .4,
      go: "Κλασικά είναι καθυστέρηση: 9→8 (πέφτει η πάνω) ή 2→3 (πέφτει η κάτω). Αλλού μένει ως χρώμα (sus2, add9)."},
    {short: "μ3", long: "μικρή 3η", char: "γλυκιά, σκιερή", stab: .75,
      go: "Σύμφωνη. Αν η πάνω φωνή ανέβει ημιτόνιο γίνεται Μ3: το φως ανάβει."},
    {short: "Μ3", long: "μεγάλη 3η", char: "φως, βεβαιότητα", stab: .8,
      go: "Σύμφωνη. Η πάνω φωνή ημιτόνιο κάτω δίνει μ3 (σκιά), ημιτόνιο πάνω δίνει Κ4 (ερώτηση)."},
    {short: "Κ4", long: "καθαρή 4η", char: "ανοιχτή, ερώτηση", stab: .5,
      go: "Πάνω από το μπάσο ακούγεται σαν ερώτηση και θέλει 4→3. Ανάμεσα σε πάνω φωνές είναι σύμφωνη."},
    {short: "τρ", long: "τρίτονο", char: "αστάθεια, μετέωρο", stab: .1,
      go: "Χωρίζει την οκτάβα στη μέση. Λύνεται με δύο ημιτόνια σε αντίθετη κίνηση: μέσα σε Μ3 ή έξω σε μ6. Μπορεί και να μείνει ως χρώμα (♯11)."},
    {short: "Κ5", long: "καθαρή 5η", char: "θεμέλιο, κενό, δύναμη", stab: .95,
      go: "Το πιο σταθερό μετά την 8η: επιβεβαιώνει τη ρίζα. Η πάνω φωνή στο ♭6 στενάζει, στο 6 ζεσταίνει."},
    {short: "μ6", long: "μικρή 6η", char: "λαχτάρα, σκοτεινή γλύκα", stab: .6,
      go: "Θέλει να πέσει ημιτόνιο στην 5η: ο στεναγμός ♭6→5."},
    {short: "Μ6", long: "μεγάλη 6η", char: "ζεστασιά, ανοιχτή γλύκα", stab: .65,
      go: "Σύμφωνη και μαλακή. Πέφτει τόνο στην 5η ή ανεβαίνει στη μ7."},
    {short: "μ7", long: "μικρή 7η", char: "ένταση που θέλει να πέσει", stab: .35,
      go: "Η 7η πέφτει βηματικά: στην 6η, ή στην 3η της επόμενης συγχορδίας όταν αλλάζει το μπάσο."},
    {short: "Μ7", long: "μεγάλη 7η", char: "λάμψη, νοσταλγία", stab: .2,
      go: "Ένα ημιτόνιο από την 8η: ανεβαίνει και κλείνει (7→8). Αν μείνει, λάμπει (maj7)."},
  ];
  const COMPOUND = {13: ["μ9", "μικρή 9η"], 14: ["Μ9", "μεγάλη 9η"], 15: ["μ10", "μικρή 10η"], 16: ["Μ10", "μεγάλη 10η"],
    17: ["Κ11", "καθαρή 11η"], 18: ["αυξ11", "αυξημένη 11η"], 19: ["Κ12", "καθαρή 12η"], 20: ["μ13", "μικρή 13η"], 21: ["Μ13", "μεγάλη 13η"]};

  function ivName(semis) {
    const n = Math.abs(Math.round(semis));
    if (n === 0) return {short: "1", long: "ταυτοφωνία"};
    if (n % 12 === 0) return n === 12 ? {short: "8", long: "οκτάβα"} : {short: n / 12 + "×8", long: (n === 24 ? "δύο" : n / 12) + " οκτάβες"};
    if (n < 12) return {short: IV[n].short, long: IV[n].long};
    if (COMPOUND[n]) return {short: COMPOUND[n][0], long: COMPOUND[n][1]};
    const o = Math.floor(n / 12);
    return {short: IV[n % 12].short + "+" + (o === 1 ? "8" : o + "×8"), long: IV[n % 12].long + (o === 1 ? " και οκτάβα" : " και " + o + " οκτάβες")};
  }
  /* «η 5η», «το τρίτονο»· και στην αιτιατική: «την καθαρή 5η», «τη μεγάλη 3η». */
  const withArticle = long => (/^τρίτονο/.test(long) ? "το " : "η ") + long;
  const accusative = long => /^τρίτονο/.test(long) ? "το " + long : (/^[αεηιουωάέήίόύώκπτξψ]/i.test(long) ? "την " : "τη ") + long;

  /* ------------------------------------------------------------ ανάλυση */
  /* Τριβή ανά ζεύγος: ημιτόνια και τρίτονα βαραίνουν, τα σύμφωνα σχεδόν όχι.
     Η 4η πάνω από το μπάσο και η απουσία καθαρής 5ης ανεβάζουν την ένταση·
     η 5η πάνω από το μπάσο και η τριάδα σε θεμελιώδη τη χαμηλώνουν,
     χωρίς να σβήνουν περισσότερο από το μισό της τριβής. */
  function pairWeight(d) {
    const ic = pc(d), far = d >= 12;
    if (ic === 1) return far ? .38 : .55;
    if (ic === 11) return far ? .28 : .42;
    if (ic === 6) return .62;
    if (ic === 2 || ic === 10) return far ? .12 : .2;
    return 0;
  }
  function isRootTriad(pitches) {
    const set = new Set(pitches.map(p => pc(p - pitches[0])));
    return set.size === 3 && set.has(0) && set.has(7) && (set.has(3) || set.has(4));
  }
  function tension(input) {
    const pitches = clean(input);
    if (pitches.length < 2) return 0;
    let raw = 0;
    for (let i = 0; i < pitches.length; i += 1) for (let j = i + 1; j < pitches.length; j += 1) raw += pairWeight(pitches[j] - pitches[i]);
    const bass = pitches[0], ics = new Set(pitches.slice(1).map(p => pc(p - bass)));
    if (ics.has(5)) raw += .2;
    const classes = [...new Set(pitches.map(pc))];
    const perfect = classes.some(a => classes.some(b => pc(b - a) === 7));
    if (classes.length >= 3 && !perfect) raw += .3;
    const anchor = (ics.has(7) ? .2 : 0) + (isRootTriad(pitches) ? .15 : 0);
    const u = raw - Math.min(anchor, raw * .5);
    return Math.round((1 - Math.exp(-1.3 * Math.max(0, u))) * 1000) / 1000;
  }
  const tensionWord = t => t < .18 ? "ήρεμο" : t < .38 ? "ήπια ένταση" : t < .6 ? "ένταση" : "έντονη ένταση";

  const BRIGHT = [0, -.8, .2, -1, 1, -.15, .5, 0, -.6, .4, -.3, .5];
  const brightness = (classes, root) => classes.reduce((sum, c) => sum + BRIGHT[pc(c - root)], 0);

  /* Pairs that rub (semitone family) and tritones, by actual notes. */
  function hotspots(pitches) {
    const rub = [], tri = [];
    for (let i = 0; i < pitches.length; i += 1) for (let j = i + 1; j < pitches.length; j += 1) {
      const ic = pc(pitches[j] - pitches[i]);
      if (ic === 1 || ic === 11) rub.push([pitches[i], pitches[j]]);
      if (ic === 6) tri.push([pitches[i], pitches[j]]);
    }
    return {rub, tri};
  }

  const QUALITY_TEXT = {
    "": "Μείζων τριάδα: φωτεινό σπίτι.", m: "Ελάσσων τριάδα: σκιερό σπίτι.",
    7: "Δεσπόζουσα 7η: το τρίτονο 3η–♭7 ζητά λύση μία 5η κάτω.",
    maj7: "maj7: φως με νοσταλγία· η Μ7 τρίβεται μαλακά με τη ρίζα.", m7: "m7: στρογγυλό, μαλακό.",
    mmaj7: "m(maj7): σκοτεινό και τεταμένο.", 6: "Συγχορδία 6: γλυκιά, στρογγυλή.", m6: "m6: σκιερό με φωτεινή 6η (δώριο χρώμα).",
    dim: "Ελαττωμένη: τρίτονο χωρίς 5η, ασταθής.", dim7: "Ελαττωμένη 7η: δύο τρίτονα, συμμετρική· κάθε νότα της μπορεί να γίνει προσαγωγέας.",
    m7b5: "Μισοελαττωμένη (ø7): σκοτεινή ένταση, συχνά πριν τη V της ελάσσονας.", aug: "Αυξημένη: συμμετρική (Μ3 + Μ3), μετέωρη.",
    sus4: "sus4: η 4η κρύβει την 3η· κλασικά πέφτει στην 3η.", sus2: "sus2: αέρας, ούτε μείζον ούτε έλασσον.",
    "7sus4": "7sus4: δεσπόζουσα χωρίς 3η, ανοιχτή ένταση.", 5: "Σκέτη 5η: θεμέλιο χωρίς 3η.",
  };
  const TENSION_TEXT = {1: "♭9 (σκιά)", 2: "9 (αέρας)", 3: "♯9 (τριβή μπλουζ)", 5: "11 (ανοιχτό)", 6: "♯11 (λύδιο φως)", 8: "♭13 (σκοτεινό)", 9: "13 (ζεστασιά)"};

  const TONES = {...L.TONES, mmaj7: [0, 3, 7, 11], "7sus4": [0, 5, 7, 10], maj9: [0, 4, 7, 11, 2]};
  function chordInfo(reading) {
    const parsed = {root: reading.root, bass: reading.bass, quality: reading.quality,
      tones: [...new Set([...(TONES[reading.quality] || [0, 4, 7]), ...(reading.extras || [])])]};
    const base = QUALITY_TEXT[reading.quality] || pretty(reading.quality) + ".";
    const text = reading.extras && reading.extras.length ? base.replace(/\.$/, "") + ", με " + reading.extras.map(e => TENSION_TEXT[e] || e).join(", ") + "." : base;
    return {label: pretty(reading.label), symbol: pretty(reading.symbol), root: reading.root, bass: reading.bass,
      quality: reading.quality, extras: reading.extras || [], letter: letterOf(reading.symbol), parsed, text,
      alternatives: (reading.alternatives || []).map(pretty)};
  }
  function spellInChord(pitch, chord) {
    const role = KV.chordDegree(pitch, chord.parsed), step = L.roleStep(role);
    const name = step === null ? NAMES[pc(pitch)] : L.spell(pc(pitch), chord.letter + step);
    return /[𝄪𝄫]/.test(name) ? NAMES[pc(pitch)] : name;
  }
  /* Three notes that make a plain major or minor triad are read as that
     triad, even when the namer prefers a 6-chord (C–E–A = Am/C). */
  function plainTriad(classes) {
    if (classes.length !== 3) return null;
    for (const r of classes) {
      const rel = new Set(classes.map(c => pc(c - r)));
      if (rel.has(0) && rel.has(7) && (rel.has(3) || rel.has(4))) return {root: r, minor: rel.has(3)};
    }
    return null;
  }
  function reading(pitches, classes) {
    if (classes.length < 3) return null;
    const best = CN.nameChord(pitches);
    const triad = plainTriad(classes);
    if (best && triad && best.root !== triad.root) {
      const own = CN.readings(pitches).find(r => r.root === triad.root && r.quality === (triad.minor ? "m" : ""));
      if (own) return {...own, alternatives: [best.label]};
    }
    return best;
  }

  function analyze(input) {
    const pitches = clean(input);
    const a = {pitches, size: pitches.length, classes: [...new Set(pitches.map(pc))]};
    if (!pitches.length) return a;
    a.bass = pitches[0]; a.top = pitches[pitches.length - 1];
    a.ics = new Set(pitches.slice(1).map(p => pc(p - a.bass)));
    const found = reading(pitches, a.classes);
    a.chord = found ? chordInfo(found) : null;
    a.root = a.chord ? a.chord.root : pc(a.bass);
    a.names = pitches.map(p => a.chord ? spellInChord(p, a.chord) : p === a.bass ? NAMES[pc(p)] : spellOver(a.bass, p));
    a.name = p => { const i = pitches.indexOf(p); return i >= 0 ? a.names[i] : a.chord ? spellInChord(p, a.chord) : spellOver(a.bass, p); };
    a.tension = tension(pitches);
    a.bright = brightness(a.classes, a.root);
    a.hot = hotspots(pitches);
    const fromRoot = new Set(a.classes.map(c => pc(c - a.root)));
    a.noThird = a.classes.length >= 2 && !fromRoot.has(3) && !fromRoot.has(4);
    a.inversion = a.chord ? pc(a.bass - a.chord.root) : 0;
    a.triad = plainTriad(a.classes);
    return a;
  }

  function inversionText(a) {
    if (!a.chord) return "";
    const role = roleOf(a.bass, a);
    if (role === "1") return "θεμελιώδης κατάσταση";
    if (role === "3" || role === "♭3") return "1η αναστροφή · 3η στο μπάσο";
    if (["5", "♭5", "♯5"].includes(role)) return "2η αναστροφή · 5η στο μπάσο";
    if (["♭7", "7", "𝄫7"].includes(role)) return "3η αναστροφή · 7η στο μπάσο";
    return role + " στο μπάσο";
  }
  /* Degree of a note in what sounds, in simple form: 9 → 2, 13 → 6, ♯11 → ♯4. */
  const SIMPLE_ROLE = {9: "2", 11: "4", 13: "6", "♭9": "♭2", "♯9": "♯2", "♯11": "♯4", "♭13": "♭6"};
  function roleOf(pitch, a) {
    if (!a.chord) return ivName(pc(pitch - a.bass) || 12).short;
    const role = KV.chordDegree(pitch, a.chord.parsed);
    return SIMPLE_ROLE[role] || role;
  }

  /* ------------------------------------------------------------ ύφη
     Για κάθε τοπίο: τι θέλει, τι λέει για κάθε διάστημα πάνω από το
     μπάσο (ναι · με προσοχή · όχι, με αιτία), τι προτείνει αντί γι' αυτό,
     και τι κοιτάζει σε ολόκληρη συγχορδία και στη μετάβαση.
     Οι γραμμές της συγχορδίας έχουν θέμα (topic: το διάστημα που αφορούν),
     ώστε να μην επαναλαμβάνουν την κρίση της νότας που μόλις έπαιξες. */
  const yes = (text, topic) => ["yes", text, topic], warn = (text, topic) => ["warn", text, topic],
    no = (text, topic) => ["no", text, topic], info = (text, topic) => ["", text, topic], fact = (text, topic) => ["fact", text, topic];
  const isDominant = c => c.has(4) && c.has(10);

  const LENS = {
    classical: {
      want: "σπίτι → έξοδος → ένταση → σπίτι", stance: "resolve",
      first: "Χτίσε τριάδα: 3η για χαρακτήρα (Μ3 φως, μ3 σκιά) και 5η για στήριγμα.",
      iv: {
        0: yes("Η 8η διπλασιάζει το μπάσο: σταθερό θεμέλιο."),
        3: yes("μ3: η τριάδα παίρνει χρώμα ελάσσονας."),
        4: yes("Μ3: η τριάδα παίρνει χρώμα μείζονας."),
        7: yes("Η 5η στερεώνει τη ρίζα."),
        8: yes("6η πάνω από το μπάσο: σύμφωνη, έτσι ακούγεται η 1η αναστροφή."),
        9: yes("6η πάνω από το μπάσο: σύμφωνη, έτσι ακούγεται η 1η αναστροφή."),
        5: warn("Κ4 πάνω από το μπάσο: στην κλασική αρμονία μετρά ως διαφωνία. Ή πέφτει στην 3η (4→3) ή είναι το 6/4 πριν τη V."),
        6: warn("Τρίτονο: η ένταση της V7. Λύνεται με δύο ημιτόνια σε αντίθετη κίνηση."),
        10: warn("μ7: η 7η της δεσπόζουσας. Πέφτει βηματικά στη λύση."),
        1: warn("μ2/μ9: σκληρή διαφωνία. Να ηχεί ήδη από πριν (προετοιμασία) και να πέσει βηματικά."),
        2: warn("Μ2/Μ9: διαφωνία· κλασικά είναι καθυστέρηση που λύνεται 9→8."),
        11: warn("Μ7: σκληρή διαφωνία. Θέλει λύση: ανεβαίνει ημιτόνιο στην 8η (7→8)."),
      },
      resolve: {5: [4, 3], 1: [0], 2: [0], 11: [0], 10: [9, 8]},
      ids: ["1", "3", "5", "♭3", "♭7"],
      chord(a) {
        const out = [];
        if (!a.chord) { if (a.size >= 3) out.push(warn("Χωρίς όνομα τριάδας: στην κλασική αρμονία κάθε κάθετο σύνολο εξηγείται ως συγχορδία με ξένες νότες.")); return out; }
        const q = a.chord.quality;
        if ((q === "" || q === "m") && a.inversion === 7) out.push(warn("6/4 (5η στο μπάσο): ασταθής αναστροφή. Κλασικά είναι το πτωτικό 6/4 πριν τη V.", 5));
        else if ((q === "" || q === "m") && !a.chord.extras.length) out.push(yes(a.inversion ? "Τριάδα σε 1η αναστροφή: πιο ελαφριά, το μπάσο τραγουδά." : "Τριάδα σε θεμελιώδη: καθαρή λειτουργία."));
        if (q === "7") out.push(info("V7: η 3η ανεβαίνει ημιτόνιο, η ♭7 κατεβαίνει. Έτσι λύνεται το τρίτονο."));
        if (q === "dim" || q === "dim7" || q === "m7b5") out.push(info("Ελαττωμένη: συχνά ακούγεται σαν δεσπόζουσα χωρίς ρίζα· η ρίζα της ανεβαίνει ημιτόνιο."));
        if (a.chord.extras.length) out.push(warn("9, 11, 13: στην κλασική αρμονία είναι καθυστερήσεις που λύνονται βηματικά.", a.chord.extras.map(e => pc(e + a.chord.root - a.bass))));
        return out;
      },
    },

    takemitsu: {
      want: "αιώρηση: χρώματα που μένουν άλυτα", stance: "float",
      first: "Από πάνω της: Μ9, τρίτονο ή Μ7, σε ανοιχτή απόσταση. Η 5η και η 8η δένουν κέντρο.",
      iv: {
        7: no("Όχι 5η εδώ: κλειδώνει τη ρίζα. Το αυτί ακούει «σπίτι» και η αιώρηση χάνεται."),
        0: no("Όχι 8η: ο διπλασιασμός του μπάσου στερεώνει κέντρο."),
        2: c => c.close ? yes("Μ2: τριβή που λάμπει. Απλωμένη σε Μ9 δίνει περισσότερο αέρα.") : yes("Μ9: αέρας. Αιωρείται χωρίς να δηλώνει μείζον ή έλασσον."),
        6: c => c.has(7) ? warn("♯11 δίπλα στην 5η: τρίβεται ημιτόνιο και ακούγεται σαν λάθος. Χωρίς 5η αιωρείται.") : yes("♯11: λάμψη χωρίς βάρος. Χωρίς 5η δεν ζητά λύση."),
        11: yes("Μ7: φως που δεν κάθεται."),
        1: c => c.close ? warn("μ2 κλειστή: σκληραίνει. Άπλωσέ τη σε μ9, μία οκτάβα πιο πάνω.") : yes("μ9: το ημιτόνιο απλωμένο, όπως στο κύτταρο E♭–E–A."),
        8: yes("♯5: ολοτονικό χρώμα, καμία έλξη."),
        4: info("Μ3: φως· κράτα τη ψηλά και μην κλείσεις τριάδα."),
        3: info("μ3: θεμιτή, αλλά απόφυγε την κλειστή τριάδα."),
        5: info("Κ4: ουδέτερη· σε στοίβα με Μ2 ανοίγει χώρο."),
        9: info("13: ζεστό χρώμα πάνω από υφή δεσπόζουσας."),
        10: info("♭7: υφή δεσπόζουσας. Με ♭9 και ♯11 δεν πάει πουθενά, και αυτό θέλουμε."),
      },
      alt: {7: [6, 11, 2], 0: [11, 1, 2]},
      ids: ["♯11", "9", "7", "♭9", "13"],
      chord(a) {
        const out = [];
        const closedTriad = a.triad && a.top - a.bass < 12 && a.size === 3;
        if (closedTriad) out.push(warn("Κλειστή τριάδα: πολύ συγκεκριμένη για εδώ. Άνοιξέ τη ή πρόσθεσε Μ7 και ♯11."));
        if (a.ics.has(7) && (a.ics.has(6) || a.ics.has(11) || a.ics.has(1))) out.push(warn("Η 5η στερεώνει τη ρίζα και τρίβεται με τα χρώματα. Στο λύδιο χρώμα λείπει επίτηδες.", 7));
        else if (!a.ics.has(7) && !a.ics.has(0) && (a.ics.has(6) || a.ics.has(11) || a.ics.has(2))) out.push(yes("Χωρίς 5η, με χρώματα (Μ7, ♯11, 9): ο ήχος αιωρείται."));
        if (a.chord && a.chord.quality === "7" && !a.chord.extras.length) out.push(info("Δεσπόζουσα: πρόσθεσε ♭9 και ♯11 και θα σταματήσει να ζητά λύση."));
        return out;
      },
      motion(t) {
        if (t.to.triad && t.from.tension >= .38 && t.to.tension < .2) return [warn("Η ένταση λύθηκε σε καθαρή τριάδα. Εδώ τα χρώματα συνήθως μένουν άλυτα.")];
        if (t.parallel) return [yes("Όλο το σχήμα μετακινήθηκε μαζί (planing): ίδιο χρώμα σε άλλο ύψος.")];
        return [];
      },
    },

    morricone: {
      want: "καθαρό θεμέλιο κάτω, μία μελωδία πάνω", stance: "ground",
      first: "Πάνω από το μπάσο: 5η και 8η. Η 3η μπαίνει ψηλότερα, πάνω από το C3.",
      iv: {
        0: yes("8η: θεμέλιο που αντέχει βάρος."),
        7: yes("Ανοιχτή 5η: το επικό θεμέλιο."),
        3: c => c.close && c.bass < 48 ? no("3η τόσο χαμηλά: λασπώνει. Ανέβασέ τη μία οκτάβα (10η).") : yes("Η 3η ψηλά: χρώμα χωρίς λάσπη."),
        4: c => c.close && c.bass < 48 ? no("3η τόσο χαμηλά: λασπώνει. Ανέβασέ τη μία οκτάβα (10η).") : yes("Η 3η ψηλά: χρώμα χωρίς λάσπη."),
        8: yes("6η: γλυκιά, τραγουδιστή· θέση για μελωδία."),
        9: yes("6η: γλυκιά, τραγουδιστή· θέση για μελωδία."),
        2: info("9η: πινελιά. Μία αρκεί."),
        10: info("μ7: θεμιτή, αλλά εδώ η ένταση έρχεται από στρώματα που προστίθενται ένα ένα."),
        5: info("Κ4: ανοιχτή· ταιριάζει σε μελωδία που πηδά σε 4ες και 5ες."),
        1: warn("Πυκνή τριβή: χαλάει τους καθαρούς ορόφους. Κράτα την τριβή στη μελωδία."),
        11: warn("Μ7: πυκνή τριβή για τη συνοδεία· εδώ οι όροφοι μένουν καθαροί."),
        6: warn("Τρίτονο: σκληρό για καθαρό θεμέλιο. Κράτα το για μία στιγμή έντασης."),
      },
      lift: [3, 4],
      ids: ["1", "5", "3", "♭3"],
      chord(a) {
        const out = [];
        if (a.classes.length >= 5) out.push(warn("Πολλές νότες μαζί: σκεπάζουν τη μελωδία. Κράτα τριάδα και καθαρούς ορόφους."));
        const third = a.pitches.find(p => [3, 4].includes(pc(p - a.root)));
        if (a.ics.has(7) && third !== undefined && third - a.bass > 12) out.push(yes("5η κάτω, 3η ψηλά: επικό θεμέλιο χωρίς λάσπη."));
        else if (a.triad && !a.inversion) out.push(info("Απλή τριάδα: το υλικό του ύφους. Άνοιξε τη θέση: 5η κάτω, 3η ψηλά."));
        return out;
      },
      motion(t) {
        if (t.chromaticMediant) return [yes("Χρωματική μεσότητα: δύο μείζονες σε απόσταση 3ης. Αλλάζει το φως, σαν νέο πλάνο.")];
        if (t.pedal) return [yes("Το μπάσο έμεινε και η αρμονία άλλαξε από πάνω: τελετουργικό βάρος.")];
        return [];
      },
    },

    stravinsky: {
      want: "σύγκρουση καθαρών μπλοκ, στεγνά", stance: "clash",
      first: "Στοίβαξε 4ες και 5ες πάνω της, ή βάλε δεύτερη τριάδα ένα τρίτονο ψηλότερα.",
      iv: {
        5: yes("Κ4: στεγνό, αρχαϊκό υλικό για μπλοκ."),
        7: yes("Κ5: καθαρό μπλοκ."),
        0: yes("8η: σκληρό, καθαρό μπλοκ."),
        6: yes("Τρίτονο ανάμεσα σε στρώματα: η σύγκρουση της Petrushka (C με F♯)."),
        1: yes("μ2/μ9: τριβή ανάμεσα σε στρώματα· εδώ η σύγκρουση είναι το χρώμα."),
        3: info("μ3: καθαρή τριάδα, υλικό για μπλοκ."),
        4: info("Μ3: καθαρή τριάδα, υλικό για μπλοκ."),
        2: info("Μ2: θεμιτή σε στοίβα 4ων."),
        10: info("μ7: θεμιτή σε στοίβα 4ων (1–4–♭7)."),
        8: info("μ6: θεμιτή."),
        11: warn("Μ7: χρώμα τζαζ, εδώ ακούγεται «γλυκό». Προτίμα δεύτερη τριάδα από πάνω."),
        9: warn("13: γλυκό χρώμα. Εδώ το χρώμα βγαίνει από τη σύγκρουση στρωμάτων."),
      },
      alt: {11: [6, 1], 9: [6, 5]},
      ids: ["5", "♯11", "1"],
      chord(a) {
        const out = [];
        const two = bitonal(a.classes);
        if (two) out.push(yes("Δύο τριάδες μαζί (" + NAMES[two[0]] + " και " + NAMES[two[1]] + "): η σύγκρουση είναι το ίδιο το χρώμα."));
        else if (quartal(a.pitches)) out.push(yes("Στοίβα 4ων: στεγνό, αρχαϊκό μπλοκ."));
        else if (a.triad) out.push(info("Καθαρή τριάδα: ένα μπλοκ. Βάλε από πάνω δεύτερη τριάδα ένα τρίτονο μακριά."));
        if (a.chord && (["maj7", "m7", "6", "m6", "9", "maj9", "m9", "13"].includes(a.chord.quality) || a.chord.extras.some(e => [2, 9].includes(e))))
          out.push(warn("Πλούσιο χρώμα (7ες, 9ες): εδώ ακούγεται «γλυκό». Προτίμα στοίβα 4ων ή δεύτερη τριάδα."));
        return out;
      },
      motion(t) {
        if (t.kind === "move" && t.moved.length && !t.parallel && t.common >= 1)
          return [warn("Ομαλό γλίστρημα φωνών. Εδώ οι αλλαγές κόβονται: άλλαξε όλο το μπλοκ μαζί.")];
        if (t.parallel) return [yes("Κόψιμο μπλοκ: όλο το σχήμα σε άλλο ύψος, χωρίς μετάβαση.")];
        return [];
      },
    },

    byzantine: {
      want: "μία γραμμή πάνω σε ίσον", stance: "line",
      first: "Κράτα τη νότα ως ίσον και τραγούδα από πάνω με τις νότες του ήχου (πράσινες).",
      judge(c) {
        const layer = k => k === 0 || k === 7;
        const melody = c.others.filter(p => p !== c.bass && !layer(pc(p - c.bass)));
        if (layer(c.ic)) return c.ic === 0 ? yes("8η: το ίσον παχαίνει.") : yes("5η: δεύτερο, πιο σιγανό στρώμα του ίσου· αυτό είναι το όριο.");
        if (melody.length) return no("Δεύτερη νότα μελωδίας μαζί: αρμονία κάθετα. Εδώ ακούγεται μία γραμμή κάθε φορά.");
        const steps = c.scale ? [...c.scale.steps, ...(c.scale.alt || [])] : [0, 2, 3, 5, 7, 8, 9, 10];
        return steps.includes(c.ic) ? yes("Νότα του ήχου πάνω από το ίσον.") : warn("Εκτός ήχου, στην προσέγγιση των 12 ημιτονίων. Δοκίμασε τη διπλανή νότα.");
      },
      ids: [],
      chord(a) {
        const layers = a.pitches.filter(p => [0, 7].includes(pc(p - a.bass)));
        if (a.size - layers.length >= 2) return [no("Συγχορδία: εκτός ιδιώματος. Κράτα το ίσον (με 8η ή 5η) και μία γραμμή από πάνω.")];
        return [yes("Ίσον και γραμμή: το ιδίωμα.")];
      },
      motion(t) {
        if (t.from.bass !== t.to.bass && t.kind !== "melody" && t.kind !== "add") return [warn("Το ίσον μετακινήθηκε. Γίνεται σπάνια και αργά, σε τέλος φράσης.")];
        if (t.melodyStep && Math.abs(t.melodyStep) > 4) return [warn("Άλμα: η ψαλτική κινείται κυρίως βηματικά, με βαρύτητα προς τη βάση.")];
        if (t.melodyStep && Math.abs(t.melodyStep) <= 2) return [yes("Βηματική κίνηση πάνω από το ίσον: ο τρόπος της ψαλτικής.")];
        return [];
      },
    },

    hadjidakis: {
      want: "λυρική γραμμή πάνω σε απλή αρμονία", stance: "song",
      first: "Σκέψου τη νότα ως μελωδία και βάλε από κάτω απλή τριάδα. Στην ελάσσονα διάλεξε v (απαλό) ή V (δραματικό).",
      iv: {
        3: yes("μ3: τραγουδιστή, το χρώμα της ελάσσονας."),
        4: yes("Μ3: τραγουδιστό φως."),
        7: yes("5η: απλό, καθαρό στήριγμα."),
        0: yes("8η: απλό στήριγμα."),
        8: yes("μ6: λυρική λαχτάρα· θέλει να πέσει στην 5η."),
        9: yes("Μ6: ζεστή, τραγουδιστή."),
        2: info("9η: πέρασμα της μελωδίας. Μην την κρατάς στη συνοδεία."),
        10: info("μ7: μαλακή (i7, iv7)."),
        5: info("Κ4: πέρασμα· συνήθως πέφτει στην 3η."),
        6: info("Τρίτονο: η ένταση της V7. Εδώ κρίνεται αν η φράση ακουμπά (v) ή κλείνει με βάρος (V)."),
        1: warn("Σκληρή τριβή: σκεπάζει τη λυρική γραμμή."),
        11: warn("Μ7: σκληρή για απλή συνοδεία τραγουδιού."),
      },
      ids: ["1m", "♭3", "5m", "3", "5"],
      chord(a, ctx) {
        const out = [];
        if (a.classes.length >= 5 || (a.chord && a.chord.extras.length >= 2)) out.push(warn("Πυκνό voicing: σκεπάζει τη μελωδία. Τρεις νότες αρκούν."));
        if (a.chord && ctx && ctx.mode === "minor" && pc(a.chord.root - ctx.tonic) === 7) {
          if (a.chord.quality === "m" || a.chord.quality === "m7") out.push(info("v (φυσική ελάσσονα): η φράση ακουμπά απαλά, χωρίς προσαγωγέα."));
          else if (a.chord.quality === "" || a.chord.quality === "7") out.push(info("V (αρμονική ελάσσονα): η φράση κλείνει με βάρος."));
        } else if (a.triad && !out.length) out.push(yes("Απλή τριάδα: αφήνει χώρο στη μελωδία."));
        return out;
      },
      motion(t) {
        if (t.from.size >= 2 && t.to.size >= 2 && t.bassStep < 0 && t.bassStep >= -2) return [yes("Το μπάσο κατεβαίνει βήμα: η γραμμή του lament, η αρχετυπική μελαγχολία.")];
        if (t.melodyStep === 8 || t.melodyStep === 9) return [yes("Άλμα 6ης προς τα πάνω: λυρική χειρονομία. Μετά, γύρνα με βήματα.")];
        return [];
      },
    },

    glass: {
      want: "λίγα ακόρντα, αρπέζ, μία νότα αλλάζει", stance: "oneNote",
      first: "Χτίσε απλή τριάδα και παίξ' τη σε αρπέζ. Η εξέλιξη έρχεται από μία νότα που αλλάζει.",
      iv: {
        0: yes("8η: καθαρό υλικό για αρπέζ."),
        3: yes("Νότα της τριάδας: καθαρό υλικό για αρπέζ."),
        4: yes("Νότα της τριάδας: καθαρό υλικό για αρπέζ."),
        7: yes("Νότα της τριάδας: καθαρό υλικό για αρπέζ."),
        8: yes("μ6: η νότα που αλλάζει (5→♭6, όπως Am → F/A)."),
        9: yes("Μ6: η νότα που αλλάζει (5→6)."),
        5: info("Κ4: θεμιτή μέσα σε σχήμα αρπέζ."),
        2: warn("9η: θολώνει το αρπέζ. Εδώ το χρώμα έρχεται από την επανάληψη."),
        10: warn("7η: θολώνει το αρπέζ. Εδώ το χρώμα έρχεται από την επανάληψη."),
        11: warn("7η: θολώνει το αρπέζ. Εδώ το χρώμα έρχεται από την επανάληψη."),
        1: warn("Τριβή: θολώνει το αρπέζ."),
        6: warn("Τρίτονο: θολώνει το αρπέζ."),
      },
      ids: ["1m", "♭3", "5m", "3"],
      chord(a) {
        if (a.classes.length >= 5 || (a.chord && a.chord.extras.length)) return [warn("Πολλές νότες: το αρπέζ θολώνει. Μείνε στην τριάδα.")];
        if (a.triad) return [yes("Τριάδα: έτοιμη για αρπέζ. Άλλαξε μία νότα κάθε λίγα μέτρα.")];
        return [];
      },
      motion(t) {
        if (t.kind === "move" && t.moved.length === 1) return [yes("Μία νότα άλλαξε, οι άλλες έμειναν: η ουσία του ύφους.")];
        if ((t.kind === "move" || t.kind === "change") && t.changedCount >= 2) {
          const keep = t.to.classes.filter(c => t.from.classes.includes(c));
          return [warn(keep.length >= 2 ? "Άλλαξαν " + t.changedCount + " φωνές, ενώ " + keep.map(c => t.to.name(t.to.pitches.find(p => pc(p) === c))).join(" και ") + " είναι κοινές. Κράτα τις στη θέση τους και κίνησε μία: τότε ακούγεται η μία αλλαγή."
            : "Άλλαξαν " + t.changedCount + " νότες. Εδώ αρκεί μία· κράτα τις άλλες.")];
        }
        return [];
      },
    },

    jazz: {
      want: "3η και 7η για ταυτότητα, 9–11–13 για φως", stance: "color",
      first: "Πάνω από τη ρίζα: 3η και 7η (shell). Τα χρώματα (9, 13) μπαίνουν από πάνω.",
      iv: {
        3: yes("3η: η μισή ταυτότητα του ακόρντου."),
        4: yes("3η: η μισή ταυτότητα του ακόρντου."),
        10: c => c.has(11) ? warn("♭7 μαζί με Μ7: δύο 7ες τρίβονται.") : yes("7η: η άλλη μισή ταυτότητα."),
        11: c => c.has(10) ? warn("Μ7 μαζί με ♭7: δύο 7ες τρίβονται.") : yes("Μ7: η άλλη μισή ταυτότητα (maj7)."),
        2: yes("9η: φως χωρίς να αλλάζει η λειτουργία."),
        9: c => c.has(3) && !c.has(10) ? yes("6η: m6, στρογγυλό.") : yes("13η: ζεστασιά στην κορυφή."),
        6: c => c.has(4) ? yes("♯11: λύδιο φως πάνω από μείζονα 3η.") : c.has(3) ? info("♭5: μισοελαττωμένη χροιά (m7♭5).") : info("♯11 ή ♭5: η 3η θα αποφασίσει ποιο από τα δύο είναι."),
        7: info("5η: η λιγότερο απαραίτητη νότα, συχνά παραλείπεται."),
        0: warn("Διπλή ρίζα: κλέβει θέση από τα χρώματα."),
        5: c => c.has(4) ? no("11 πάνω από μείζονα 3η: avoid note, τρίβεται σε μ9 με την 3η. Κάν' το ♯11.") : yes("11: ανοιχτό χρώμα σε ελάσσονα (m11) ή sus."),
        1: c => isDominant(c) ? yes("♭9: σκοτεινή ένταση δεσπόζουσας.") : warn("♭9: δουλεύει πάνω σε δεσπόζουσα (3η + ♭7). Αλλού τρίβεται σε μ9 με τη ρίζα."),
        8: c => isDominant(c) ? yes("♭13: σκοτεινή ένταση δεσπόζουσας.") : c.has(3) ? warn("♭13 σε ελάσσονα: τρίβεται σε μ9 με την 5η.") : info("♯5 ή ♭13: αλλοιωμένη χροιά."),
      },
      alt: {5: [6], 1: [2], 0: [2, 9]},
      ids: ["9", "13", "♯11", "7", "♭9"],
      chord(a) {
        const out = [];
        if (!a.chord) return out;
        const rel = new Set(a.classes.map(c => pc(c - a.chord.root)));
        const third = rel.has(3) || rel.has(4), seventh = rel.has(10) || rel.has(11) || (rel.has(9) && /6/.test(a.chord.quality));
        if (/sus/.test(a.chord.quality)) out.push(info("sus: χωρίς 3η, ανοιχτό· στην τζαζ συχνά πριν τη δεσπόζουσα."));
        else if (!third || !seventh) out.push(warn("Λείπει " + (!third && !seventh ? "η 3η και η 7η" : !third ? "η 3η" : "η 7η") + ": η ταυτότητα θολώνει.", !third ? [3, 4] : [10, 11]));
        else if (a.classes.length === 3) out.push(yes("Shell: ρίζα, 3η, 7η. Η ταυτότητα με τρεις νότες."));
        else if (!a.chord.extras.length) out.push(yes("3η και 7η στη θέση τους: η ταυτότητα είναι καθαρή. Πρόσθεσε 9 για φως."));
        if (rel.has(5) && rel.has(4) && !/sus/.test(a.chord.quality)) out.push(no("Το 11 πάνω από μείζονα 3η τρίβεται σε μ9: κάν' το ♯11.", 5));
        const upper = a.pitches.slice(1).filter(p => pc(p - a.chord.root) === 0);
        if (upper.length && a.size >= 4) out.push(warn("Διπλή ρίζα στα πάνω: κλέβει θέση από 9 και 13.", 0));
        if (a.chord.extras.length && third && seventh) out.push(yes("Χρώματα πάνω από 3η και 7η: πλούσιο φως."));
        return out;
      },
      motion(t) {
        if (t.from.chord && t.to.chord && /^m7/.test(t.from.chord.quality) && t.to.chord.quality === "7" && t.rootMotion === 5) return [yes("ii → V: το πρώτο μισό του ii–V–I.")];
        if (t.from.chord && t.to.chord && t.from.chord.quality === "7" && t.rootMotion === 5) return [yes("V → I: η 3η και η 7η λύνονται ημιτονιακά.")];
        return [];
      },
    },

    electronic: {
      want: "pad που αιωρείται πάνω από μπάσο που μένει", stance: "pad",
      first: "Κράτα τη νότα ως pedal. Από πάνω: 5η και 9η (sus2). Η 3η είναι προαιρετική, ψηλά.",
      iv: {
        0: yes("8η: θεμέλιο του pad."),
        7: yes("5η: θεμέλιο του pad."),
        2: yes("9η (sus2, add9): αέρας."),
        5: yes("4η (sus4): αιώρηση."),
        3: info("3η: δηλώνει έλασσον. Αν τη θες, βάλ' τη ψηλά ή μαλάκωσέ τη με 9η."),
        4: info("3η: δηλώνει μείζον. Αν τη θες, βάλ' τη ψηλά ή μαλάκωσέ τη με 9η."),
        11: info("Μ7: φωτεινό pad (maj7)."),
        10: info("♭7: πιο σκοτεινό pad."),
        9: info("6η: μαλακό χρώμα."),
        8: info("♭6: σκοτεινό, κινηματογραφικό."),
        1: warn("μ2: τραχιά για pad. Άπλωσέ τη ή κάν' τη Μ2."),
        6: warn("Τρίτονο: τεταμένο για pad· θεμιτό μόνο ως σκιά."),
      },
      ids: ["1sus2", "5", "9add", "4sus"],
      chord(a) {
        const out = [];
        if (a.pitches.filter(p => p < 52).length >= 3) out.push(warn("Πυκνό στο χαμηλό: το pad λασπώνει. Άνοιξε τις φωνές πάνω από το E3."));
        if (a.noThird) out.push(yes("Χωρίς 3η: το pad αιωρείται."));
        if (a.size >= 3 && a.pitches[1] - a.bass >= 12) out.push(yes("Μπάσο χαμηλά, pad από πάνω: η δομή του ύφους."));
        return out;
      },
      motion(t) {
        if (t.pedal) return [yes("Pedal: το μπάσο έμεινε, η αρμονία άλλαξε από πάνω.")];
        return [];
      },
    },
  };
  const lensOf = id => LENS[id] || LENS.classical;

  function bitonal(classes) {
    const set = new Set(classes);
    if (set.size < 5) return null;
    for (let a = 0; a < 12; a += 1) for (let b = 0; b < 12; b += 1) {
      if (a === b) continue;
      const ta = [a, a + 4, a + 7].map(pc), tb = [b, b + 4, b + 7].map(pc);
      if ([...ta, ...tb].every(c => set.has(c)) && ta.filter(c => tb.includes(c)).length <= 1 && pc(b - a) !== 7 && pc(b - a) !== 5) return [a, b];
    }
    return null;
  }
  function quartal(pitches) {
    if (pitches.length < 3) return false;
    const steps = pitches.slice(1).map((p, i) => p - pitches[i]);
    return steps.slice(0, -1).every(s => s === 5) && [4, 5].includes(steps[steps.length - 1]);
  }

  /* ------------------------------------------------------------ κρίση νότας */
  /* Χαμηλότερη άνετη θέση της κάτω νότας για κλειστά διαστήματα
     (κατά προσέγγιση, τα όρια χαμηλών διαστημάτων της ενορχήστρωσης). */
  const LIMIT = {1: 52, 2: 51, 3: 48, 4: 46, 6: 46};
  function mud(all, pitch) {
    for (const other of all) {
      if (other === pitch) continue;
      const lo = Math.min(other, pitch), d = Math.abs(other - pitch);
      if (d < 12 && LIMIT[d] && lo < LIMIT[d]) return "Πολύ χαμηλά για " + ivName(d).long + ": λασπώνει. Ανέβασέ τη μία οκτάβα.";
    }
    return null;
  }

  function entryFor(lens, ctx) {
    if (lens.judge) return lens.judge(ctx);
    const value = lens.iv[ctx.ic];
    const entry = typeof value === "function" ? value(ctx) : value;
    return entry || info(cap(IV[ctx.ic].char) + ".");
  }

  /* Root of what already sounds (the chord's, or the bass), remembered per set. */
  const roots = new Map();
  function rootOf(pitches) {
    const key = pitches.join(",");
    if (!roots.has(key)) { if (roots.size > 200) roots.clear(); const a = analyze(pitches); roots.set(key, a.size ? a.root : 0); }
    return roots.get(key);
  }
  function rawJudge(lens, all, pitch, opts) {
    const bass = all[0], semis = pitch - bass, ic = pc(semis);
    const others = all.filter(p => p !== pitch);
    const ctx = {semis, ic, close: semis < 12, pitch, bass, others, scale: opts && opts.scale,
      has: k => others.some(p => p !== bass && pc(p - bass) === k)};
    let [level, text] = entryFor(lens, ctx);
    if (ic !== 0 && others.some(p => p !== bass && pc(p) === pc(pitch)) && level !== "no")
      [level, text] = ["", "Ξανά το " + NAMES[pc(pitch)] + " σε άλλη οκτάβα: πάχος, όχι νέο χρώμα."];
    // Major and minor third of the same root together.
    const root = rootOf(others);
    const rel = pc(pitch - root), present = k => others.some(p => pc(p - root) === k);
    if (lens.stance !== "line" && ((rel === 3 && present(4)) || (rel === 4 && present(3)))) {
      if (lens === LENS.jazz) [level, text] = rel === 3 && present(10) ? ["yes", "♯9 πάνω από δεσπόζουσα: η τριβή του μπλουζ."] : ["warn", "Μείζονα και ελάσσονα 3η μαζί: τρίβονται. Πάνω από δεσπόζουσα γίνεται ♯9."];
      else if (!["float", "clash"].includes(lens.stance)) [level, text] = ["warn", "Μείζονα και ελάσσονα 3η μαζί: τρίβονται. Διάλεξε μία, ή κράτα την τριβή για χρώμα μπλουζ."];
    }
    const muddy = mud(all, pitch);
    if (muddy && level !== "no" && lens !== LENS.byzantine) [level, text] = ["warn", muddy];
    return {level, text, ic, semis, pitch, label: ivName(semis).short};
  }

  /* Verdict for one more note over what already sounds. */
  function judge(lensId, context, pitch, opts) {
    const lens = lensOf(lensId);
    const set = clean(context).filter(p => p !== pitch);
    if (!set.length) return null;
    const all = clean([...set, pitch]);
    if (pitch === all[0]) {
      // The new note becomes the bass: judge what sounds above it.
      const verdicts = set.map(p => rawJudge(lens, all, p, opts));
      verdicts.sort((a, b) => SEVERITY[b.level] - SEVERITY[a.level] || a.semis - b.semis);
      const worst = verdicts[0];
      return {...worst, pitch, below: true, semis: set[0] - pitch, label: ivName(set[0] - pitch).short};
    }
    return rawJudge(lens, all, pitch, opts);
  }

  /* Every key around what you hold, with the interval it would make and the verdict.
     In the Byzantine lens the melody is a line, so the map is read over the ison alone. */
  function intervalMap(lensId, context, opts) {
    let set = clean(context);
    if (!set.length) return [];
    if (lensOf(lensId).stance === "line") set = set.filter(p => p === set[0] || [0, 7].includes(pc(p - set[0])));
    const bass = set[0];
    const low = set.length === 1 && lensOf(lensId).stance !== "line" ? bass - 12 : bass + 1, high = bass + 24;
    const out = [];
    for (let p = Math.max(21, low); p <= Math.min(108, high); p += 1) {
      if (set.includes(p)) continue;
      const v = judge(lensId, set, p, opts);
      if (v) out.push({pitch: p, label: v.label, level: v.level, text: v.text});
    }
    return out;
  }

  /* Pitches to try instead of a note the style rejects, near where you played it. */
  function alternatives(lensId, context, pitch, verdict) {
    const lens = lensOf(lensId);
    const set = clean(context).filter(p => p !== pitch);
    if (!set.length || !verdict) return [];
    const bass = Math.min(set[0], pitch);
    if (lens.lift && lens.lift.includes(verdict.ic) && verdict.level === "no") return [{pitch: pitch + 12, word: "Πιο ψηλά"}];
    let classes = [];
    if (verdict.level === "no" && lens.alt && lens.alt[verdict.ic]) classes = lens.alt[verdict.ic];
    else if (verdict.level === "warn" && lens.resolve && lens.resolve[verdict.ic]) classes = lens.resolve[verdict.ic];
    const out = [];
    for (const ic of classes) {
      const candidates = [];
      for (let p = pitch - 12; p <= pitch + 12; p += 1) if (p > bass && !set.some(q => pc(q) === pc(p)) && pc(p - bass) === ic) candidates.push(p);
      candidates.sort((x, y) => Math.abs(x - pitch) - Math.abs(y - pitch));
      const level = p => { const v = judge(lensId, set, p); return v ? v.level : ""; };
      const best = candidates.find(p => level(p) === "yes") ?? candidates.find(p => !["no", "warn"].includes(level(p))) ?? candidates[0];
      if (best !== undefined && !out.some(o => o.pitch === best)) out.push({pitch: best});
    }
    const word = verdict.level === "no" ? "Δοκίμασε" : "Λύση";
    return out.slice(0, 3).map(o => ({...o, word}));
  }

  /* ------------------------------------------------------------ συγχορδία */
  function review(lensId, a, ctx) {
    const lens = lensOf(lensId);
    const out = [];
    if (lens !== LENS.byzantine) {
      search: for (let i = 0; i < a.pitches.length; i += 1) for (let j = i + 1; j < a.pitches.length; j += 1) {
        const lo = a.pitches[i], d = a.pitches[j] - lo;
        if (d < 12 && LIMIT[d] && lo < LIMIT[d]) {
          out.push(warn(a.name(lo) + "–" + a.name(a.pitches[j]) + " (" + ivName(d).short + ") πολύ χαμηλά: λασπώνει. Άνοιξε τη θέση."));
          break search;
        }
      }
    }
    return out.concat(lens.chord ? lens.chord(a, ctx) : []);
  }

  /* ------------------------------------------------------------ επίδραση */
  const ROLE_EFFECT = {
    0: "διπλασιάζει τη ρίζα: πιο στέρεο", 7: "δένει τον ήχο στη ρίζα", 4: "αποφασίζει μείζον: φως", 3: "αποφασίζει ελάσσον: σκιά",
    10: "βάζει κίνηση· θέλει να πέσει βήμα", 11: "λάμπει δίπλα στη ρίζα", 2: "δίνει αέρα", 1: "ρίχνει σκιά και τριβή",
    6: "κάνει τον ήχο μετέωρο", 5: "ανοίγει ερώτηση· θέλει να πέσει στην 3η", 8: "φέρνει λαχτάρα", 9: "ζεσταίνει",
  };
  const ROLE_NAME = {0: "ρίζα", 1: "♭9", 2: "9η", 3: "♭3", 4: "3η", 5: "4η", 6: "♯11", 7: "5η", 8: "♭6", 9: "6η", 10: "♭7", 11: "Μ7"};

  /* What a newly added note does to the sound: a new chord, its role, a new rub. */
  function addEffect(before, after, pitch, verdictLevel, line) {
    const lines = [];
    if (after.chord && !line && (!before.chord || before.chord.label !== after.chord.label)) {
      lines.push(fact("Τώρα ακούγεται " + after.chord.label + ". " + after.chord.text, "chord"));
    } else if (!verdictLevel) {
      const rel = pc(pitch - after.root);
      lines.push(info(cap(withArticle(ROLE_NAME[rel])) + " " + ROLE_EFFECT[rel] + "."));
    }
    const near = after.pitches.find(p => Math.abs(p - pitch) === 1), wide = after.pitches.find(p => Math.abs(p - pitch) === 11);
    if (near !== undefined) lines.push(fact("Τρίβεται ημιτόνιο με το " + after.name(near) + "."));
    else if (wide !== undefined) lines.push(fact("Μ7 με το " + after.name(wide) + ": τριβή απλωμένη, πιο μαλακή."));
    return lines;
  }

  /* ------------------------------------------------------------ κινήσεις */
  const PLR_TEXT = {
    P: ["P · παράλληλη", "Ίδια ρίζα, η 3η αλλάζει ημιτόνιο: άλλο φως, ίδιο σπίτι."],
    R: ["R · σχετική", "Δύο κοινές νότες, η τρίτη κινείται τόνο: απαλή μετατόπιση."],
    L: ["L · ημιτόνιο", "Δύο κοινές νότες, η τρίτη κινείται ημιτόνιο (όπως Am → F/A)."],
  };
  function plr(x, y) {
    if (!x || !y) return null;
    const d = pc(y.root - x.root);
    if (d === 0 && x.minor !== y.minor) return "P";
    if (!x.minor && y.minor && d === 9) return "R";
    if (x.minor && !y.minor && d === 3) return "R";
    if (!x.minor && y.minor && d === 4) return "L";
    if (x.minor && !y.minor && d === 8) return "L";
    return null;
  }

  /* Named two-voice motions: the intervals every composer hears. */
  const DYAD_UP = {
    "5>4": ["4→3", "Η 4η πέφτει στην 3η: η λύση της καθυστέρησης."], "5>3": ["4→3", "Η 4η πέφτει στην 3η: η λύση της καθυστέρησης."],
    "2>0": ["9→8", "Η 9η πέφτει στην 8η."], "1>0": ["♭9→8", "Η τριβή πέφτει στην 8η."],
    "11>0": ["7→8", "Ο προσαγωγέας ανεβαίνει και κλείνει."], "10>9": ["7→6", "Η 7η πέφτει βηματικά."], "10>8": ["7→6", "Η 7η πέφτει βηματικά."],
    "8>7": ["♭6→5", "Ο στεναγμός: η ♭6 ακουμπά στην 5η."], "9>7": ["6→5", "Η 6η ακουμπά στην 5η."],
    "7>8": ["5→♭6", "Λαχτάρα· συνήθως ξαναπέφτει."], "7>9": ["5→6", "Η 5η ζεσταίνει σε 6η."], "7>6": ["5→♭5", "Το θεμέλιο σαλεύει."],
    "4>3": ["Μ3→μ3", "Το φως χαμηλώνει."], "3>4": ["μ3→Μ3", "Το φως ανάβει."], "4>5": ["3→4", "Από βεβαιότητα σε ερώτηση (sus4)."],
    "0>11": ["8→7", "Η 8η γλιστρά: αρχή κατιούσας γραμμής."], "0>1": ["8→♭9", "Σκιά πάνω από τη ρίζα."], "0>10": ["8→♭7", "Η 8η πέφτει τόνο: ♭7, κίνηση."],
    "6>7": ["♯4→5", "Το τρίτονο ανεβαίνει στην 5η: λύση προς τα πάνω."], "6>5": ["♭5→4", "Το τρίτονο πέφτει στην 4η."],
    "2>3": ["2→♭3", "Η τριβή ανοίγει σε 3η."], "2>4": ["2→3", "Η τριβή ανοίγει σε 3η."],
  };
  const DYAD_LOW = {
    "2>3": ["2→3", "Η κάτω φωνή υποχωρεί και η τριβή γίνεται 3η."], "2>4": ["2→3", "Η κάτω φωνή υποχωρεί και η τριβή γίνεται 3η."],
    "1>2": ["μ2→Μ2", "Η τριβή ανοίγει."], "5>4": ["Κ4→Μ3", "Η κάτω φωνή ανεβαίνει και η ερώτηση γίνεται 3η."],
  };
  /* Same root, one voice moved: the line clichés and colour changes. */
  const ROLE_MOVE = {
    "3>♭3": "Η 3η χαμηλώνει: ίδια ρίζα, σκιά.", "♭3>3": "Η 3η ανεβαίνει: ίδια ρίζα, φως.",
    "1>7": "Η πάνω ρίζα γλιστρά στη Μ7: λάμψη, αρχή κατιούσας γραμμής.", "1>♭7": "Η πάνω ρίζα πέφτει τόνο στη ♭7: κίνηση.",
    "7>♭7": "Η Μ7 πέφτει στη ♭7: από λάμψη σε κίνηση.", "♭7>6": "Η ♭7 πέφτει στην 6η: γλυκαίνει.", "♭7>7": "Η ♭7 ανεβαίνει στη Μ7: λάμψη.",
    "6>♭7": "Η 6η ανεβαίνει στη ♭7: κίνηση.", "5>6": "Η 5η ανεβαίνει στην 6η: ζεστασιά.", "5>♯5": "Η 5η ανεβαίνει ημιτόνιο: αυξημένη, μετέωρη.",
    "5>♭6": "Η 5η ανεβαίνει ημιτόνιο: λαχτάρα.", "5>♭5": "Η 5η χαμηλώνει: σκιά ελαττωμένης.", "3>4": "Η 3η ανεβαίνει στην 4η: ερώτηση (sus4).",
    "3>2": "Η 3η πέφτει στη 2η: αέρας (sus2).", "♭3>2": "Η 3η πέφτει στη 2η: αέρας (sus2).", "♭3>4": "Η 3η ανεβαίνει στην 4η: ερώτηση (sus4).",
    "4>3": "Η 4η πέφτει στην 3η: λύση της καθυστέρησης.", "2>3": "Η 2η ανεβαίνει στην 3η: ο ήχος αποφασίζει.", "2>♭3": "Η 2η ανεβαίνει στην 3η: ο ήχος αποφασίζει.",
    "1>♭2": "Η πάνω ρίζα ανεβαίνει ημιτόνιο: σκιά (♭9).", "1>2": "Η πάνω ρίζα ανεβαίνει στη 9η: αέρας.",
    "♭6>5": "Η ♭6 πέφτει στην 5η: ο στεναγμός.", "6>5": "Η 6η ακουμπά στην 5η.", "♯5>5": "Η ♯5 πέφτει στην 5η: η αυξημένη λύνεται.",
    "7>1": "Η Μ7 ανεβαίνει στη ρίζα: ο προσαγωγέας κλείνει.", "♭7>1": "Η ♭7 ανεβαίνει στη ρίζα.",
  };

  function describeChange(a0, a1) {
    const dT = a1.tension - a0.tension, dB = a1.bright - a0.bright;
    if (dT < -.12) return "χαλαρώνει";
    if (dT > .12) return "σφίγγει";
    if (dB > .5) return "φωτίζει";
    if (dB < -.5) return "σκοτεινιάζει";
    return "αλλάζει χρώμα";
  }
  function setLabel(a) {
    if (!a.size) return "—";
    if (a.size === 1) return withOctave(a.bass, a.names[0]);
    if (a.classes.length === 1) return a.names[0] + " σε οκτάβες";
    if (a.chord) return a.chord.label;
    const upper = a.pitches.find(p => pc(p) !== pc(a.bass));
    if (a.classes.length === 2) return a.name(a.bass) + "–" + a.name(upper) + " · " + ivName(upper - a.bass).short;
    return a.name(a.bass) + ": " + [...new Set(a.pitches.slice(1).map(p => ivName(p - a.bass).short))].join(" · ");
  }

  /* What one or two moving voices did, in words a composer uses. */
  function voiceMotion(a0, a1, moved) {
    if (a0.size === 2 && a1.size === 2 && moved.length === 1) {
      const upper = moved[0].from === a0.top;
      const key = pc(a0.top - a0.bass) + ">" + pc(a1.top - a1.bass);
      const hit = (upper ? DYAD_UP : DYAD_LOW)[key];
      if (hit) return {tag: hit[0], why: hit[1], named: true};
    }
    if (moved.length === 2 && a0.size === 2 && a0.hot.tri.length) {
      const inward = a1.top - a1.bass < a0.top - a0.bass;
      return inward ? {tag: "λύση μέσα", why: "Δύο ημιτόνια αντίθετα: το τρίτονο κλείνει σε Μ3. Όλο το V7→I σε δύο νότες.", named: true}
        : {tag: "λύση έξω", why: "Δύο ημιτόνια αντίθετα: το τρίτονο ανοίγει σε μ6.", named: true};
    }
    const kind = plr(a0.triad, a1.triad);
    if (kind) return {tag: PLR_TEXT[kind][0], why: PLR_TEXT[kind][1], named: true, plr: kind};
    if (moved.length === 1 && a0.chord && a1.chord && a0.chord.root === a1.chord.root) {
      const r0 = roleOf(moved[0].from, a0), r1 = roleOf(moved[0].to, a1);
      const text = ROLE_MOVE[r0 + ">" + r1];
      if (text) return {tag: r0 + "→" + r1, why: text, named: true};
    }
    return {tag: describeChange(a0, a1), why: a1.chord ? a1.chord.text : a1.classes.length === 2 ? cap(IV[pc(a1.pitches.find(p => pc(p) !== pc(a1.bass)) - a1.bass)].char) + "." : "Χωρίς όνομα τριάδας: άκουσέ το ως διαστήματα.", named: false};
  }

  function makeMove(lensId, a0, to, moved, opts) {
    const lens = lensOf(lensId);
    const a1 = analyze(to);
    const motion = voiceMotion(a0, a1, moved);
    const dT = a1.tension - a0.tension;
    let score = motion.named ? .7 : 0;
    if (a1.chord || a1.classes.length === 2) score += .2; else if (!["clash", "float"].includes(lens.stance)) score -= .4;
    if (lens.stance === "resolve" || lens.stance === "song") {
      score -= dT * 1.2;
      if (moved.some(m => m.to > m.from && ["♭7", "7"].includes(roleOf(m.from, a0)) && a0.chord)) score -= .7;
    }
    if (lens.stance === "float") {
      score += [2, 6, 11].filter(k => a1.ics.has(k)).length * .2 - (a1.ics.has(7) ? .3 : 0) - (a1.triad ? .5 : 0) - Math.max(0, -dT) * 1.2;
      if (motion.named) score -= .35;
    }
    if (lens.stance === "pad") {
      score += (a1.ics.has(7) ? .3 : 0) + ([2, 5].some(k => a1.ics.has(k)) ? .3 : 0) + (a1.noThird ? .2 : 0) - (a1.hot.tri.length ? .4 : 0);
      if (moved.some(m => m.from === a0.bass)) score -= .8;
      if (motion.named && !motion.plr) score += .1;
    }
    if (lens.stance === "ground") score += (a1.ics.has(7) ? .3 : 0) + (a1.ics.has(0) ? .1 : 0) + (a1.triad ? .2 : 0);
    if (lens.stance === "clash") score += ([5, 6, 1].some(k => a1.ics.has(k)) ? .3 : 0) - .6;
    if (lens.stance === "oneNote") score += (motion.plr ? .6 : 0) + (a1.triad ? .2 : 0) - (a1.classes.length > 4 ? .5 : 0);
    if (lens.stance === "color") score += (a1.chord && (a1.chord.extras.length || /7|6/.test(a1.chord.quality)) ? .35 : 0);
    for (const m of moved) {
      const v = judge(lensId, to.filter(p => p !== m.to), m.to, opts);
      if (v) score += v.level === "yes" ? .3 : v.level === "no" ? -.7 : v.level === "warn" ? -.2 : 0;
    }
    if (to.some(p => mud(to, p))) score -= .6;
    return {kind: "move", from: a0.pitches, to: a1.pitches, moved, label: setLabel(a1), tag: motion.tag, why: motion.why, score, tension: a1.tension,
      line: moved.map(m => a0.name(m.from) + " → " + a1.name(m.to)).join(" · ")};
  }

  function stepMoves(lensId, pitches, opts) {
    const set = clean(pitches);
    if (set.length < 2) return [];
    const a0 = analyze(set);
    const out = [];
    set.forEach(p => {
      for (const d of [-2, -1, 1, 2]) {
        const q = p + d;
        if (q < 21 || q > 108 || set.includes(q)) continue;
        out.push(makeMove(lensId, a0, clean(set.map(x => x === p ? q : x)), [{from: p, to: q}], opts));
      }
    });
    if (set.length === 2 && pc(set[1] - set[0]) === 6) {
      for (const [dl, du] of [[1, -1], [-1, 1]]) {
        const to = clean([set[0] + dl, set[1] + du]);
        out.push(makeMove(lensId, a0, to, [{from: set[0], to: set[0] + dl}, {from: set[1], to: set[1] + du}], opts));
      }
    }
    return out;
  }

  /* The whole block at another height: planing (Takemitsu) or a cut (Stravinsky). */
  function blockMoves(lensId, pitches) {
    const lens = lensOf(lensId), set = clean(pitches);
    if (set.length < 2) return [];
    const shifts = lens.stance === "clash" ? [[3, "μπλοκ +μ3", "Ίδιο μπλοκ μία μ3 πάνω: ο οκτατονικός άξονας."], [6, "μπλοκ +τρ", "Ίδιο μπλοκ ένα τρίτονο μακριά: σύγκρουση χωρίς μετάβαση."], [-3, "μπλοκ −μ3", "Ίδιο μπλοκ μία μ3 κάτω."]]
      : lens.stance === "float" ? [[3, "όλο +μ3", "Όλο το χρώμα μία μ3 πάνω: αλλάζει θέση, μένει ίδιο (οκτατονική)."], [-1, "όλο −ημιτόνιο", "Όλο το χρώμα ημιτόνιο κάτω: γλίστρημα χωρίς λειτουργία."]]
      : [];
    return shifts.map(([shift, tag, why]) => {
      const to = set.map(p => p + shift);
      return {kind: "move", block: shift, from: set, to, moved: set.map((p, i) => ({from: p, to: to[i]})), label: setLabel(analyze(to)),
        tag, why, score: lens.stance === "clash" ? 1.2 : .85, tension: tension(to), line: "όλες οι φωνές " + (shift > 0 ? "+" : "−") + ivName(shift).short};
    }).filter(m => m.to.every(p => p >= 21 && p <= 108));
  }

  /* Byzantine: the melody steps inside the mode while the ison stays. */
  function lineMoves(pitches, scale) {
    const set = clean(pitches);
    if (!set.length) return [];
    const ison = set[0];
    const layers = set.filter(p => p === ison || [0, 7].includes(pc(p - ison)));
    const melody = set.find(p => !layers.includes(p));
    const from = melody === undefined ? ison : melody;
    const steps = [...scale.steps, ...(scale.alt || [])].map(pc);
    const notes = [];
    for (let p = from - 4; p <= from + 4; p += 1) if (p !== from && p > ison && steps.includes(pc(p - ison)) && !layers.includes(p)) notes.push(p);
    notes.sort((a, b) => Math.abs(a - from) - Math.abs(b - from) || a - b);
    return notes.slice(0, 4).map(p => {
      const to = clean([...layers, p]);
      const d = p - from;
      return {kind: "move", from: set, to, moved: melody === undefined ? [] : [{from: melody, to: p}],
        label: spellOver(ison, p) + " · " + ivName(p - ison).short, tag: (d > 0 ? "↑ " : "↓ ") + ivName(d).short,
        why: Math.abs(d) <= 2 ? "Βήμα μέσα στον ήχο, πάνω από το ίσον." : "Μικρό άλμα μέσα στον ήχο· γέμισέ το μετά με βήμα.",
        score: 1 - Math.abs(d) * .1, tension: 0, line: melody === undefined ? "ίσον " + NAMES[pc(ison)] + " + " + spellOver(ison, p) : spellOver(ison, from) + " → " + spellOver(ison, p)};
    });
  }

  function pickMoves(list, count) {
    const sorted = list.slice().sort((a, b) => b.score - a.score);
    const out = [], perVoice = new Map();
    for (const m of sorted) {
      if (out.length >= count) break;
      if (out.some(o => same(o.to, m.to))) continue;
      const voice = m.moved.length === 1 ? m.moved[0].from : "many";
      if ((perVoice.get(voice) || 0) >= 2) continue;
      perVoice.set(voice, (perVoice.get(voice) || 0) + 1);
      out.push(m);
    }
    return out;
  }

  function moves(lensId, pitches, opts) {
    const lens = lensOf(lensId);
    if (lens.stance === "line") return lineMoves(pitches, (opts && opts.scale) || L.byId("byzantine").scales[0]);
    return pickMoves(stepMoves(lensId, pitches, opts).concat(blockMoves(lensId, pitches)), 4);
  }

  /* ------------------------------------------------------------ η ίδια νότα, άλλοι κόσμοι
     Η νότα σου στην κορυφή, με άλλο ακόρντο από κάτω. root: πού κάθεται
     η ρίζα σε σχέση με τη νότα· tones: οι μεσαίες φωνές πάνω από τη ρίζα. */
  const IDENTITY = {
    "1": {root: 0, tones: [4, 7], role: "1", text: "Ρίζα μείζονας: η νότα είναι σπίτι."},
    "1m": {root: 0, tones: [3, 7], role: "1", text: "Ρίζα ελάσσονας: σπίτι με σκιά."},
    "3": {root: -4, tones: [7], role: "3", text: "3η μείζονας: γλυκιά, τραγουδιστή."},
    "♭3": {root: -3, tones: [7], role: "♭3", text: "♭3 ελάσσονας: σκιερή, λυρική."},
    "5": {root: -7, tones: [4], role: "5", text: "5η μείζονας: σταθερή, ουδέτερη."},
    "5m": {root: -7, tones: [3], role: "5", text: "5η ελάσσονας: σταθερή, με σκιά από κάτω."},
    "♭7": {root: -10, tones: [4, 7], role: "♭7", text: "♭7 δεσπόζουσας: θέλει να πέσει βήμα."},
    "7": {root: -11, tones: [4, 7], role: "7", text: "Μ7 (maj7): λάμψη, νοσταλγία."},
    "9": {root: -2, tones: [4, 11], role: "9", text: "9η πάνω από maj7: αέρας, φως."},
    "9add": {root: -2, tones: [4, 7], role: "9", text: "9η (add9): αέρας χωρίς το βάρος της 7ης."},
    "♯11": {root: -6, tones: [4, 11], role: "♯11", text: "♯11: λύδιο φως, αιώρηση."},
    "13": {root: -9, tones: [4, 10], role: "13", text: "13η δεσπόζουσας: ζεστασιά πάνω από ένταση."},
    "♭9": {root: -1, tones: [4, 10], role: "♭9", text: "♭9 δεσπόζουσας: σκιά, ένταση."},
    "1sus2": {root: 0, tones: [2, 7], role: "1", text: "Ρίζα sus2: ούτε μείζον ούτε έλασσον."},
    "4sus": {root: -5, tones: [7], role: "4", text: "4η του sus4: ερώτηση που δεν απαντιέται."},
  };
  function identityVoicing(pitch, def) {
    const rootPc = pc(pitch + def.root);
    let bass = pitch - 12;
    while (pc(bass) !== rootPc) bass -= 1;
    if (bass < 28) bass += 12;
    const inner = def.tones.map(t => { let p = pitch - 1; while (pc(p) !== pc(rootPc + t)) p -= 1; return p; }).filter(p => p > bass);
    return clean([bass, ...inner, pitch]);
  }
  function identities(lensId, pitch) {
    return (lensOf(lensId).ids || []).map(id => {
      const def = IDENTITY[id];
      const voicing = identityVoicing(pitch, def);
      const a = analyze(voicing);
      const own = a.chord ? spellInChord(pitch, a.chord) : NAMES[pc(pitch)];
      return {kind: "identity", id, to: voicing, label: a.chord ? a.chord.label : setLabel(a), tag: def.role,
        line: "το " + own + " ως " + def.role + (a.chord ? " του " + a.chord.symbol : ""), why: def.text, score: 0};
    });
  }
  /* The style's own colours with your note in the bass (from landscapes.js). */
  function colorCards(lensId, pitch) {
    const land = L.byId(lensId);
    return land.colors.map((color, index) => {
      const voicing = L.colorVoicing(color, pitch);
      return {kind: "color", index, to: voicing.map(v => v.pitch), optional: voicing.filter(v => v.optional).map(v => v.pitch),
        names: voicing.map(v => v.name), label: color.name, tag: "χρώμα", line: voicing.map(v => v.optional ? "(" + v.name + ")" : v.name).join(" "),
        why: color.why, use: color.use || "", score: 0};
    });
  }
  /* Longer paths of the style, from the chord you hold (landscapes.js). */
  function routes(lensId, a) {
    if (!a.chord || lensOf(lensId).stance === "line") return [];
    const land = L.byId(lensId);
    const chord = {root: a.chord.root, quality: a.chord.quality, bass: a.chord.bass, letter: a.chord.letter};
    return L.progressionsFor(land, chord).slice(0, 3).map(p => {
      const chain = [a.pitches];
      p.chords.slice(1).forEach(target => chain.push(L.voiceLead(chain[chain.length - 1], target)));
      return {kind: "route", label: p.name, chords: p.chords.map((c, i) => ({label: c.label, roman: p.romans[i] || ""})), chain, to: chain[1] || a.pitches,
        why: p.why, tag: "διαδρομή", line: p.chords.map(c => c.label).join(" → ")};
    });
  }

  /* ------------------------------------------------------------ μετάβαση */
  const match = (P, N) => P.map((p, i) => ({from: p, to: N[i]}));   // voices low to high, no crossing
  const ROOT_MOTION = {0: "ίδια ρίζα, άλλο χρώμα", 5: "η ρίζα πέφτει 5η: η πιο «λογική» κίνηση, σαν V→I", 7: "η ρίζα ανεβαίνει 5η: ανοίγει, απομακρύνεται",
    3: "η ρίζα ανεβαίνει μ3", 4: "η ρίζα ανεβαίνει Μ3", 8: "η ρίζα πέφτει Μ3", 9: "η ρίζα πέφτει μ3", 2: "η ρίζα ανεβαίνει τόνο: φρέσκο, όπως IV→V",
    10: "η ρίζα πέφτει τόνο: ♭VII, αρχαϊκό", 1: "η ρίζα γλιστρά ημιτόνιο πάνω", 11: "η ρίζα γλιστρά ημιτόνιο κάτω", 6: "ρίζες σε τρίτονο: η πιο μακρινή σχέση"};

  function transition(lensId, prevInput, nextInput, history) {
    const P = clean(prevInput), N = clean(nextInput);
    if (!P.length || !N.length || same(P, N)) return null;
    const from = analyze(P), to = analyze(N);
    const added = N.filter(p => !P.includes(p)), removed = P.filter(p => !N.includes(p));
    const t = {from, to, added, removed, lines: [], kind: "change", moved: []};
    t.common = from.classes.filter(c => to.classes.includes(c)).length;
    t.pedal = from.bass === to.bass && P.length >= 2 && N.length >= 2 && removed.length > 0;
    t.bassStep = to.bass - from.bass;
    if (from.chord && to.chord) {
      t.rootMotion = pc(to.chord.root - from.chord.root);
      t.chromaticMediant = from.triad && to.triad && !from.triad.minor && !to.triad.minor && [3, 4, 8, 9].includes(t.rootMotion);
    }
    if (P.length === N.length) {
      const pairs = match(P, N);
      t.changedCount = pairs.filter(m => m.from !== m.to).length;
      const shift = N[0] - P[0];
      t.parallel = shift !== 0 && P.length >= 2 && pairs.every(m => m.to - m.from === shift);
    }
    if (P.length === 1 && N.length === 1) { t.kind = "melody"; t.melodyStep = N[0] - P[0]; }
    else if (!removed.length) t.kind = added.length <= 2 ? "add" : "change";
    else if (!added.length) t.kind = "remove";
    else if (P.length === N.length && !t.parallel && (match(P, N).every(m => Math.abs(m.to - m.from) <= 2) || t.changedCount === 1)) {
      t.kind = "move"; t.moved = match(P, N).filter(m => m.from !== m.to);
      if (P.length === 2 && t.moved.length === 1 && t.moved[0].from === P[1]) t.melodyStep = N[1] - P[1];
    }

    const word = d => Math.abs(d) === 1 ? "ημιτόνιο" : Math.abs(d) === 2 ? "τόνο" : ivName(d).long;
    if (t.kind === "melody") {
      const d = t.melodyStep, n = ivName(d);
      const size = Math.abs(d) <= 2 ? "βήμα" : Math.abs(d) <= 4 ? "μικρό άλμα" : Math.abs(d) <= 7 ? "άλμα" : "μεγάλο άλμα";
      t.short = (d > 0 ? "↑" : "↓") + n.short;
      t.lines.push(["did", "Η μελωδία " + (d > 0 ? "ανέβηκε " : "κατέβηκε ") + n.long + " (" + from.names[0] + " → " + to.names[0] + "): " + size + "."]);
      const hist = (history || []).map(clean).filter(h => h.length);
      if (hist.length && same(hist[hist.length - 1], N)) hist.pop();
      if (hist.length && same(hist[hist.length - 1], P)) hist.pop();
      const before = hist.length ? hist[hist.length - 1] : null;
      const prevStep = before && before.length === 1 ? P[0] - before[0] : 0;
      if (Math.abs(prevStep) >= 5 && Math.abs(d) <= 2 && Math.sign(prevStep) !== Math.sign(d)) t.lines.push(yes("Γέμισμα: μετά το άλμα, βήμα προς την αντίθετη μεριά."));
      else if (pc(Math.abs(d)) === 6) t.lines.push(warn("Τρίτονο μελωδικά: ασταθές, δύσκολο στο τραγούδι. Λύσ' το με βήμα."));
      else if (Math.abs(d) >= 5) t.lines.push(info("Μετά από άλμα, η μελωδία συνήθως γυρίζει με βήμα προς την αντίθετη μεριά."));
    } else if (t.kind === "add") {
      const p = added[added.length - 1];
      t.short = "+" + to.name(p);
      if (p === to.bass) t.lines.push(["did", "Νέο μπάσο: " + to.name(p) + ". Από πάνω του το " + from.name(from.bass) + " είναι " + ivName(from.bass - p).long + "."]);
      else t.lines.push(["did", "Πρόσθεσες το " + to.name(p) + ": " + ivName(p - to.bass).long + " πάνω από το " + to.name(to.bass) + "."]);
    } else if (t.kind === "remove") {
      t.short = "−" + from.name(removed[0]);
      const role = pc(removed[0] - from.root);
      const what = role === 7 && from.size > 2 ? " Χωρίς την 5η: λιγότερο δεμένο, πιο ανοιχτό." : (role === 3 || role === 4) && to.size >= 2 && to.noThird ? " Χωρίς την 3η: ούτε μείζον ούτε έλασσον." : "";
      t.lines.push(["did", (removed.length > 1 ? "Άφησες τα " + removed.map(p => from.name(p)).join(", ") + "." : "Άφησες το " + from.name(removed[0]) + ".") + what]);
    } else if (t.kind === "move") {
      const parts = t.moved.map(m => "το " + from.name(m.from) + (m.to > m.from ? " ανέβηκε " : " κατέβηκε ") + word(m.to - m.from) + " στο " + to.name(m.to));
      t.short = t.moved.map(m => from.name(m.from) + "→" + to.name(m.to)).join(" ");
      t.lines.push(["did", cap(parts.join(", ")) + "."]);
      const motion = voiceMotion(from, to, t.moved);
      if (motion.plr) t.short = motion.plr;
      if (P.length === 2) t.lines.push(info(ivName(P[1] - P[0]).short + " → " + ivName(N[1] - N[0]).short + (motion.named ? " (" + motion.tag + "): " + motion.why : ": " + motion.tag + ".")));
      else if (motion.named) t.lines.push(info(motion.tag + ": " + motion.why));
    } else {
      t.short = "→";
      if (from.chord && to.chord && !t.parallel) {
        t.lines.push(["did", from.chord.label + " → " + to.chord.label + ": " + ROOT_MOTION[t.rootMotion] + "."]);
        const kind = plr(from.triad, to.triad);
        if (kind) { t.lines.push(info(PLR_TEXT[kind][0] + ": " + PLR_TEXT[kind][1])); t.short = kind; }
        if (from.chord.quality === "7" && t.rootMotion === 5) t.lines.push(yes("Τέλεια πτώση: η δεσπόζουσα λύθηκε μία 5η κάτω."));
        else if (from.chord.quality === "7" && t.rootMotion === 2 && to.chord.quality === "m") t.lines.push(info("Απροσδόκητη πτώση: η δεσπόζουσα πήγε στο vi αντί για το σπίτι."));
      } else if (t.parallel) {
        t.lines.push(["did", "Όλο το σχήμα " + (N[0] > P[0] ? "ανέβηκε " : "κατέβηκε ") + ivName(N[0] - P[0]).long + ": " + setLabel(from) + " → " + setLabel(to) + "."]);
      } else t.lines.push(["did", "Από " + setLabel(from) + " σε " + setLabel(to) + "."]);
      if (!t.parallel) t.lines.push(fact(t.common ? "Κοινές νότες: " + to.classes.filter(c => from.classes.includes(c)).map(c => to.name(to.pitches.find(p => pc(p) === c))).join(", ") + "." : "Καμία κοινή νότα: καθαρή αλλαγή."));
    }

    // Parallel fifths and octaves between moving voices (classical ears).
    if (lensId === "classical" && P.length === N.length && P.length >= 2) {
      const pairs = match(P, N);
      outer: for (let i = 0; i < pairs.length; i += 1) for (let j = i + 1; j < pairs.length; j += 1) {
        const a = pairs[i], b = pairs[j];
        const before = pc(b.from - a.from), after = pc(b.to - a.to);
        if (a.to !== a.from && Math.sign(a.to - a.from) === Math.sign(b.to - b.from) && before === after && (before === 7 || before === 0)) {
          t.lines.push(warn("Παράλληλες " + (before === 7 ? "5ες" : "8ες") + " (" + from.name(a.from) + "–" + from.name(b.from) + " → " + to.name(a.to) + "–" + to.name(b.to) + "): οι δύο φωνές χάνουν την ανεξαρτησία τους. Δοκίμασε αντίθετη κίνηση."));
          break outer;
        }
      }
    }
    // A tritone that resolves by contrary semitones.
    if (P.length === N.length && from.hot.tri.length && to.hot.tri.length < from.hot.tri.length) {
      const pairs = match(P, N);
      const resolved = from.hot.tri.some(([lo, hi]) => {
        const a = pairs.find(m => m.from === lo), b = pairs.find(m => m.from === hi);
        return a && b && Math.abs(a.to - a.from) === 1 && Math.abs(b.to - b.from) === 1 && Math.sign(a.to - a.from) !== Math.sign(b.to - b.from);
      });
      if (resolved) t.lines.push(yes("Το τρίτονο λύθηκε: δύο ημιτόνια σε αντίθετη κίνηση."));
    }
    const lens = lensOf(lensId);
    if (lens.motion) lens.motion(t).forEach(line => t.lines.push(line));
    return t;
  }

  /* ------------------------------------------------------------ τονικότητα */
  const MODES = {major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11]};
  const MODE_NAME = {major: "μείζονα", minor: "ελάσσονα", dorian: "Δώριο", mixolydian: "Μιξολύδιο", phrygian: "Φρύγιο", lydian: "Λύδιο"};
  const DEGREE = ["τονική", "υπερτονική", "μέση", "υποδεσπόζουσα", "δεσπόζουσα", "υπομέση", "προσαγωγέας"];
  const keyText = key => NAMES[pc(key.tonic)] + " " + (MODE_NAME[key.mode] || "μείζονα");
  const inKey = key => (/^[ΔΜΦΛ]/.test(MODE_NAME[key.mode] || "") ? "στον " : "στη ") + keyText(key);
  function noteDegree(pitch, key) {
    const scale = MODES[key.mode] || MODES.major, rel = pc(pitch - key.tonic), index = scale.indexOf(rel);
    if (index >= 0) return (index + 1) + "η βαθμίδα (" + (index === 6 && rel === 10 ? "υποτονική" : DEGREE[index]) + ")";
    const below = scale.indexOf(pc(rel - 1)), above = scale.indexOf(pc(rel + 1));
    return "χρωματική νότα (" + (below >= 0 ? "♯" + (below + 1) : "♭" + (above + 1)) + ")";
  }
  function chordFunction(chord, key) {
    if (!["major", "minor"].includes(key.mode)) return "";
    const rel = pc(chord.root - key.tonic);
    const table = key.mode === "major" ? {0: "τονική", 4: "τονική", 9: "τονική", 2: "υποδεσπόζουσα", 5: "υποδεσπόζουσα", 7: "δεσπόζουσα", 11: "δεσπόζουσα"}
      : {0: "τονική", 3: "τονική", 5: "υποδεσπόζουσα", 2: "υποδεσπόζουσα", 8: "υποδεσπόζουσα", 7: "δεσπόζουσα", 11: "δεσπόζουσα", 10: "υποτονική"};
    return table[rel] ? "λειτουργία " + table[rel] : "";
  }

  /* ------------------------------------------------------------ η οθόνη
     Ό,τι πατάς, με μια ματιά: ένα μεγάλο όνομα («D τρίτονο», «Dm7»),
     δίπλα ό,τι το συμπληρώνει, και η αναστροφή (0 θεμελιώδης … 3, −1 καμία). */
  function displayOf(a, lens) {
    if (!a.size) return {big: "", alt: "", inv: -1};
    const layers = a.pitches.filter(p => ![0, 7].includes(pc(p - a.bass)));
    if (lens && lens.stance === "line" && a.size >= 2 && layers.length <= 1) {
      const melody = layers[0];
      return {big: "ίσον " + NAMES[pc(a.bass)] + (melody !== undefined ? " · " + spellOver(a.bass, melody) : ""),
        alt: melody !== undefined ? ivName(melody - a.bass).long : "", inv: -1};
    }
    if (a.size === 1) return {big: a.names[0], alt: withOctave(a.bass, a.names[0]), inv: -1};
    if (a.classes.length === 1) return {big: a.names[0] + " οκτάβα", alt: (a.top - a.bass) + " ημιτόνια", inv: -1};
    if (a.classes.length === 2 && !a.chord) {
      const upper = a.pitches.find(p => pc(p) !== pc(a.bass)), semis = upper - a.bass;
      return {big: a.name(a.bass) + " " + ivName(semis).long, alt: ivName(semis).short + " · " + semis + " ημιτόνια" + (semis > 12 ? "\nαπλό: " + IV[pc(semis)].long : ""), inv: -1};
    }
    if (a.chord) {
      const role = roleOf(a.bass, a);
      const inv = role === "1" ? 0 : ["3", "♭3"].includes(role) ? 1 : ["5", "♭5", "♯5"].includes(role) ? 2 : ["♭7", "7", "𝄫7", "6"].includes(role) ? 3 : -1;
      return {big: a.chord.label, alt: a.chord.alternatives.length ? "ή " + a.chord.alternatives.join("\nή ") : "", inv};
    }
    return {big: setLabel(a), alt: "χωρίς όνομα τριάδας", inv: -1};
  }
  const display = (pitches, lensId) => displayOf(analyze(pitches), lensOf(lensId));

  /* ------------------------------------------------------------ ο λόγος του δασκάλου
     speak() μαζεύει όλα τα παραπάνω σε ό,τι δείχνει η σελίδα: τίτλο,
     υπότιτλο, ένταση, γραμμές (τι έκανες · κρίση · γιατί · τι να δοκιμάσεις),
     τον χάρτη στα πλήκτρα και τις κάρτες «πού πας». */
  function speak(lensId, input, options) {
    const opts = options || {};
    const lens = lensOf(lensId), land = L.byId(lensId);
    const key = {tonic: Number.isFinite(opts.tonic) ? opts.tonic : 0, mode: opts.mode || "major"};
    const scale = opts.scale || land.scales[0];
    const a = analyze(input);
    const view = {lens: {id: land.id, name: land.name, want: lens.want, color: land.color}, analysis: a, tension: a.tension || 0,
      tensionWord: tensionWord(a.tension || 0), lines: [], cards: [], routes: [], map: [], title: "", sub: ""};
    if (!a.size) {
      view.state = "empty";
      view.title = "Πάτα μια νότα.";
      view.sub = "Θα σου δείξω τι ανοίγει από εκεί.";
      view.lines.push(info(land.idea));
      return view;
    }
    const prev = clean(opts.previous);
    const t = prev.length ? transition(lensId, prev, a.pitches, opts.history) : null;
    view.transition = t;
    const topics = new Set();
    const push = line => {
      if (!line || view.lines.some(l => l[1] === line[1])) return;
      const topic = line[2];
      if (topic !== undefined && [].concat(topic).some(x => topics.has(x))) return;
      view.lines.push(line);
    };
    if (t) t.lines.filter(l => l[0] === "did").forEach(push);

    // Verdict on the note you just added: the core of the lesson.
    if (t && t.kind === "add") {
      const p = t.added[t.added.length - 1];
      const v = judge(lensId, prev, p, {scale});
      if (v) {
        push([v.level, v.text]);
        if (v.level) { topics.add(v.ic); if (v.level === "no" || v.level === "warn") topics.add("verdict"); }
        const alts = alternatives(lensId, a.pitches, p, v);
        if (alts.length) view.tryChips = {word: alts[0].word, items: alts.map(x => ({pitch: x.pitch, label: spellOver(Math.min(a.bass, x.pitch), x.pitch) + " · " + ivName(x.pitch - Math.min(a.bass, x.pitch)).short}))};
        addEffect(t.from, a, p, v.level, lens.stance === "line").forEach(line => { push(line); if (line[2] === "chord") topics.add("chord"); });
        // You were building instability, and this note anchors it.
        if (!v.below && [0, 7].includes(v.ic) && (t.from.tension >= .35 || t.from.hot.tri.length) && v.level !== "no") {
          const keep = alternatives("takemitsu", a.pitches, p, {level: "no", ic: v.ic});
          const label = v.ic === 7 ? "5η" : "8η";
          push(["if", "Αν θες να μείνει ασταθές: άσε έξω την " + label + ", γιατί δίνει στο αυτί κέντρο." +
            (keep.length ? " Δοκίμασε " + keep.map(x => spellOver(a.bass, x.pitch) + " (" + ivName(x.pitch - a.bass).short + ")").join(" ή ") + "." : "")]);
        }
      }
    }
    if (t) t.lines.filter(l => l[0] !== "did").forEach(push);

    const byzantine = lens.stance === "line";
    if (a.size === 1) {
      view.state = "note";
      view.title = withOctave(a.bass, a.names[0]);
      view.sub = cap(noteDegree(a.bass, key)) + " " + inKey(key);
      if (!t || t.kind !== "melody") push(info(lens.first));
      if (!byzantine && !t) push(fact("Η ίδια νότα αλλάζει ρόλο με το μπάσο από κάτω της: ρίζα (σπίτι), 3η (τραγούδι), 9η ή ♯11 (αιώρηση). Οι κάρτες δείχνουν πώς."));
      view.cards = (byzantine ? lineMoves(a.pitches, scale) : identities(lensId, a.bass)).concat(colorCards(lensId, a.bass));
      view.cardsTitle = byzantine ? "Η γραμμή πάνω από το ίσον" : "Η νότα σου σε άλλους κόσμους";
    } else if (byzantine && a.pitches.filter(p => ![0, 7].includes(pc(p - a.bass))).length <= 1) {
      view.state = "interval";
      const melody = a.pitches.find(p => ![0, 7].includes(pc(p - a.bass)));
      view.title = "Ίσον " + NAMES[pc(a.bass)] + (melody !== undefined ? " · " + spellOver(a.bass, melody) : "");
      view.sub = a.pitches.map(p => withOctave(p, spellOver(a.bass, p))).join(" – ") + (melody !== undefined ? " · η μελωδία " + ivName(melody - a.bass).long + " πάνω από το ίσον" : "");
      review(lensId, a, key).forEach(push);
      view.cards = lineMoves(a.pitches, scale);
      view.cardsTitle = "Η γραμμή πάνω από το ίσον";
    } else if (a.classes.length === 1) {
      view.state = "interval";
      view.title = a.size > 2 ? "Οκτάβες" : "Οκτάβα";
      view.sub = a.pitches.map(p => withOctave(p, a.names[0])).join(" – ");
      if (!t || t.kind !== "add") push(fact(cap(IV[0].char) + ". " + IV[0].go));
      view.cards = moves(lensId, a.pitches, {scale});
      view.cardsTitle = "Πού πας από εδώ";
    } else if (a.classes.length === 2 && !a.chord) {
      view.state = "interval";
      const upper = a.pitches.find(p => pc(p) !== pc(a.bass));
      const semis = upper - a.bass, n = ivName(semis);
      view.title = cap(n.long);
      view.sub = a.pitches.map(p => withOctave(p, a.name(p))).join(" – ") + (semis > 12 ? " · απλό: " + IV[pc(semis)].long : "");
      push(fact(cap(IV[pc(semis)].char) + ". " + IV[pc(semis)].go));
      if (!t || t.kind !== "add") {
        const v = judge(lensId, a.pitches.filter(p => p !== upper), upper, {scale});
        if (v) push([v.level, v.text]);
      }
      view.cards = moves(lensId, a.pitches, {scale});
      view.cardsTitle = "Πού πας από εδώ";
    } else {
      view.state = "chord";
      view.title = a.chord ? a.chord.label : setLabel(a);
      const parts = [];
      if (a.chord) {
        const roman = pretty(CN.roman({root: a.chord.root, quality: a.chord.quality}, key.tonic, key.mode));
        const fn = chordFunction(a.chord, key);
        parts.push(roman + " " + inKey(key) + (fn ? ", " + fn : ""));
      } else parts.push("χωρίς όνομα τριάδας");
      parts.push(a.pitches.map(p => a.name(p)).join(" "));
      view.sub = parts.filter(Boolean).join(" · ");
      if (!topics.has("chord") && a.chord) push(fact(a.chord.text));
      const hot = [];
      if (a.hot.tri.length) hot.push("τρίτονο " + a.name(a.hot.tri[0][0]) + "–" + a.name(a.hot.tri[0][1]));
      if (a.hot.rub.length) hot.push("τριβή " + a.name(a.hot.rub[0][0]) + "–" + a.name(a.hot.rub[0][1]));
      if (hot.length && !(t && t.kind === "add")) push(fact("Η ένταση ζει εδώ: " + hot.join(" · ") + "."));
      review(lensId, a, key).forEach(line => { if (!(topics.has("verdict") && line[0] === "yes")) push(line); });
      const added = L.colorChord(land, a.chord ? {root: a.chord.root, quality: a.chord.quality, bass: a.chord.bass, letter: a.chord.letter} : null, a.pitches);
      if (added && added.items.length) {
        const adds = added.items.filter(i => i.kind === "add"), removes = added.items.filter(i => i.kind === "remove");
        const recolor = {kind: "recolor", label: added.name, why: added.why, tag: "χρώμα του ύφους",
          add: adds.map(i => i.pitch), remove: removes.map(i => i.pitch),
          line: adds.map(i => "+ " + i.name).concat(removes.map(i => "− " + a.name(i.pitch))).join(" ")};
        recolor.to = clean(a.pitches.filter(p => !recolor.remove.includes(p)).concat(recolor.add));
        view.recolor = recolor;
      }
      view.cards = (view.recolor ? [view.recolor] : []).concat(moves(lensId, a.pitches, {scale}));
      view.routes = routes(lensId, a);
      view.cardsTitle = "Πού πας από εδώ";
    }
    view.map = intervalMap(lensId, a.pitches, {scale});
    // Short and in reading order: what you did, the verdict, why, what to try.
    const order = {did: 0, no: 1, warn: 1, yes: 2, if: 3, "": 4, fact: 5};
    view.lines = view.lines.map((l, i) => [l, i]).sort((x, y) => (order[x[0][0]] - order[y[0][0]]) || x[1] - y[1]).map(x => x[0]).slice(0, 5);
    view.path = {label: setLabel(a), short: t ? t.short : ""};
    view.display = displayOf(a, lens);
    return view;
  }

  /* ------------------------------------------------------------ ρώτα με
     Ερωτήσεις ανάκλησης: πρώτα παίζεις, μετά ο δάσκαλος διορθώνει.
     check(pitches, previous) → {state: "wait" | "progress" | "ok" | "wrong", text}. */
  const TRIAD = minor => minor ? [0, 3, 7] : [0, 4, 7];
  const triadName = (root, minor) => NAMES[pc(root)] + (minor ? "m" : "");
  const sameClasses = (pitches, classes) => { const a = [...new Set(pitches.map(pc))].sort((x, y) => x - y), b = [...new Set(classes.map(pc))].sort((x, y) => x - y); return same(a, b); };
  function quizQuestion(lensId, n, random) {
    const rnd = random || Math.random;
    const pick = list => list[Math.floor(rnd() * list.length) % list.length];
    const land = L.byId(lensId), lens = lensOf(lensId);
    const order = ["interval", "style", "interval", "move", "interval", "resolve"];
    const kind = order[n % order.length];
    const root = pick([48, 50, 52, 53, 55, 57, 59, 60]);
    if (kind === "interval") {
      const semis = pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 18]);
      const name = ivName(semis).long, rootName = NAMES[pc(root)];
      return {kind, setup: [root], answer: [root + semis], ask: "Πάτα " + accusative(name) + " πάνω από το " + rootName + ".",
        show: "Εδώ: " + withOctave(root + semis, spellOver(root, root + semis)) + ", " + semis + " ημιτόνια πάνω από το " + rootName + ".", demo: [[root, root + semis]],
        hint: "Μέτρα ημιτόνια από το " + rootName + ": " + semis + ".",
        check(pitches) {
          const others = clean(pitches).filter(p => p !== root);
          if (!others.length) return {state: "wait", text: ""};
          const x = others[others.length - 1], d = x - root;
          if (d === semis || (d > 0 && pc(d) === pc(semis) && semis !== 12)) return {state: "ok", text: cap(ivName(d).long) + (d !== semis ? " (" + name + " σε άλλη οκτάβα)" : "") + ": " + IV[pc(semis)].char + "."};
          if (d <= 0) return {state: "wrong", text: "Αυτή είναι κάτω από το " + rootName + ". Το διάστημα μετριέται προς τα πάνω."};
          const gap = semis - d;
          return {state: "wrong", text: "Αυτή είναι " + withArticle(ivName(d).long) + ". Η σωστή είναι " + Math.abs(gap) + (Math.abs(gap) === 1 ? " ημιτόνιο" : " ημιτόνια") + (gap > 0 ? " πιο πάνω." : " πιο κάτω.")};
        }};
    }
    if (kind === "style") {
      const yesKeys = intervalMap(lensId, [root], {scale: land.scales[0]}).filter(m => m.level === "yes" && m.pitch > root).map(m => m.pitch);
      return {kind, setup: [root], answer: yesKeys.slice(0, 3), ask: land.name + ": πρόσθεσε πάνω από το " + NAMES[pc(root)] + " μια νότα που ταιριάζει στο ύφος.",
        show: "Μία από: " + yesKeys.slice(0, 3).map(p => spellOver(root, p) + " (" + ivName(p - root).short + ")").join(" · ") + ".", demo: yesKeys.slice(0, 3).map(p => [root, p]),
        hint: lens.first,
        check(pitches) {
          const others = clean(pitches).filter(p => p !== root);
          if (!others.length) return {state: "wait", text: ""};
          const x = others[others.length - 1];
          const v = judge(lensId, [root], x, {scale: land.scales[0]});
          if (!v || x < root) return {state: "wrong", text: "Πρόσθεσέ τη πάνω από το " + NAMES[pc(root)] + "."};
          if (v.level === "yes") return {state: "ok", text: v.text};
          if (!v.level) return {state: "wrong", text: "Θεμιτή, όχι χαρακτηριστική: " + v.text + " Ψάξε μια πιο δική του."};
          return {state: "wrong", text: v.text};
        }};
    }
    if (kind === "move") {
      const minor = rnd() < .5, type = pick(["P", "R", "L"]);
      const offsets = {P: [0, !minor], R: minor ? [3, false] : [9, true], L: minor ? [8, false] : [4, true]}[type];
      const target = {root: pc(root + offsets[0]), minor: offsets[1]};
      const origin = TRIAD(minor).map(t => root + t), goal = TRIAD(target.minor).map(t => target.root + t);
      const tip = {P: "η 3η αλλάζει ημιτόνιο", R: minor ? "η ρίζα πέφτει τόνο" : "η 5η ανεβαίνει τόνο", L: minor ? "η 5η ανεβαίνει ημιτόνιο" : "η ρίζα πέφτει ημιτόνιο"}[type];
      const answer = origin.map(p => goal.map(g => pc(g)).includes(pc(p)) ? p : p + (type === "P" ? (minor ? 1 : -1) : type === "R" ? (minor ? -2 : 2) : (minor ? 1 : -1)));
      const from = analyze(origin), to = analyze(answer);
      const moved = origin.find(p => !answer.includes(p)), arrived = answer.find(p => !origin.includes(p));
      return {kind, setup: [], answer, ask: "Παίξε " + triadName(root, minor) + " και κίνησε μία νότα: κάν' το " + triadName(target.root, target.minor) + ".",
        show: "Από " + origin.map(p => from.name(p)).join("–") + ": το " + from.name(moved) + " πάει στο " + to.name(arrived) + ".", demo: [origin, answer],
        hint: PLR_TEXT[type][0] + ": " + tip + ".",
        check(pitches, previous) {
          const now = clean(pitches);
          if (!now.length) return {state: "wait", text: ""};
          if (sameClasses(now, goal)) {
            const one = previous && sameClasses(previous, origin) && previous.length === now.length && match(clean(previous), now).filter(m => m.from !== m.to).length === 1;
            return {state: "ok", text: (one ? "Με μία κίνηση: " : "") + PLR_TEXT[type][0] + ". " + PLR_TEXT[type][1]};
          }
          if (sameClasses(now, origin)) return {state: "progress", text: "Αυτό είναι το " + triadName(root, minor) + ". Τώρα κίνησε μία νότα."};
          return {state: "wrong", text: "Αυτό είναι " + setLabel(analyze(now)) + ". Ξεκίνα από το " + triadName(root, minor) + ": " + tip + "."};
        }};
    }
    const low = pick([59, 52, 54, 49, 56, 57]), high = low + 6;
    const highName = spellOver(low, high);
    const inward = analyze([low + 1, high - 1]);
    return {kind: "resolve", setup: [], answer: [low + 1, high - 1], ask: "Παίξε " + NAMES[pc(low)] + "–" + highName + " (τρίτονο) και λύσ' το: κάθε φωνή ημιτόνιο, σε αντίθετη κίνηση.",
      show: "Το " + NAMES[pc(low)] + " ανεβαίνει στο " + inward.names[0] + ", το " + highName + " κατεβαίνει στο " + inward.names[1] + ".", demo: [[low, high], [low + 1, high - 1]],
      hint: "Η κάτω ανεβαίνει, η πάνω κατεβαίνει: κλείνει σε Μ3. Ή ανάποδα: ανοίγει σε μ6.",
      check(pitches) {
        const now = clean(pitches);
        if (!now.length) return {state: "wait", text: ""};
        if (same(now, [low + 1, high - 1])) return {state: "ok", text: "Μέσα, σε Μ3: όλο το V7→I σε δύο νότες."};
        if (same(now, [low - 1, high + 1])) return {state: "ok", text: "Έξω, σε μ6: η άλλη λύση του τριτόνου."};
        if (same(now, [low, high])) return {state: "progress", text: "Αυτό είναι το τρίτονο. Τώρα κίνησε και τις δύο φωνές ημιτόνιο, αντίθετα."};
        return {state: "wrong", text: "Αυτό είναι " + setLabel(analyze(now)) + ". Ξεκίνα από το " + NAMES[pc(low)] + "–" + highName + "."};
      }};
  }

  /* ------------------------------------------------------------ θεωρία */
  const SUMMARY = {
    classical: {yes: ["3ες", "6ες", "5η", "8η"], warn: ["4η πάνω από το μπάσο", "2ες και 7ες", "τρίτονο: θέλουν λύση"], no: []},
    takemitsu: {yes: ["Μ9", "μ9 απλωμένη", "♯11", "Μ7", "♯5"], warn: ["μ2 κλειστή", "♯11 δίπλα σε 5η"], no: ["5η", "8η"]},
    morricone: {yes: ["8η", "5η", "3η ψηλά", "6ες"], warn: ["2ες και 7ες στη συνοδεία", "τρίτονο"], no: ["3η κάτω από το C3"]},
    stravinsky: {yes: ["4η", "5η", "8η", "τρίτονο και μ9 ανάμεσα σε στρώματα"], warn: ["Μ7", "13: γλυκά χρώματα"], no: []},
    byzantine: {yes: ["8η", "5η σιγανότερη", "νότες του ήχου ως μελωδία"], warn: ["νότες εκτός ήχου"], no: ["δεύτερη μελωδική νότα μαζί", "συγχορδίες"]},
    hadjidakis: {yes: ["3ες", "6ες", "5η", "8η"], warn: ["μ2", "Μ7: σκληρές για τραγούδι"], no: []},
    glass: {yes: ["νότες της τριάδας", "6η: η νότα που αλλάζει"], warn: ["9η", "7ες", "τρίτονο: θολώνουν το αρπέζ"], no: []},
    jazz: {yes: ["3η", "7η", "9", "13", "♯11 σε μείζονα", "♭9 και ♭13 σε δεσπόζουσα"], warn: ["διπλή ρίζα", "♭9 εκτός δεσπόζουσας"], no: ["11 πάνω από μείζονα 3η"]},
    electronic: {yes: ["8η", "5η", "9η (sus2)", "4η (sus4)"], warn: ["μ2", "τρίτονο"], no: []},
  };
  function lensSummary(lensId) {
    if (SUMMARY[lensId]) return SUMMARY[lensId];
    const lens = lensOf(lensId);
    if (!lens.iv) return {yes: ["8", "Κ5 (σιγανότερη)", "νότες του ήχου ως μελωδία"], warn: ["νότες εκτός ήχου"], no: ["δεύτερη μελωδική νότα μαζί", "συγχορδίες"]};
    const probe = {close: false, has: () => false, bass: 60, semis: 0};
    const pick = level => Object.entries(lens.iv).filter(([, v]) => {
      const entry = typeof v === "function" ? v(probe) : v;
      return entry && entry[0] === level;
    }).map(([k]) => Number(k)).sort((x, y) => x - y).map(k => k === 0 ? "8" : IV[k].short);
    return {yes: pick("yes"), warn: pick("warn"), no: pick("no")};
  }

  return {IV, LENS, IDENTITY, pc, clean, pretty, spellOver, ivName, analyze, tension, tensionWord, judge, intervalMap, alternatives,
    review, moves, stepMoves, identities, colorCards, routes, transition, speak, plr, lensSummary, noteDegree, keyText, MODE_NAME, PLR_TEXT, quizQuestion, display};
});
