/* Chord Lab — τοπία (ύφη) και μηχανή προτάσεων.

   Ύλη: σημειώσεις σύνθεσης, ενορχήστρωσης και αρμονίας. Είναι γενικεύσεις
   ύφους για σύνθεση, όχι ανάλυση συγκεκριμένων έργων. Χωρίς εξαρτήσεις· εξάγεται για τα node tests. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Landscapes = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const pc = value => ((value % 12) + 12) % 12;
  const NAMES = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

  /* Chord tones above the root. "ison" is a single held note. */
  const TONES = {
    "": [0, 4, 7], m: [0, 3, 7], 5: [0, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
    6: [0, 4, 7, 9], m6: [0, 3, 7, 9], dim: [0, 3, 6], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], aug: [0, 4, 8],
    sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 2], madd9: [0, 3, 7, 2], maj9: [0, 4, 7, 11, 2],
    m9: [0, 3, 7, 10, 2], 9: [0, 4, 7, 10, 2], "7b9": [0, 4, 10, 1], "maj7#11": [0, 4, 11, 6], ison: [0],
  };
  const SHOW = {"7b9": "7(♭9)", "maj7#11": "maj7(♯11)", m7b5: "m7(♭5)", ison: " · ίσον"};

  /* Family of a chord quality, as the templates use it. */
  function category(quality) {
    const q = String(quality || "");
    if (["7", "9", "13", "7b9", "7sus4"].includes(q) || /^7|^9|^13/.test(q)) return "dom";
    if (["dim", "dim7", "m7b5"].includes(q)) return "dim";
    if (q === "aug") return "aug";
    if (["sus2", "sus4", "5"].includes(q)) return "sus";
    if (/^m(?!aj)/.test(q)) return "minor";
    return "major";
  }

  /* Spelling by letter: a chord's notes take consecutive letters (E–G♯–B,
     not E–A♭–B), and roots follow the Roman numeral (♭II of C is D♭). */
  const LETTERS = "CDEFGAB", LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
  const DEFAULT_LETTER = [0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
  const STEP = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
  function spell(pitchClass, letter) {
    const l = ((letter % 7) + 7) % 7;
    let diff = pc(pitchClass - LETTER_PC[l]);
    if (diff > 6) diff -= 12;
    if (Math.abs(diff) > 2) return NAMES[pc(pitchClass)];
    return LETTERS[l] + (diff === 2 ? "𝄪" : diff === -2 ? "𝄫" : diff === 1 ? "♯" : diff === -1 ? "♭" : "");
  }
  function toneStep(semi, quality) {
    const n = pc(semi), q = String(quality || "");
    if (n === 6 && /dim|b5/.test(q)) return 4;
    if (n === 8 && q === "aug") return 4;
    if (n === 9 && q === "dim7") return 6;
    return STEP[n];
  }
  const NUMERAL = {i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6};
  function parseRoman(text) {
    const match = /^([♭♯b#]*)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*)$/.exec(String(text || ""));
    if (!match) return null;
    let degree = NUMERAL[match[2].toLowerCase()];
    const secondary = /\/[♭♯b#]*(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)/.exec(match[3]);
    if (secondary) degree += NUMERAL[secondary[1].toLowerCase()];
    return {degree};
  }
  function qualityText(quality) {
    const q = quality === undefined ? "" : quality;
    return SHOW[q] !== undefined ? SHOW[q] : q.replace(/b(?=\d)/g, "♭").replace(/#(?=\d)/g, "♯");
  }

  function chordName(root, quality, bass) {
    const q = quality === undefined ? "" : quality;
    const text = NAMES[pc(root)] + (SHOW[q] !== undefined ? SHOW[q] : q.replace(/b(?=\d)/g, "♭").replace(/#(?=\d)/g, "♯"));
    return Number.isFinite(bass) && pc(bass) !== pc(root) ? text + "/" + NAMES[pc(bass)] : text;
  }

  /* ------------------------------------------------------------ τοπία
     colors: τι πατάς μαζί με τη νότα σου (η νότα σου = το 0, το μπάσο).
       notes: [ημιτόνια από τη νότα σου, ρόλος, προαιρετική]
     scales: νότες για μελωδία πάνω από τη νότα σου (τελείες).
     progressions: η τρέχουσα συγχορδία ως Ι/i· βήματα [απόσταση ρίζας,
       ποιότητα ("same" = ίδια με την τρέχουσα), απόσταση μπάσου, βαθμίδα].
     addColor: τι προσθέτεις (ή αφαιρείς) σε μια συγχορδία που ήδη παίζεις. */
  const LANDSCAPES = [
    {
      id: "classical", name: "Κλασική", short: "λειτουργίες και πτώσεις", color: "#e2c27a",
      idea: "Τονικό κέντρο και τρεις οικογένειες: σπίτι (I, vi, iii) → έξοδος (IV, ii) → ένταση (V, vii°) → σπίτι. Η αρμονία είναι κύκλος.",
      prefer: ["Καθαρή εναλλαγή λειτουργιών Τ–Υ–Δ–Τ", "Πτώσεις στο τέλος κάθε φράσης: τέλεια V–I, μισή …–V, πλάγια IV–I, απροσδόκητη V–vi", "Ρίζες που πέφτουν κατά 5η για αναπόφευκτη ροή"],
      avoid: ["Πρόγραμμα χωρίς δεσπόζουσα: «δεν πάει πουθενά»", "Παράλληλες 5ες/8ες στις εξωτερικές φωνές, αν θέλεις κλασικό ήχο"],
      tips: ["Στο τέλος της φράσης διάλεξε την πτώση· μην την αφήνεις στην τύχη.", "Αναστροφές (C/E, G/B) κάνουν το μπάσο μελωδία."],
      colors: [
        {id: "major", name: "Μείζων τριάδα", notes: [[0, "1"], [4, "3"], [7, "5", true], [12, "8", true]],
          why: "Η 3η αποφασίζει μείζον ή έλασσον· η 5η στερεώνει και μπορεί να λείψει.", use: "Φωτεινό σπίτι (I) ή έξοδος (IV)."},
        {id: "minor", name: "Ελάσσων τριάδα", notes: [[0, "1"], [3, "♭3"], [7, "5", true], [12, "8", true]],
          why: "Μικρή 3η: γλυκό, σκοτεινότερο σπίτι.", use: "i σε ελάσσονα, vi/ii/iii σε μείζονα."},
        {id: "dom7", name: "Δεσπόζουσα 7η (V7)", notes: [[0, "1"], [4, "3"], [7, "5", true], [10, "♭7"]],
          why: "Το τρίτονο 3η–♭7 ζητά λύση: η 3η ανεβαίνει ημιτόνιο, η ♭7 κατεβαίνει.", use: "Λύσ' την σε τριάδα μία 5η κάτω (G7 → C)."},
      ],
      scales: [{name: "Μείζονα", steps: [0, 2, 4, 5, 7, 9, 11]}, {name: "Αρμονική ελάσσονα", steps: [0, 2, 3, 5, 7, 8, 11], why: "Ανεβασμένη 7η: πραγματική V στην ελάσσονα."}],
      progressions: [
        {name: "I–IV–V–I", applies: ["major"], steps: [[0, ""], [5, ""], [7, ""], [0, ""]], romans: ["I", "IV", "V", "I"], why: "Τ–Υ–Δ–Τ, ο βασικός κύκλος· κλείνει με τέλεια πτώση."},
        {name: "I–vi–IV–V", applies: ["major"], steps: [[0, ""], [9, "m"], [5, ""], [7, ""]], romans: ["I", "vi", "IV", "V"], why: "Κλείνει σε μισή πτώση: φράση-ερώτηση."},
        {name: "I–IV–V7–vi (απροσδόκητη)", applies: ["major"], steps: [[0, ""], [5, ""], [7, "7"], [9, "m"]], romans: ["I", "IV", "V7", "vi"], why: "Η V υπόσχεται σπίτι και πάει στο vi: η υπόσχεση που σπάει."},
        {name: "i–iv–V7–i", applies: ["minor"], steps: [[0, "m"], [5, "m"], [7, "7"], [0, "m"]], romans: ["i", "iv", "V7", "i"], why: "Η V7 με την ανεβασμένη 7η (αρμονική ελάσσονα) δίνει δραματική πτώση."},
        {name: "i–♭VI–♭III–♭VII", applies: ["minor"], steps: [[0, "m"], [8, ""], [3, ""], [10, ""]], romans: ["i", "♭VI", "♭III", "♭VII"], why: "Ρίζες σε 4ες/5ες, όλα από τη φυσική ελάσσονα· κυκλική κίνηση χωρίς πτώση."},
        {name: "V7–I", applies: ["dom"], steps: [[0, "7"], [5, ""]], romans: ["V7", "I"], why: "Τέλεια πτώση: το τρίτονο λύνεται."},
        {name: "V7–vi", applies: ["dom"], steps: [[0, "7"], [9, "m"]], romans: ["V7", "vi"], why: "Απροσδόκητη πτώση: ίδια ένταση, άλλο σπίτι."},
      ],
      addColor: [
        {applies: ["major"], name: "maj7: φως/νοσταλγία", add: [[11, "7"]], why: "Η πρώτη «ενήλικη» νότα του ακόρντου."},
        {applies: ["minor"], name: "m7: στρογγυλό, μαλακό", add: [[10, "♭7"]], why: "Αλλάζει την ατμόσφαιρα χωρίς να αλλάξει το ακόρντο."},
      ],
    },
    {
      id: "takemitsu", name: "Ιμπρεσιονιστικό", sources: ["Debussy", "Takemitsu"], short: "χρώμα, σιωπή, αιώρηση", color: "#8ec5e8",
      idea: "Κάθε ήχος στέκεται σαν αντικείμενο σε κήπο, με τη σιωπή (ma) ανάμεσα ως υλικό. Τα ακόρντα είναι χρώματα που μένουν άλυτα. Καταγωγή: Ντεμπυσσύ, Μεσσιάν, ιαπωνική αισθητική.",
      prefer: ["Μεγάλες 2ες, τρίτονα, μικρές 9ες απλωμένες σε ανοιχτή διάταξη", "Υφή δεσπόζουσας (7, 9, ♯11) που δεν πάει πουθενά", "Πεντατονικά θραύσματα μέσα σε χρωματικό νέφος", "Ήχος στα άκρα με κενό στη μέση"],
      avoid: ["Καθαρές 5ες/8ες ως θεμέλιο: στερεώνουν τονικό κέντρο", "Κλειστές τριάδες σε 3ες", "Λύση της έντασης σε καθαρή συγχορδία", "Διπλασιασμό μελωδίας σε 3ες/6ες"],
      tips: ["Μαλακό ηχόχρωμα: divisi έγχορδα con sordino, alto flute, άρπα σε αρμονικές, τσελέστα, vibraphone χωρίς motor.", "ppp–mp· ένα mf είναι γεγονός. Άφησε κενά: τίποτα δεν παίζει συνέχεια.", "Μεγάλο reverb με αρκετό predelay· quantize σχεδόν off, rubato."],
      colors: [
        {id: "lydian", name: "Λύδιο φως: maj7(♯11) χωρίς 5η", notes: [[0, "1"], [11, "7"], [16, "3", true], [18, "♯11"]],
          why: "Μεγάλη 7η και ♯11 σε ανοιχτή διάταξη: το ακόρντο αιωρείται. Η 5η λείπει επίτηδες, για να μη στερεώσει κέντρο.", use: "Divisi έγχορδα con sord. σε pp· η ♯11 σε φλάουτο."},
        {id: "sea", name: "Ημιτόνιο + τρίτονο (το κύτταρο E♭–E–A)", notes: [[0, "1"], [13, "♭9", false, 0], [18, "♯11"]],
          why: "Το κύτταρο που ο Takemitsu λέει «S–E–A» (Es–E–A): ημιτόνιο απλωμένο σε μικρή 9η και τρίτονο. Τριβή που λάμπει χωρίς να ζητά λύση.", use: "Τρεις νότες σε τρία διαφορετικά ηχοχρώματα (klangfarben), με αέρα ανάμεσα."},
        {id: "wholetone", name: "Ολοτονικό νέφος", notes: [[0, "1"], [8, "♯5"], [14, "9"], [18, "♯11"]],
          why: "Τέσσερις νότες της ολοτονικής κλίμακας: καμία δεν έλκει άλλη, η αρμονία στέκει σαν ομίχλη.", use: "Αρμονικές βιολιών, pppp, χωρίς vibrato."},
        {id: "octatonic", name: "Δεσπόζουσα που δεν λύνεται (7♭9)", notes: [[0, "1"], [10, "♭7"], [13, "♭9"], [16, "3"], [18, "♯11", true]],
          why: "Υφή δεσπόζουσας χωρίς προορισμό. Όλες οι νότες ανήκουν στην οκτατονική κλίμακα ημιτόνιο–τόνος.", use: "Muted χάλκινα σε pp ως σκιά, ή άρπα + τσελέστα."},
      ],
      scales: [
        {name: "Οκτατονική (ημιτόνιο–τόνος)", steps: [0, 1, 3, 4, 6, 7, 9, 10], why: "Επαναλαμβάνεται κάθε μικρή 3η· η δεξαμενή του Μεσσιάν."},
        {name: "Λύδιος", steps: [0, 2, 4, 6, 7, 9, 11]},
        {name: "Ολοτονική", steps: [0, 2, 4, 6, 8, 10]},
        {name: "Πεντατονικό θραύσμα", steps: [0, 2, 4, 7, 9], why: "Για μελωδικά θραύσματα 2–4 νοτών μέσα στο νέφος."},
      ],
      progressions: [
        {name: "Μετατόπιση κατά μικρή 3η", applies: ["any"], steps: [[0, "same"], [3, "same"], [0, "same"]], romans: ["X", "X+μ3", "X"], why: "Η οκτατονική επαναλαμβάνεται κάθε μικρή 3η: το ακόρντο αλλάζει θέση, το χρώμα μένει."},
        {name: "Μπάσο ημιτόνιο κάτω", applies: ["any"], steps: [[0, "same"], [11, "same"], [0, "same"]], romans: ["X", "X−μ2", "X"], why: "Γλίστρημα κάτω από ακίνητο στρώμα· κανένα V–I."},
        {name: "Σχέση τριτόνου", applies: ["any"], steps: [[0, "same"], [6, "same"]], romans: ["X", "X+τρ."], why: "Η πιο μακρινή σχέση: δύο χρώματα που μοιράζονται το τρίτονό τους, χωρίς κατεύθυνση."},
      ],
      addColor: [
        {applies: ["major"], name: "Κάν' το λύδιο: + 7 + ♯11, − 5", add: [[11, "7"], [6, "♯11"]], remove: [7], why: "Η 5η φεύγει για να μη στερεώνει· 7η και ♯11 αιωρούνται."},
        {applies: ["minor"], name: "+ 9 + 11 (τέταρτες που αιωρούνται)", add: [[2, "9"], [5, "11"]], remove: [7], why: "Η ελάσσων ανοίγει σε στοίβα 4ων/2ων· χωρίς 5η."},
        {applies: ["dom"], name: "+ ♭9 + ♯11 (οκτατονική)", add: [[1, "♭9"], [6, "♯11"]], why: "Η δεσπόζουσα σταματά να ζητά λύση και γίνεται χρώμα."},
      ],
    },
    {
      id: "morricone", name: "Κινηματογραφική μουσική", sources: ["Morricone", "Williams"], short: "μελωδία, στρώματα, δράμα", color: "#e8a35c",
      idea: "Μία αξέχαστη μελωδία και όλη η ορχήστρα υπηρέτης της. Καθαροί όροφοι: μπάσο, κίνηση, μελωδία. Το δράμα χτίζεται με στρώματα που προστίθενται ένα ένα.",
      prefer: ["Απλές τριάδες με μία ξένη πινελιά: ♭VII, δανεική iv, χρωματική μεσότητα (C→A♭), ναπολιτάνικη", "Αργό αρμονικό ρυθμό, pedal στο μπάσο", "Ανοιχτές 5ες/8ες στο χαμηλό register", "Μελωδία σε 8ες για δύναμη χωρίς γλύκα"],
      avoid: ["3ες κάτω από το C3: λασπώνουν", "Συνοδεία που κινείται όσο η μελωδία", "Γρήγορες αλλαγές συγχορδιών", "Δύο ιδέες στην ίδια στροφή"],
      tips: ["Ένας φορέας μελωδίας τη φορά: όμποε/αγγλικό κόρνο (νοσταλγία), τρομπέτα (μοναξιά), φωνή χωρίς λόγια, βιολιά σε 8ες.", "Στροφική κλιμάκωση: κάθε στροφή προσθέτει ένα πράγμα (οστινάτο → μπάσο → έγχορδα → tutti).", "Το οστινάτο κάθεται ανάμεσα σε μπάσο και μελωδία, σε δικό του register."],
      colors: [
        {id: "epic", name: "Επικό θεμέλιο (μείζον)", notes: [[0, "1"], [7, "5"], [12, "8"], [16, "3"], [19, "5", true]],
          why: "Κάτω ανοιχτή 5η και 8η, η 3η μόνο ψηλότερα: θεμέλιο χωρίς λάσπη.", use: "Τσέλα/κόντρες σε 5η–8η, έγχορδα πάνω, μελωδία σε 8ες."},
        {id: "epic-minor", name: "Επικό θεμέλιο (ελάσσον)", notes: [[0, "1"], [7, "5"], [12, "8"], [15, "♭3"], [19, "5", true]],
          why: "Ίδια διάταξη, μικρή 3η ψηλά: βάρος και πένθος χωρίς θολούρα.", use: "Με pedal στο μπάσο για τελετουργικό βάρος."},
        {id: "mediant", name: "Pedal + ♭VI από πάνω", notes: [[0, "pedal"], [12, "8", true], [20, "♭VI·1"], [24, "♭VI·3"], [27, "♭VI·5"]],
          why: "Χρωματική μεσότητα πάνω σε ακίνητο μπάσο (C με A♭ από πάνω): σαν να άλλαξε το φως στο πλάνο.", use: "Χορωδία ή έγχορδα για την τριάδα, κόντρες στο pedal."},
      ],
      scales: [{name: "Φυσική ελάσσονα (αιολικός)", steps: [0, 2, 3, 5, 7, 8, 10]}, {name: "Δώριος", steps: [0, 2, 3, 5, 7, 9, 10], why: "Ελάσσων με φωτεινή 6η."}, {name: "Μείζονα", steps: [0, 2, 4, 5, 7, 9, 11]}],
      progressions: [
        {name: "I–♭VII–IV–I", applies: ["major"], steps: [[0, ""], [10, ""], [5, ""], [0, ""]], romans: ["I", "♭VII", "IV", "I"], why: "Η ♭VII δανεισμένη από τον μιξολύδιο: ηρωικό, λίγο αρχαϊκό."},
        {name: "I–♭VI–I (χρωματική μεσότητα)", applies: ["major"], steps: [[0, ""], [8, ""], [0, ""]], romans: ["I", "♭VI", "I"], why: "Μείζονες τριάδες σε απόσταση 3ης με μία κοινή νότα: αλλάζει ο κόσμος, χωρίς λειτουργική λογική."},
        {name: "I–iv–I (δανεική iv)", applies: ["major"], steps: [[0, ""], [5, "m"], [0, ""]], romans: ["I", "iv", "I"], why: "Σύννεφο που περνά μπροστά από τον ήλιο."},
        {name: "i–♭VII–♭VI–V", applies: ["minor"], steps: [[0, "m"], [10, ""], [8, ""], [7, ""]], romans: ["i", "♭VII", "♭VI", "V"], why: "Κατιούσα γραμμή μπάσου ως τη μείζονα V: δράμα που επιστρέφει."},
        {name: "i–iv πάνω σε pedal", applies: ["minor"], steps: [[0, "m"], [5, "m", 0], [0, "m"]], romans: ["i", "iv/1", "i"], why: "Το μπάσο μένει· η αρμονία αλλάζει από πάνω. Τελετουργικό βάρος."},
        {name: "i–♭II–V7–i (ναπολιτάνικη)", applies: ["minor"], steps: [[0, "m"], [1, ""], [7, "7"], [0, "m"]], romans: ["i", "♭II", "V7", "i"], why: "Σκοτεινή αρχοντιά πριν τη V· κράτα την για μία στιγμή του κομματιού."},
      ],
      addColor: [
        {applies: ["major", "minor"], name: "Θεμέλιο 8ας + 5ης στο μπάσο", add: [[-12, "8 κάτω", "bass"], [-5, "5 κάτω", "bass"]], why: "Ανοιχτή 5η και 8η κάτω από το ακόρντο: επικό θεμέλιο, χωρίς 3η χαμηλά."},
      ],
    },
    {
      id: "stravinsky", name: "Μοντερνισμός", sources: ["Stravinsky"], short: "ρυθμός, μπλοκ, στεγνή λάμψη", color: "#e86f5c",
      idea: "Η ενέργεια έρχεται από τον ρυθμό και τη σύγκρουση καθαρών μπλοκ. Όλα στεγνά και κοφτά· η αρμονία στέκει μέσα στο μπλοκ και η «πρόοδος» είναι το κόψιμο.",
      prefer: ["Δύο απλές τριάδες μαζί, η καθεμία καθαρή στο δικό της στρώμα", "Οκτατονική συλλογή: τριάδες και τρίτονα μαζί", "Στοίβες 4ων/5ων· μικρές 2ες/9ες ανάμεσα σε στρώματα"],
      avoid: ["Πλούσιες 7ες/9ες τζαζ υφής", "Χρωματικό γλίστρημα φωνών: εδώ οι αλλαγές κόβονται", "Λύση της διαφωνίας των δύο τριάδων: η σύγκρουση είναι το ίδιο το χρώμα"],
      tips: ["Μέτρα που αλλάζουν (3/8 → 2/4 → 5/8) και τονισμοί που μετακινούνται.", "Έγχορδα ως κρουστά (down-bows, marcato)· ξύλινα στο κέντρο, φαγκότο ψηλά.", "Μικρό reverb, quantize σφιχτό: η ακρίβεια είναι η έκφραση."],
      colors: [
        {id: "petrushka", name: "Petrushka: δύο μείζονες σε τρίτονο", notes: [[0, "1"], [4, "3"], [7, "5"], [18, "1′", false, 3], [22, "3′", false, 5], [25, "5′", false, 0]],
          why: "Η τριάδα σου κάτω και η μείζων τριάδα ένα τρίτονο ψηλότερα από πάνω (C + F♯). Η τραχύτητα βγαίνει από τη συνύπαρξη δύο καθαρών στρωμάτων.", use: "Δύο χέρια, δύο ηχοχρώματα, η καθεμία τριάδα στο δικό της στρώμα."},
        {id: "augurs", name: "Augurs: μείζων + 7η δεσπόζουσας ημιτόνιο χαμηλότερα", notes: [[0, "1"], [4, "3"], [7, "5"], [11, "1′", false, 6], [15, "3′", false, 1], [18, "5′", false, 3], [21, "♭7′", false, 5]],
          why: "Η συγχορδία των «Augurs» από την Ιεροτελεστία της Άνοιξης: F♭ μείζονα κάτω, E♭7 πάνω. Στο έργο χτυπιέται από τα έγχορδα με ακανόνιστους τονισμούς.", use: "Down-bows, στεγνά· οι τονισμοί σε κόρνα."},
        {id: "quartal", name: "Στοίβα 4ων", notes: [[0, "1"], [5, "4"], [10, "♭7"], [15, "♭3"]],
          why: "Καθαρές 4ες η μία πάνω στην άλλη: στεγνός, αρχαϊκός ήχος χωρίς δήλωση μείζονος ή ελάσσονος.", use: "Ξύλινα σε staccato, ή πιάνο + pizzicato."},
      ],
      scales: [{name: "Οκτατονική (τόνος–ημιτόνιο)", steps: [0, 2, 3, 5, 6, 8, 9, 11]}, {name: "Λαϊκότροπο κύτταρο (4 νότες)", steps: [0, 2, 3, 5], why: "Στενό μελωδικό υλικό, έκταση 4ης· η ζωή του είναι ρυθμική."}],
      progressions: [
        {name: "Μπλοκ στον οκτατονικό άξονα", applies: ["any"], steps: [[0, "same"], [3, "same"], [6, "same"], [9, "same"]], romans: ["X", "X+μ3", "X+τρ.", "X+Μ6"], why: "Τέσσερις τριάδες της ίδιας οκτατονικής συλλογής· κόψε από μπλοκ σε μπλοκ, χωρίς μετάβαση."},
        {name: "Μπλοκ ↔ τρίτονο", applies: ["any"], steps: [[0, "same"], [6, "same"], [0, "same"]], romans: ["X", "X+τρ.", "X"], why: "Δύο καθαρά μπλοκ σε σύγκρουση· η επανάληψη με αλλαγμένο μέτρο είναι η ανάπτυξη."},
        {name: "Στατικό μπλοκ, κινητός τονισμός", applies: ["any"], steps: [[0, "same"]], romans: ["X"], why: "Η αρμονία δεν αλλάζει· άλλαξε μέτρο και θέση τονισμού."},
      ],
      addColor: [
        {applies: ["major", "minor"], name: "+ δεύτερη τριάδα σε τρίτονο από πάνω", add: [[6, "1′", "top", 3], [10, "3′", "top", 5], [13, "5′", "top", 0]], why: "Η τριάδα σου μένει κάτω, μία μείζων τριάδα ένα τρίτονο μακριά μπαίνει από πάνω (Petrushka)."},
      ],
    },
    {
      id: "byzantine", name: "Βυζαντινό", short: "ίσον, μονοφωνία, ετεροφωνία", color: "#c9a6e8",
      idea: "Μία μελωδική γραμμή και το ίσον της. Ό,τι προστίθεται αντηχεί τη γραμμή χωρίς να την εναρμονίζει. Στην ορχήστρα πρόκειται για στυλιζάρισμα που σέβεται την ψαλτική.",
      prefer: ["Ίσον: μία νότα, κρατημένη· 8η για πάχος, 5η μόνο ως δεύτερο, πιο σιγανό στρώμα", "Βηματική μελωδία με βαρύτητα προς τη βάση, μελίσματα", "Ετεροφωνία: η ίδια μελωδία απλούστερη ή στολισμένη σε δεύτερο όργανο"],
      avoid: ["3ες, 6ες και συγχορδιακή συνοδεία", "Πτώσεις V–I και συνοδεία σε αρπέζ", "Ίσον που κινείται συχνά"],
      tips: ["Ίσον: τσέλα + κόντρες σε 8ες ή χαμηλή χορωδία· μελωδία σε χορωδία unison ή τσέλο/αγγλικό κόρνο.", "Οι πραγματικοί ήχοι έχουν μικροδιαστήματα· εδώ είναι προσεγγίσεις 12 ημιτονίων. Έλξεις με pitch bend ±20–40 cents.", "Μεγάλο reverb «ναού», rubato."],
      colors: [
        {id: "ison", name: "Ίσον", notes: [[0, "ίσον"], [12, "8", true]],
          why: "Μία νότα κρατημένη, η 8η για πάχος. Τίποτα άλλο κάθετα· η μελωδία κινείται πάνω από αυτήν (τελείες).", use: "Τσέλα + κόντρες σε 8ες."},
        {id: "ison5", name: "Ίσον με 5η (το όριο)", notes: [[0, "ίσον"], [7, "5", true], [12, "8"]],
          why: "8η και 5η είναι το όριο· η 5η μπαίνει πιο σιγανά, ως δεύτερο στρώμα.", use: "Χαμηλή χορωδία σε «ουμ», η 5η σε όργανο/synth drone."},
      ],
      scales: [
        {name: "Διατονικός (προσέγγιση ήχου α΄)", steps: [0, 2, 3, 5, 7, 9, 10], alt: [8], why: "Σαν δώριος/φυσική ελάσσονα με ρευστή 6η: ανεβαίνοντας ψηλότερα, κατεβαίνοντας χαμηλότερα."},
        {name: "Χρωματικός (προσέγγιση πλ. β΄)", steps: [0, 1, 4, 5, 7, 8, 11], why: "Με αυξημένες 2ες (π.χ. στο Ρε: Ρε–Μι♭–Φα♯–Σολ–Λα–Σι♭–Ντο♯). Το βαρύ ανατολικό χρώμα."},
      ],
      progressions: [
        {name: "Κίνηση ίσου σε άρθρωση φράσης", applies: ["any"], steps: [[0, "ison"], [10, "ison"], [0, "ison"]], romans: ["βάση", "τόνος κάτω", "βάση"], why: "Το ίσον μετακινείται σπάνια και αργά, σε τέλος φράσης· αν το μπάσο περπατά, χάθηκε ο βράχος."},
      ],
      addColor: [
        {applies: ["any"], name: "Αφαίρεσε την 3η: κράτα 1–5–8", add: [], remove: [3, 4, 8, 9], why: "Οι 3ες και οι 6ες διαλύουν το ιδίωμα ακαριαία."},
      ],
      chordWarning: "Στο βυζαντινό τοπίο οι συγχορδίες δεν ανήκουν στο ιδίωμα: κράτα το ίσον και βάλε τη μελωδία από πάνω.",
    },
    {
      id: "hadjidakis", name: "Νεοελληνική λόγια μουσική", sources: ["Χατζιδάκις"], short: "λυρικό τραγούδι, ελάσσων", color: "#9fd18b",
      idea: "Λυρική μελωδία πάνω σε απλή αρμονία. Το κρίσιμο δίλημμα της ελάσσονας: v ή V — απαλό/μοντάλ ή δραματικό/κλασικό. Η κατιούσα γραμμή μπάσου ως αρχετυπική μελαγχολία.",
      prefer: ["Επιλογή v (φυσική) ή V (αρμονική ελάσσονα) ανάλογα με το βάρος της φράσης", "Μπάσο που κατεβαίνει βήμα βήμα (lament)", "Δανεικά από την ελάσσονα μέσα σε μείζονα (iv)"],
      avoid: ["Πυκνά τζαζ voicings που σκεπάζουν τη μελωδία", "Γρήγορο αρμονικό ρυθμό κάτω από λυρική γραμμή"],
      tips: ["Η απόδοση στον Χατζιδάκι είναι γενίκευση από σημειώσεις αρμονίας· δεν προέρχεται από ανάλυση συγκεκριμένων τραγουδιών.", "Γράψε πρώτα τη γραμμή του μπάσου και χτίσε τα ακόρντα πάνω της."],
      colors: [
        {id: "minor-open", name: "Ελάσσων ανοιχτή", notes: [[0, "1"], [7, "5"], [12, "8", true], [15, "♭3"]],
          why: "Μπάσο και 5η χαμηλά, η 3η ψηλότερα: γεμάτη αλλά καθαρή ελάσσων για τραγούδι.", use: "Πιάνο: αριστερό 1–5, δεξί 8–♭3 και η μελωδία."},
        {id: "major-open", name: "Μείζων ανοιχτή", notes: [[0, "1"], [7, "5"], [12, "8", true], [16, "3"]],
          why: "Η ίδια διάταξη σε μείζονα: φως χωρίς βάρος.", use: "Βαλς ή μπαλάντα: μπάσο στο 1, ακόρντο στα 2–3."},
      ],
      scales: [
        {name: "Φυσική ελάσσονα", steps: [0, 2, 3, 5, 7, 8, 10], why: "Δίνει v: απαλό, μοντάλ."},
        {name: "Αρμονική ελάσσονα", steps: [0, 2, 3, 5, 7, 8, 11], why: "Ανεβασμένη 7η: V7 και το «ανατολίτικο» βήμα ♭6–7 (αυξημένη 2η)."},
      ],
      progressions: [
        {name: "i–v–i (απαλό)", applies: ["minor"], steps: [[0, "m"], [7, "m"], [0, "m"]], romans: ["i", "v", "i"], why: "Χωρίς προσαγωγέα: η φράση ακουμπά, δεν κλείνει δραματικά."},
        {name: "i–V7–i (δραματικό)", applies: ["minor"], steps: [[0, "m"], [7, "7"], [0, "m"]], romans: ["i", "V7", "i"], why: "Με την ανεβασμένη 7η: η ίδια φράση γίνεται πτώση με βάρος."},
        {name: "Lament: i – i/♭7 – ♭VI – V7", applies: ["minor"], steps: [[0, "m"], [0, "m", 10], [8, ""], [7, "7"]], romans: ["i", "i/♭7", "♭VI", "V7"], why: "Το μπάσο κατεβαίνει 1–♭7–♭6–5: η αρχετυπική γραμμή της μελαγχολίας."},
        {name: "Χρωματικό lament", applies: ["minor"], steps: [[0, "m"], [7, "", 11], [3, "", 10], [5, "", 9], [8, ""], [7, "7"]], romans: ["i", "V⁶", "♭III⁶₄", "IV⁶", "♭VI", "V7"], why: "Μπάσο 1–7–♭7–6–♭6–5 κατά ημιτόνια (στη Λα: A–G♯–G–F♯–F–E)."},
        {name: "I–IV–iv–I", applies: ["major"], steps: [[0, ""], [5, ""], [5, "m"], [0, ""]], romans: ["I", "IV", "iv", "I"], why: "Η δανεική iv: μία νότα σκοτεινιάζει (η 3η της IV κατεβαίνει) πριν το σπίτι."},
      ],
      addColor: [
        {applies: ["minor"], name: "Κράτα την τριάδα", add: [], why: "Το χρώμα έρχεται από την επόμενη συγχορδία (v ή V)."},
      ],
    },
    {
      id: "glass", name: "Μινιμαλισμός", sources: ["Glass"], short: "οστινάτο, επανάληψη", color: "#7fd6c8",
      idea: "Λίγα ακόρντα, ατέλειωτο αρπέζ. Η επανάληψη μετατοπίζει την προσοχή στις μικροδιαφορές· η εξέλιξη έρχεται από το μοτίβο, ενώ η αρμονία μένει σχεδόν ακίνητη.",
      prefer: ["Αρπέζ τριάδων σε όγδοα, πολλή ώρα", "Αλλαγή μίας νότας ανάμεσα σε ακόρντα (Am → F/A)", "Προσθετική/αφαιρετική διαδικασία: 3 → 4 → 5 νότες στο σχήμα", "Γρήγορη επιφάνεια πάνω από πολύ αργό αρμονικό βάθος"],
      avoid: ["Πολλές συγχορδίες ανά μέτρο", "Πυκνές επεκτάσεις που θολώνουν το αρπέζ"],
      tips: ["Μία αλλαγή αρμονίας κάθε 4–8 μέτρα.", "Ίδιο σχήμα σε διαφορετικά μήκη κύκλου (3 πάνω σε 4) για ζωή χωρίς νέο υλικό.", "Πιάνο, όργανο, ξύλινα σε όγδοα· ή sequencer."],
      colors: [
        {id: "arp-minor", name: "Ελάσσων για αρπέζ", notes: [[0, "1"], [3, "♭3"], [7, "5"], [12, "8", true]],
          why: "Τρεις νότες αρκούν· παίζονται σε σταθερό αρπέζ (όγδοα) και αλλάζουν σπάνια.", use: "Σχήμα 1–5–8–♭3 ή 1–♭3–5–♭3 επαναλαμβανόμενο."},
        {id: "one-note", name: "Αλλάζει μία νότα: i → ♭VI/3", notes: [[0, "1"], [3, "♭3"], [8, "♭6"]],
          why: "Από Am σε F/A: η 5η ανεβαίνει ημιτόνιο, οι άλλες μένουν. Μία νότα αλλάζει, το φως αλλάζει.", use: "Εναλλάσσεις με το προηγούμενο χρώμα κάθε 4 μέτρα."},
      ],
      scales: [{name: "Φυσική ελάσσονα", steps: [0, 2, 3, 5, 7, 8, 10]}, {name: "Μείζονα", steps: [0, 2, 4, 5, 7, 9, 11]}],
      progressions: [
        {name: "i–♭VI", applies: ["minor"], steps: [[0, "m"], [8, ""], [0, "m"]], romans: ["i", "♭VI", "i"], why: "Δύο κοινές νότες, μία αλλάζει· εναλλαγή ανά 4 μέτρα πάνω από σταθερό αρπέζ."},
        {name: "i–♭VI–♭III–♭VII", applies: ["minor"], steps: [[0, "m"], [8, ""], [3, ""], [10, ""]], romans: ["i", "♭VI", "♭III", "♭VII"], why: "Ένα ακόρντο ανά 4 μέτρα (Am → F → C → G)· η επιφάνεια μένει ίδια."},
        {name: "I–V–vi–IV", applies: ["major"], steps: [[0, ""], [7, ""], [9, "m"], [5, ""]], romans: ["I", "V", "vi", "IV"], why: "Κυκλικό πρόγραμμα για ατέλειωτο αρπέζ· οι φωνές κινούνται ελάχιστα."},
      ],
      addColor: [
        {applies: ["any"], name: "Κάν' το αρπέζ", add: [], why: "Μην προσθέσεις νότες· παίξε τις ίδιες σε σταθερό σχήμα και άλλαξε μία κάθε λίγα μέτρα."},
      ],
    },
    {
      id: "jazz", name: "Τζαζ", short: "ii–V–I, επεκτάσεις, voicings", color: "#f0d36a",
      idea: "Οι πάνω νότες (9, 11, 13) δίνουν πιο πλούσιο φως. Η ταυτότητα του ακόρντου ζει στην 3η και την 7η· η ισχυρότερη πορεία προς στόχο είναι το ii–V–I.",
      prefer: ["Shell voicings: ρίζα + 3η + 7η", "Επεκτάσεις 9/11/13 στις πάνω φωνές", "Αντικατάσταση τριτόνου (D♭7 αντί G7)", "Δευτερεύουσες δεσπόζουσες (V/ii)"],
      avoid: ["Ρίζα και 5η διπλασιασμένες στο δεξί χέρι: σκεπάζουν τα χρώματα", "3ες χαμηλά στο μπάσο σε πυκνά voicings"],
      tips: ["3η και 7η ανταλλάσσουν θέσεις στο ii–V–I σχεδόν χωρίς κίνηση.", "Η μελωδία σου συχνά κάθεται ήδη σε 9η ή 13η: ονόμασέ το και έλεγξέ το."],
      colors: [
        {id: "shell", name: "Shell: 1–7–3 (maj7)", notes: [[0, "1"], [11, "7"], [16, "3"]],
          why: "Η ταυτότητα του ακόρντου ζει στην 3η και την 7η· τρεις νότες αρκούν.", use: "Αριστερό χέρι· το δεξί μένει ελεύθερο για μελωδία."},
        {id: "m9", name: "m9: 1–♭7–9–♭3–5", notes: [[0, "1"], [10, "♭7"], [14, "9"], [15, "♭3"], [19, "5", true]],
          why: "9η και ♭3 σε απόσταση ημιτονίου μέσα στο voicing: στρογγυλή τριβή.", use: "ii σε ii–V–I, ή μοντάλ δώριο."},
        {id: "sowhat", name: "Τετάρτες + 3η (voicing «So What»)", notes: [[0, "1"], [5, "11"], [10, "♭7"], [15, "♭3"], [19, "5"]],
          why: "Τρεις καθαρές 4ες και μία μεγάλη 3η από πάνω: το voicing του «So What» (Miles Davis, 1959). Δώριο, ανοιχτό.", use: "Παράλληλη μετακίνηση του ίδιου σχήματος στον δώριο."},
      ],
      scales: [{name: "Δώριος", steps: [0, 2, 3, 5, 7, 9, 10]}, {name: "Μιξολύδιος", steps: [0, 2, 4, 5, 7, 9, 10]}, {name: "Μείζονα", steps: [0, 2, 4, 5, 7, 9, 11]}],
      progressions: [
        {name: "ii–V–I (εσύ είσαι το ii)", applies: ["minor"], steps: [[0, "m7"], [5, "7"], [10, "maj7"]], romans: ["ii7", "V7", "Imaj7"], why: "Υποδεσπόζουσα → δεσπόζουσα → σπίτι, ρίζες σε 5ες."},
        {name: "ii–♭II7–I (υποκατάσταση τριτόνου)", applies: ["minor"], steps: [[0, "m7"], [11, "7"], [10, "maj7"]], romans: ["ii7", "♭II7", "Imaj7"], why: "Το μπάσο γλιστρά χρωματικά (D–D♭–C)· η D♭7 μοιράζεται το τρίτονο της G7."},
        {name: "I–vi–ii–V", applies: ["major"], steps: [[0, "maj7"], [9, "m7"], [2, "m7"], [7, "7"]], romans: ["Imaj7", "vi7", "ii7", "V7"], why: "Turnaround: επιστρέφει πάντα στο I."},
        {name: "I – V/ii – ii – V", applies: ["major"], steps: [[0, "maj7"], [9, "7"], [2, "m7"], [7, "7"]], romans: ["Imaj7", "V7/ii", "ii7", "V7"], why: "Η A7 πριν το Dm7 είναι η δεσπόζουσά του: προβολέας πάνω στο ii."},
        {name: "V7–I", applies: ["dom"], steps: [[0, "7"], [5, "maj7"]], romans: ["V7", "Imaj7"], why: "Η 3η και η 7η λύνονται ημιτονιακά."},
        {name: "V7 – ♭II7 – I", applies: ["dom"], steps: [[0, "7"], [6, "7"], [5, "maj7"]], romans: ["V7", "♭II7", "Imaj7"], why: "Η υποκατάσταση τριτόνου πριν το σπίτι: κομψότητα αντί βαρύτητας."},
      ],
      addColor: [
        {applies: ["major"], name: "maj9: + 7 + 9", add: [[11, "7"], [2, "9"]], why: "Φως στην κορυφή χωρίς να αλλάξει η λειτουργία."},
        {applies: ["minor"], name: "m9: + ♭7 + 9", add: [[10, "♭7"], [2, "9"]], why: "Στρογγυλό, ανοιχτό ii ή δώριο i."},
        {applies: ["dom"], name: "13: + ♭7 + 13", add: [[10, "♭7"], [9, "13"]], why: "Δεσπόζουσα με φως· για σκοτάδι δοκίμασε ♭9 αντί 13."},
      ],
    },
    {
      id: "electronic", name: "Ηλεκτρονική / ambient", short: "sus, add9, pedal", color: "#b69cf0",
      idea: "Pads που αιωρούνται και μπάσο που μένει. Η 3η κρύβεται ή μαλακώνει (sus, add9)· η κίνηση έρχεται από sequence και ηχόχρωμα πάνω από αργό αρμονικό βάθος.",
      prefer: ["sus2/sus4 που δεν δηλώνουν μείζον/έλασσον", "add9: αέρας χωρίς το βάρος της 7ης", "Pedal στο μπάσο με αλλαγές από πάνω"],
      avoid: ["Πυκνά voicings στο χαμηλό register: το pad λασπώνει", "Γρήγορο αρμονικό ρυθμό κάτω από sequence"],
      tips: ["Sequence/αρπέζ στη μέση, pad από πάνω, μπάσο-pedal κάτω.", "Filter και envelope αλλάζουν το χρώμα όσο η αρμονία μένει."],
      colors: [
        {id: "sus2", name: "sus2 ανοιχτό (pad)", notes: [[0, "1"], [7, "5"], [14, "9"], [19, "5", true]],
          why: "Χωρίς 3η: ούτε μείζον ούτε έλασσον, το pad αιωρείται.", use: "Pad με αργό attack· το μπάσο στο 1."},
        {id: "add9", name: "add9", notes: [[0, "1"], [7, "5"], [14, "9"], [16, "3"]],
          why: "Η 9η δίπλα στην 3η: αέρας και φως χωρίς το βάρος της 7ης.", use: "Κιθάρα ή πιάνο σε ανοιχτή διάταξη."},
        {id: "pedal", name: "Pedal (μπάσο που μένει)", notes: [[0, "pedal"], [12, "8"]],
          why: "Μία νότα μένει ακίνητη ενώ τα ακόρντα αλλάζουν από πάνω: βάθος χωρίς πυκνότητα.", use: "Sub/drone στο 1· άλλαξε ακόρντα από πάνω και άκου ποια τρίβουν όμορφα."},
      ],
      scales: [{name: "Αιολικός", steps: [0, 2, 3, 5, 7, 8, 10]}, {name: "Δώριος", steps: [0, 2, 3, 5, 7, 9, 10]}, {name: "Λύδιος", steps: [0, 2, 4, 6, 7, 9, 11]}],
      progressions: [
        {name: "Isus2 – IVadd9 πάνω σε pedal", applies: ["major", "sus"], steps: [[0, "sus2"], [5, "add9", 0], [0, "sus2"]], romans: ["Isus2", "IVadd9/1", "Isus2"], why: "Το μπάσο μένει, το pad αλλάζει: κίνηση χωρίς βάρος."},
        {name: "I–V–vi–IV ως sus/add9", applies: ["major", "sus"], steps: [[0, "add9"], [7, "sus4"], [9, "madd9"], [5, "add9"]], romans: ["Iadd9", "Vsus4", "vi(add9)", "IVadd9"], why: "Το ίδιο κυκλικό πρόγραμμα με κρυμμένες ή μαλακές 3ες."},
        {name: "i–♭VI–♭VII πάνω σε pedal", applies: ["minor"], steps: [[0, "m"], [8, "", 0], [10, "", 0], [0, "m"]], romans: ["i", "♭VI/1", "♭VII/1", "i"], why: "Τρία ακόρντα πάνω από ακίνητο μπάσο: σκοτεινό, ταξιδιάρικο."},
      ],
      addColor: [
        {applies: ["major", "minor"], name: "Κρύψε την 3η (sus2)", add: [[2, "9"]], remove: [3, 4], why: "Το ακόρντο σταματά να δηλώνει μείζον/έλασσον."},
      ],
    },
  ];

  const byId = id => LANDSCAPES.find(l => l.id === id) || LANDSCAPES[0];

  /* ------------------------------------------------------------ μηχανή */

  /* Letter distance of a role: "7" → 6, "♯11" → 3, "♭9" → 1, "♭VI·3" → 0
     (the third of the ♭VI). Null when the role has no degree in it. */
  function roleStep(role) {
    const text = String(role || "");
    const roman = /^[♭♯]?(VII|VI|IV|V|III|II|I)·(\d+)/.exec(text);
    if (roman) return (NUMERAL[roman[1].toLowerCase()] + Number(roman[2]) - 1) % 7;
    if (/′/.test(text)) return null;
    const number = /(\d+)/.exec(text);
    return number ? (Number(number[1]) - 1) % 7 : null;
  }
  const accidentals = name => (name.match(/[♯♭]/g) || []).length + 3 * (name.match(/[𝄪𝄫]/g) || []).length;

  /* Names for notes above a root (entries: [semi, role, step]). The played
     note keeps its usual name unless another spelling saves accidentals
     (C♯ → D♭ for D♭–C–F–G). A second layer (roles with ′, as in Petrushka or
     the Augurs chord) is spelled on its own root: E + B♭ major, not A♯–C𝄪–E♯. */
  function chooseSpelling(rootPc, entries, defaultPenalty) {
    const candidates = [0, 1, 2, 3, 4, 5, 6].filter(letter => { let d = pc(rootPc - LETTER_PC[letter]); if (d > 6) d -= 12; return Math.abs(d) <= 1; });
    let best = null;
    for (const letter of candidates) {
      const names = entries.map(([semi, step]) => step === null ? (pc(semi) === 0 ? spell(rootPc, letter) : NAMES[pc(rootPc + semi)]) : spell(rootPc + semi, letter + step));
      const root = spell(rootPc, letter);
      const score = names.reduce((sum, name) => sum + accidentals(name), 0) + accidentals(root) * .5 + (letter === DEFAULT_LETTER[pc(rootPc)] ? 0 : defaultPenalty);
      if (!best || score < best.score) best = {score, root, names};
    }
    return best;
  }
  function spellSet(rootPc, entries) {
    const steps = entries.map(([, role, step]) => Number.isInteger(step) ? step : roleStep(role));
    const upper = entries.map(([, role], i) => /′/.test(role || "") ? i : -1).filter(i => i >= 0);
    const lower = entries.map((_, i) => i).filter(i => !upper.includes(i));
    const names = new Array(entries.length);
    const first = chooseSpelling(rootPc, lower.map(i => [entries[i][0], steps[i]]), 1.5);
    lower.forEach((i, k) => { names[i] = first.names[k]; });
    if (upper.length) {
      const base = upper[0], baseSemi = entries[base][0], baseStep = steps[base] || 0;
      const layer = chooseSpelling(pc(rootPc + baseSemi), upper.map(i => [entries[i][0] - baseSemi, steps[i] === null ? null : ((steps[i] - baseStep) % 7 + 7) % 7]), .25);
      upper.forEach((i, k) => { names[i] = layer.names[k]; });
    }
    // A double sharp or flat helps nobody at the keyboard: use the plain name.
    return {root: first.root, names: names.map((name, i) => /[𝄪𝄫]/.test(name) ? NAMES[pc(rootPc + entries[i][0])] : name)};
  }

  /* Keys to press with one note: {pitch, role, optional, name}, the note itself first. */
  function colorVoicing(color, bassPitch) {
    const spelled = spellSet(pc(bassPitch), color.notes.map(([semi, role, , step]) => [semi, role, step]));
    return color.notes.map(([semi, role, optional], index) => ({pitch: bassPitch + semi, role, optional: Boolean(optional), name: spelled.names[index], rootName: spelled.root}))
      .filter(item => item.pitch >= 21 && item.pitch <= 108);
  }

  /* Scale dots over two octaves from the note. */
  function scaleDots(scale, bassPitch) {
    const steps = [...scale.steps, ...(scale.alt || [])];
    const result = [];
    for (let octave = 0; octave < 2; octave += 1) {
      steps.forEach(step => { const pitch = bassPitch + 12 * octave + step; if (pitch <= 108) result.push(pitch); });
    }
    return [...new Set(result)].sort((a, b) => a - b);
  }

  function applies(template, quality) {
    const family = category(quality);
    return template.applies.includes("any") || template.applies.includes(family);
  }

  /* Progressions of a landscape that start from this chord. */
  function progressionsFor(landscape, chord) {
    if (!chord) return [];
    const letter0 = Number.isInteger(chord.letter) ? chord.letter : DEFAULT_LETTER[pc(chord.root)];
    return landscape.progressions.filter(template => applies(template, chord.quality)).map(template => {
      const first = parseRoman(template.romans[0]);
      const tonicLetter = first ? letter0 - first.degree : null;
      return {
        name: template.name, why: template.why, romans: template.romans,
        chords: template.steps.map(([offset, quality, bassOffset], index) => {
          const q = quality === "same" ? chord.quality : quality;
          const rootPc = pc(chord.root + offset);
          const bass = Number.isFinite(bassOffset) ? pc(chord.root + bassOffset) : (offset === 0 && quality === "same" ? chord.bass : rootPc);
          const numeral = parseRoman(template.romans[index]);
          const rootLetter = tonicLetter !== null && numeral ? tonicLetter + numeral.degree : letter0 + STEP[pc(offset)];
          let label = spell(rootPc, rootLetter) + qualityText(q);
          if (pc(bass) !== rootPc) label += "/" + spell(bass, rootLetter + toneStep(bass - rootPc, q));
          return {root: rootPc, quality: q, bass, label, letter: ((rootLetter % 7) + 7) % 7};
        }),
      };
    });
  }

  function tonesOf(target) {
    const tones = TONES[target.quality] || TONES[""];
    return tones.map(t => pc(target.root + t));
  }

  /* Smallest movement from the keys you hold to the target chord: the bass
     moves to the nearest target bass, every upper voice to the nearest
     target tone, and missing tones replace doubled ones. */
  function voiceLead(pitches, target) {
    const held = [...new Set((pitches || []).map(Math.round))].sort((a, b) => a - b);
    const tones = tonesOf(target);
    const bassPc = Number.isFinite(target.bass) ? target.bass : target.root;
    if (!held.length) {
      const base = 48 + pc(bassPc);
      return [base, ...tones.filter(t => t !== pc(bassPc)).map(t => 60 + pc(t - 0))].sort((a, b) => a - b);
    }
    const nearest = (pitch, classes) => {
      let best = null;
      for (let d = 0; d <= 6; d += 1) {
        for (const candidate of [pitch - d, pitch + d]) if (classes.includes(pc(candidate))) { best = candidate; break; }
        if (best !== null) break;
      }
      return best;
    };
    const bass = nearest(held[0], [pc(bassPc)]);
    const upper = held.slice(1).map(p => nearest(p, tones));
    const result = [bass, ...upper];
    const missing = tones.filter(t => !result.some(p => pc(p) === t) && t !== pc(bassPc));
    // Replace doubled upper notes with missing tones, nearest first.
    for (const tone of missing) {
      const counts = new Map();
      result.slice(1).forEach(p => counts.set(pc(p), (counts.get(pc(p)) || 0) + 1));
      const index = result.findIndex((p, i) => i > 0 && (counts.get(pc(p)) > 1 || pc(p) === pc(bassPc)));
      if (index > 0) result[index] = nearest(result[index], [tone]);
      else if (result.length < 5) result.push(nearest(result[result.length - 1] + 2, [tone]));
    }
    return [...new Set(result.filter(Number.isFinite))].sort((a, b) => a - b);
  }

  /* What a landscape adds to (or removes from) the chord you hold. */
  function colorChord(landscape, chord, pitches) {
    if (!chord) return null;
    const rule = (landscape.addColor || []).find(r => applies(r, chord.quality));
    if (!rule) return null;
    const held = [...pitches].sort((a, b) => a - b);
    const top = held[held.length - 1], bass = held[0];
    const items = [];
    let stackTop = top;                       // "top" notes stack upward as one layer
    const letter = Number.isInteger(chord.letter) ? chord.letter : DEFAULT_LETTER[pc(chord.root)];
    for (const [semi, role, anchor, step] of rule.add) {
      let pitch;
      if (anchor === "bass") pitch = bass + semi;
      else if (anchor === "top") { pitch = stackTop + 1; while (pc(pitch) !== pc(chord.root + semi)) pitch += 1; stackTop = pitch; }
      else {
        const target = pc(chord.root + semi);
        if (held.some(p => pc(p) === target)) continue;
        pitch = top + 1;
        while (pc(pitch) !== target) pitch += 1;
        if (pitch - top > 7 && pitch - 12 > bass) pitch -= 12;
      }
      const letterStep = Number.isInteger(step) ? step : roleStep(role);
      const name = letterStep === null ? NAMES[pc(pitch)] : spell(pitch, letter + letterStep);
      if (pitch >= 21 && pitch <= 108 && !held.includes(pitch)) items.push({pitch, role, kind: "add", name});
    }
    const removeClasses = (rule.remove || []).map(semi => pc(chord.root + semi));
    held.forEach(p => { if (removeClasses.includes(pc(p)) && p !== bass) items.push({pitch: p, kind: "remove", role: "−"}); });
    return {name: rule.name, why: rule.why, items};
  }

  return {LANDSCAPES, TONES, byId, category, spell, parseRoman, roleStep, spellSet, chordName, colorVoicing, scaleDots, progressionsFor, voiceLead, colorChord, tonesOf, NAMES, pc};
});
