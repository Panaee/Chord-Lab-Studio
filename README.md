# Chord Lab Studio 1.6

[English](#english) · [Ελληνικά](#ελληνικά)

## English

An offline studio for composing with chords. The circle of fifths shows where you are, three suggestions show where you can go next, and the timeline at the bottom keeps what you wrote. The interface is in English and Greek: it follows your system language and can be changed in Settings → Language. The theory lab (the earlier app) is in Greek only.

### Install

Ready-made packages are in [Releases](../../releases).

- **Mac (Apple Silicon)**: `Chord-Lab-Studio-1.6-mac.zip`. Unzip it, open Terminal, type `bash ` (with a space), drag «Εγκατάσταση Chord Lab Studio.command» (Install Chord Lab Studio) into the window and press Return. The app goes into Applications, or into the folder where an earlier Chord Lab Studio is installed; to choose another folder, add its path after the file name. If Chord Lab Studio 1.5 is installed, its Electron runtime is reused. Otherwise the installer downloads the official Electron runtime from GitHub and checks it against its published SHA256; without internet it falls back to npm or a Google Chrome window. Old versions go to the Trash only if you answer «ν» (yes). See `Read me.txt`.
- **Windows 10/11 (64-bit)**: `Chord-Lab-Studio-1.6.0-Setup.exe`. Installs for the current user, without administrator rights, into `%LOCALAPPDATA%\Programs\Chord Lab Studio`, with shortcuts in Start and on the Desktop. The file is not signed: on the SmartScreen warning click «More info» → «Run anyway». Uninstall from Settings → Apps.
- **Browser**: open `index.html` in Chrome or Edge, with the whole folder next to it.

Projects stay on your computer: `~/Library/Application Support/Chord Lab Studio` on Mac, `%APPDATA%\Chord Lab Studio` on Windows.

### How it works

1. **Centre, mode, style** at the top. The style (Takemitsu, Morricone, Stravinsky, Byzantine, Hadjidakis, Glass, jazz, ambient) shapes two of the three suggestions. The third is a plain move in the key, marked as such.
2. **The circle** has three rings: major outside, relative minor in the middle, diminished inside. The seven chords of the key are lit, with their Roman numerals.
3. **Click a chord on the circle to hear it.** It appears as a preview (triad, 7th, add9, sus2, sus4). Nothing is stored until you press Return.
4. **Next**: three suggestions after the selected step. The intent (motion, suspension, shadow, tension, release, mystery) reorders them. Each card shows the chord symbol, the degree, why it works and which voice moves.
5. **The timeline**: each step is as wide as its duration. Click to select and hear, double-click to edit notes, drag to reorder, Shift-click to select a section for looping.

Keys: 1 · 2 · 3 hear a suggestion · Return add it · Space play/stop · ← → previous/next step · [ ] shorter/longer · L loop · E edit notes · ⌫ delete · ⌘D duplicate · ⌘Z / ⇧⌘Z undo/redo · ⌘S save.

Exports: MIDI with the exact notes and durations, a PDF analysis sized for tablets and e-readers (157×210 mm, Literata), project files as JSON. Projects from 1.4 and 1.5 open.

The style suggestions are named, auditable heuristics for composing. They do not predict any composer's choices.

Build: `npm ci`, `npm start`, `npm test`, `npm run test:browser`, `npm run build:mac`. The Windows installer is built without Wine; see the commands under «Ανάπτυξη» below.

Fonts: Commissioner and Literata, SIL Open Font License 1.1 (`assets/fonts/`).

## Ελληνικά

Ένας χώρος για άμεση σύνθεση: ο κύκλος των πεμπτών δείχνει πού είσαι, τρεις προτάσεις δείχνουν πού μπορείς να πας, η μπάρα κάτω κρατά ό,τι έγραψες.

## Εγκατάσταση

Τα έτοιμα πακέτα είναι στα [Releases](../../releases).

- **Mac (Apple Silicon)**: `Chord-Lab-Studio-1.6-mac.zip`. Αποσυμπίεσε και στο Terminal γράψε `bash ` και σύρε μέσα το «Εγκατάσταση Chord Lab Studio.command». Η εφαρμογή μπαίνει στο Applications ή στον φάκελο όπου είναι ήδη εγκατεστημένη προηγούμενη έκδοση. Για άλλο φάκελο, γράψε τη διαδρομή του μετά το όνομα του αρχείου. Οδηγίες στο «Διάβασέ με.txt».
- **Windows 10/11 (64-bit)**: `Chord-Lab-Studio-1.6.0-Setup.exe`. Εγκαθίσταται για τον χρήστη, χωρίς δικαιώματα διαχειριστή, στο `%LOCALAPPDATA%\Programs\Chord Lab Studio`, με συντόμευση στο Start και στην Επιφάνεια Εργασίας. Δεν έχει υπογραφή: στο μήνυμα του SmartScreen πάτα «Περισσότερες πληροφορίες» → «Εκτέλεση οπωσδήποτε». Κατάργηση από Ρυθμίσεις → Εφαρμογές.
- **Browser**: άνοιξε το `index.html` σε Chrome ή Edge, με ολόκληρο τον φάκελο δίπλα του.

Η διεπαφή είναι στα ελληνικά και στα αγγλικά: ακολουθεί τη γλώσσα του υπολογιστή και αλλάζει από Ρυθμίσεις → Γλώσσα. Το Εργαστήριο θεωρίας είναι μόνο στα ελληνικά.

Τα έργα μένουν τοπικά: στο Mac στο `~/Library/Application Support/Chord Lab Studio`, στα Windows στο `%APPDATA%\Chord Lab Studio`.

## Η ροή

1. **Κέντρο, τρόπος, ύφος** πάνω. Το ύφος (Takemitsu, Morricone, Glass, Τζαζ …) διαμορφώνει τις δύο από τις τρεις προτάσεις. Η τρίτη είναι μια βασική κίνηση στην τονικότητα, σημειωμένη ως τέτοια.
2. **Κύκλος**: τρία δαχτυλίδια, μείζονες έξω, σχετικές ελάσσονες στη μέση, ελαττωμένες μέσα. Οι επτά συγχορδίες της τονικότητας είναι φωτισμένες, με τις βαθμίδες τους. Το περίγραμμα δείχνει την τρέχουσα συγχορδία, οι αριθμοί 1–3 τις προτάσεις.
3. **Κλικ στον κύκλο = ακρόαση.** Η συγχορδία εμφανίζεται ως «Δοκιμή» (τριάδα, 7η, add9, sus2, sus4). Τίποτα δεν αποθηκεύεται μέχρι να πατήσεις ⏎ ή «Πρόσθεσε».
4. **Επόμενο**: τρεις προτάσεις μετά το επιλεγμένο βήμα. Η πρόθεση (Κίνηση, Αιώρηση, Σκιά, Ένταση, Λύση, Μυστήριο) αλλάζει τη σειρά τους. Κάθε κάρτα δείχνει σύμβολο, βαθμίδα, γιατί, από πού έρχεται και ποια φωνή κινείται. 1/2/3 ακούς τη μετάβαση, ⏎ την προσθέτεις.
5. **Η μπάρα**: κάθε βήμα έχει πλάτος ανάλογο της διάρκειάς του. Κλικ = επιλογή και ακρόαση, διπλό κλικ = νότες, σύρσιμο = σειρά, ⇧ + κλικ = τμήμα για επανάληψη.

Υπάρχει πάντα μία τρέχουσα συγχορδία: το επιλεγμένο βήμα. Οι προτάσεις υπολογίζονται από αυτό και μπαίνουν ακριβώς μετά από αυτό.

## Πλήκτρα

| | |
|---|---|
| 1 · 2 · 3 | άκου την πρόταση |
| ⏎ | πρόσθεσε ό,τι άκουσες (πρόταση, δοκιμή κύκλου ή MIDI) |
| Space | αναπαραγωγή / στοπ |
| ← → | προηγούμενο / επόμενο βήμα |
| ⇧ ← → | επιλογή τμήματος |
| ⌥ ← → | μετακίνηση βήματος |
| [ ] | πιο σύντομο / πιο μακρύ (1 · 2 · 3 · 4 · 6 · 8 χτύποι) |
| L | επανάληψη |
| E | νότες του βήματος |
| ⌫ | αφαίρεση βήματος |
| ⌘D | διπλασιασμός |
| ⌘Z · ⇧⌘Z | αναίρεση · επαναφορά |
| ⌘S | αποθήκευση στη βιβλιοθήκη |
| ⌘1 · ⌘2 | Σύνθεση · Ανάλυση |
| Esc | άκυρο / κλείσιμο |

## MIDI

Στην εφαρμογή η είσοδος MIDI συνδέεται μόνη της: ό,τι παίζεις γίνεται «Δοκιμή» και το ⏎ το βάζει στη σύνθεση με τις ακριβείς νότες. Η έξοδος MIDI (Ρυθμίσεις) στέλνει την ακρόαση και την αναπαραγωγή σε DAW, π.χ. Ableton μέσω IAC Driver στο Mac.

## Εξαγωγές

- **MIDI**: ένα κομμάτι (type 0), οι αποθηκευμένες νότες και οκτάβες, η διάρκεια κάθε βήματος, το tempo και 4/4.
- **PDF ανάλυσης** σε μέγεθος για tablet και e-reader: 157×210 mm, Literata 420 στα 11,5 pt, μόνο μαύρο. Οι γραμματοσειρές είναι στατικά instances (fontTools) και ενσωματώνονται ως TrueType. Τα σύμβολα ♯ ♭ → δεν υπάρχουν στη Literata και παίρνουν σύμβολα του συστήματος.
- **Έργο JSON** (version 3, με διάρκειες). Ανοίγει και αρχεία των 1.4/1.5. Τα παλιά ονόματα χρωμάτων («Ελάσσων ανοιχτή») γίνονται σύμβολα συγχορδιών.

## Δεδομένα

Αυτόματη αποθήκευση και βιβλιοθήκη έως 64 έργων στο profile της εφαρμογής. Στην πρώτη εκκίνηση η 1.6 ανοίγει το έργο και τη βιβλιοθήκη της 1.5. Κράτα και αντίγραφα JSON.

## Εργαστήριο θεωρίας

Ρυθμίσεις → Εργαστήριο θεωρίας (⇧⌘T): η προηγούμενη εφαρμογή με δάσκαλο, quiz και τοπία, σε δικό της επίπεδο. Ο ήχος της σταματά όταν κλείνει.

## Ανάπτυξη

```
npm ci
npm start
npm test
npm run test:browser
npm run build:mac
```

Windows installer χωρίς Wine (από Mac ή Linux):

```
npx electron-builder --win dir --x64 -c.win.signAndEditExecutable=false
npm i --no-save resedit@2.0.3
node installer/windows/set-icon.mjs "dist/win-unpacked/Chord Lab Studio.exe" assets/icon.ico 1.6.0
python3 installer/windows/make-nsis.py dist/win-unpacked assets/icon.ico 1.6.0 dist/Chord-Lab-Studio-1.6.0-Setup.exe <makensis> <NSISDIR>
```

Το `makensis` και το `NSISDIR` είναι στο cache του electron-builder (`~/.cache/electron-builder/nsis/`). Ο uninstaller γράφεται από τον installer στα Windows και σβήνει μόνο τα αρχεία που εγκατέστησε.

Mac installer: `node installer/make-asar.cjs app.asar` φτιάχνει το `app.asar` και τυπώνει το hash ακεραιότητας της κεφαλίδας.

Electron 39.8.10, electron-builder 26.0.12. Η σελίδα (`index.html`) δουλεύει και offline σε Chrome/Edge, με ολόκληρο τον φάκελο δίπλα της.

- `src/next-engine.js`: οι τρεις προτάσεις, φωνοδήγηση, σύμβολα, βαθμίδες, κύκλος.
- `src/studio.js`, `src/studio.css`: η διεπαφή, ένα αρχείο CSS με tokens και τρία θέματα.
- `src/i18n.js`: ελληνικά και αγγλικά, με το ελληνικό κείμενο ως κλειδί. Φτιάχνεται από το `tools/make-i18n.cjs` (μεταφράσεις στα `tools/ui-en.tsv` και `tools/landscapes-en.txt`).
- `src/studio-analysis.js`, `src/remarkable-report.js`, `src/report-fonts.js`: Ανάλυση και PDF.
- `src/theory-map.js`, `fifths-engine.js`, `messiaen-engine.js`, `harmonic-context.js`, `modulation-engine.js`, `guitar-engine.js`, `project-store.js`: οι μουσικοί μηχανισμοί.
- `legacy/`: τα τοπία, η αναγνώριση συγχορδιών και το Εργαστήριο θεωρίας.
- `assets/fonts/`: Commissioner και Literata, SIL Open Font License 1.1.

Οι προτάσεις των υφών είναι ονομασμένες, ελέγξιμες ευρετικές για σύνθεση. Δεν προβλέπουν τις επιλογές κανενός συνθέτη.
