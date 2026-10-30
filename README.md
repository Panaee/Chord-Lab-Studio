# Chord Lab Studio 1.7

[English](#english) · [Ελληνικά](#ελληνικά)

## English

An offline studio for composing with chords. The circle of fifths shows where you are, three suggestions show where you can go next, and the timeline at the bottom keeps what you wrote. The interface is in English and Greek: it follows your system language and can be changed in Settings → Language. The theory lab (the earlier app) is in Greek only.

### Install

Ready-made packages are in [Releases](../../releases).

- **Mac (Apple Silicon or Intel)**: `Chord-Lab-Studio-1.7-mac.zip`. Unzip it, open Terminal, type `bash ` (with a space), drag «Εγκατάσταση Chord Lab Studio.command» (Install Chord Lab Studio) into the window and press Return. The app goes into Applications, or into the folder where an earlier Chord Lab Studio is installed; to choose another folder, add its path after the file name. If Chord Lab Studio 1.5 is installed, its Electron runtime is reused. Otherwise the installer downloads the official Electron runtime from GitHub and checks it against its published SHA256; without internet it falls back to npm or a Google Chrome window. Old versions go to the Trash only if you answer «ν» (yes). See `Read me.txt`.
- **Windows 10/11 (64-bit)**: `Chord-Lab-Studio-1.7.0-Setup.exe`. Installs for the current user, without administrator rights, into `%LOCALAPPDATA%\Programs\Chord Lab Studio`, with shortcuts in Start and on the Desktop. The file is not signed: on the SmartScreen warning click «More info» → «Run anyway». Uninstall from Settings → Apps.
- **Browser**: open `index.html` in Chrome or Edge, with the whole folder next to it.

Projects stay on your computer: `~/Library/Application Support/Chord Lab Studio` on Mac, `%APPDATA%\Chord Lab Studio` on Windows.

### How it works

1. **Centre, mode, style** at the top. The style is a genre (classical, impressionism, modernism, minimalism, film music, modern Greek art music, Byzantine, jazz, ambient) and shapes two of the three suggestions. Each genre names its sources, e.g. impressionism: Debussy, Takemitsu. Modes: church modes, harmonic and melodic minor, jazz scales, Greek dromoi (tempered, as on the bouzouki), pentatonics, whole-tone and Messiaen; each genre shows its own first. The third is a plain move in the key, marked as such.
2. **Empty start**: «Start with a phrase» loads one of the style's paths on your centre (film music in A minor: Am–G–F–E) and plays it. ⌘Z, and the next path is offered.
3. **The circle** has three rings: major outside, relative minor in the middle, diminished inside. The seven chords of the key are lit, with their Roman numerals. In major and minor the colour shows the function: tonic (I, iii, vi), subdominant (ii, IV), dominant (V, vii°).
4. **Click a chord on the circle to hear it.** It appears as a preview (triad, 7th, add9, sus2, sus4). The form applies to that chord only, with a line on where it resolves and, for the 7th, which degrees take one in your genre. Nothing is stored until you press Return.
5. **Next**: three suggestions after the selected step. The intent (motion, suspension, shadow, tension, release, mystery) reorders them. Each card shows the chord symbol, the degree, why it works, which voice moves and whether it leaves the scale. Hovering a card lights its number on the circle, and the other way round.
   - 1 · 2 · 3 plays your last two steps, then the suggestion, at your tempo.
   - The small keyboard shows the move: notes that stay, notes that leave, notes that arrive, and an arc for each voice.
6. **The timeline**: each step is as wide as its duration. Click to select and hear, double-click to edit notes, drag to reorder, Shift-click to select a section for looping.
7. **Melody and rule** under «Next»:
   - Pick a note on the small octave, or play one note on MIDI. The circle keeps only the chords that hold it, and the suggestions keep it on top.
   - «Rule» holds the three suggestions to one rule: one voice moves, no V, the bass goes down, or no common note.
8. **Analysis**: click a row or ▶ to hear the move into that step.
9. **Ear practice** (⌘3): moves from your own piece. Which degree came, where the bass went, where the top voice went. Answer first, then see the chords. Right answers come back after 10 minutes, then 1, 3, 7 and 21 days; wrong ones come back in the same session.

Under the chord, a keyboard shows the scale and the chord on it; the played keys carry their degree from the tonic (1, ♭3, 5 …). With the guitar, the scale in five frets around the chord shape, the shape with its degrees. While you hear a suggestion or try a chord from the circle, it shows in orange which notes stay, leave and arrive. While you play on MIDI, it shows just the keys you hold, with their degrees, and names the chord.

MIDI: every key sounds while held (sustain pedal too; turn «Key sound» off for instruments with their own sound). A chord stays whole in the preview when you let go of the keys, and Return adds it with the notes you played; a single key is a melody note.

Sound (Settings → Sound and MIDI): pattern (block, arpeggio, eighth-note pulse) and sound (piano, pad, strings). Left alone, they follow the style: minimalism arpeggio, impressionism pad, film music strings. The note editor can be dragged by its header; a double click puts it back.

Keys: 1 · 2 · 3 hear a suggestion inside the phrase · ⌘1 · ⌘2 · ⌘3 Compose · Analysis · Practice · in Practice 1–4 answer, R again, Return next · Return add it · Space play/stop · ← → previous/next step · [ ] shorter/longer · L loop · E edit notes · ⌫ delete · ⌘D duplicate · ⌘Z / ⇧⌘Z undo/redo · ⌘S save.

Exports: MIDI with the exact notes and durations, a PDF analysis sized for tablets and e-readers (157×210 mm, Literata), project files as JSON. Projects from 1.4 and 1.5 open.

The style suggestions are named, auditable heuristics for composing. They do not predict any composer's choices. The function colours follow a simple textbook model; iii and vi (III and VI in minor) can also be heard otherwise.

Build: `npm ci`, `npm start`, `npm test`, `npm run test:browser`, `npm run build:mac`. The Windows installer is built without Wine; see the commands under «Ανάπτυξη» below.

Fonts: Commissioner and Literata, SIL Open Font License 1.1 (`assets/fonts/`).

## Ελληνικά

Ένας χώρος για άμεση σύνθεση: ο κύκλος των πεμπτών δείχνει πού είσαι, τρεις προτάσεις δείχνουν πού μπορείς να πας, η μπάρα κάτω κρατά ό,τι έγραψες.

## Εγκατάσταση

Τα έτοιμα πακέτα είναι στα [Releases](../../releases).

- **Mac (Apple Silicon ή Intel)**: `Chord-Lab-Studio-1.7-mac.zip`. Αποσυμπίεσε και στο Terminal γράψε `bash ` και σύρε μέσα το «Εγκατάσταση Chord Lab Studio.command». Η εφαρμογή μπαίνει στο Applications ή στον φάκελο όπου είναι ήδη εγκατεστημένη προηγούμενη έκδοση. Για άλλο φάκελο, γράψε τη διαδρομή του μετά το όνομα του αρχείου. Οδηγίες στο «Διάβασέ με.txt».
- **Windows 10/11 (64-bit)**: `Chord-Lab-Studio-1.7.0-Setup.exe`. Εγκαθίσταται για τον χρήστη, χωρίς δικαιώματα διαχειριστή, στο `%LOCALAPPDATA%\Programs\Chord Lab Studio`, με συντόμευση στο Start και στην Επιφάνεια Εργασίας. Δεν έχει υπογραφή: στο μήνυμα του SmartScreen πάτα «Περισσότερες πληροφορίες» → «Εκτέλεση οπωσδήποτε». Κατάργηση από Ρυθμίσεις → Εφαρμογές.
- **Browser**: άνοιξε το `index.html` σε Chrome ή Edge, με ολόκληρο τον φάκελο δίπλα του.

Η διεπαφή είναι στα ελληνικά και στα αγγλικά: ακολουθεί τη γλώσσα του υπολογιστή και αλλάζει από Ρυθμίσεις → Γλώσσα. Το Εργαστήριο θεωρίας είναι μόνο στα ελληνικά.

Τα έργα μένουν τοπικά: στο Mac στο `~/Library/Application Support/Chord Lab Studio`, στα Windows στο `%APPDATA%\Chord Lab Studio`.

## Η ροή

1. **Κέντρο, τρόπος, ύφος** πάνω. Το ύφος είναι είδος (κλασική, ιμπρεσιονιστικό, μοντερνισμός, μινιμαλισμός, κινηματογραφική, νεοελληνική λόγια μουσική, βυζαντινό, τζαζ, ambient) και διαμορφώνει τις δύο από τις τρεις προτάσεις. Κάθε είδος γράφει τις πηγές του, π.χ. ιμπρεσιονιστικό: Debussy, Takemitsu. Τρόποι: εκκλησιαστικοί, αρμονική και μελωδική ελάσσονα, κλίμακες της τζαζ, ελληνικοί δρόμοι (συγκερασμένοι, όπως στο μπουζούκι), πεντατονικές, ολοτονική και Messiaen· κάθε είδος δείχνει πρώτους τους δικούς του. Η τρίτη είναι μια βασική κίνηση στην τονικότητα, σημειωμένη ως τέτοια.
2. **Άδεια αρχή**: το «Ξεκίνα με μια φράση» φορτώνει μία από τις διαδρομές του ύφους πάνω στο κέντρο σου (κινηματογραφική σε Λα ελάσσονα: Am–G–F–E) και την παίζει. Με ⌘Z προτείνεται η επόμενη.
3. **Κύκλος**: τρία δαχτυλίδια, μείζονες έξω, σχετικές ελάσσονες στη μέση, ελαττωμένες μέσα. Οι επτά συγχορδίες της τονικότητας είναι φωτισμένες, με τις βαθμίδες τους. Το περίγραμμα δείχνει την τρέχουσα συγχορδία, οι αριθμοί 1–3 τις προτάσεις. Σε μείζονα και ελάσσονα το χρώμα δείχνει τη λειτουργία: τονική (I, iii, vi), υποδεσπόζουσα (ii, IV), δεσπόζουσα (V, vii°).
4. **Κλικ στον κύκλο = ακρόαση.** Η συγχορδία εμφανίζεται ως «Δοκιμή» (τριάδα, 7η, add9, sus2, sus4). Η μορφή ισχύει μόνο για αυτή τη συγχορδία, με μια γραμμή για το πού λύνεται και, για την 7η, σε ποιες βαθμίδες τη βάζει το είδος σου. Τίποτα δεν αποθηκεύεται μέχρι να πατήσεις ⏎ ή «Πρόσθεσε».
5. **Επόμενο**: τρεις προτάσεις μετά το επιλεγμένο βήμα. Η πρόθεση (Κίνηση, Αιώρηση, Σκιά, Ένταση, Λύση, Μυστήριο) αλλάζει τη σειρά τους. Κάθε κάρτα δείχνει σύμβολο, βαθμίδα, γιατί, από πού έρχεται, ποια φωνή κινείται και αν βγαίνει από την κλίμακα. Όταν περνάς πάνω από μια κάρτα, φωτίζεται ο αριθμός της στον κύκλο, και αντίστροφα.
   - 1/2/3: ακούς τα δύο τελευταία βήματα και μετά την πρόταση, στο tempo σου. ⏎ την προσθέτεις.
   - Το μικρό πληκτρολόγιο δείχνει τη μετάβαση: ποιες νότες μένουν, ποιες φεύγουν, ποιες έρχονται, και ένα τόξο για κάθε φωνή που κινείται.
6. **Η μπάρα**: κάθε βήμα έχει πλάτος ανάλογο της διάρκειάς του. Κλικ = επιλογή και ακρόαση, διπλό κλικ = νότες, σύρσιμο = σειρά, ⇧ + κλικ = τμήμα για επανάληψη.
7. **Μελωδία και κανόνας**, κάτω από το «Επόμενο»:
   - Πατάς μια νότα στη μικρή οκτάβα ή παίζεις μία νότα στο MIDI. Ο κύκλος κρατά μόνο τις συγχορδίες που την περιέχουν. Οι προτάσεις την κρατούν στην κορυφή.
   - Ο «Κανόνας» κρατά τις τρεις προτάσεις σε έναν κανόνα: μία φωνή κινείται, χωρίς V, το μπάσο κατεβαίνει ή καμία κοινή νότα.
8. **Ανάλυση**: κλικ σε μια γραμμή του πίνακα ή στο ▶ παίζει τη μετάβαση προς εκείνο το βήμα.
9. **Εξάσκηση αυτιού** (⌘3), με μεταβάσεις από τη δική σου σύνθεση:
   - Ρωτά ποια βαθμίδα ήρθε, πού πήγε το μπάσο ή πού πήγε η πάνω φωνή.
   - Πρώτα απαντάς, μετά βλέπεις τις συγχορδίες.
   - Η σωστή απάντηση ξαναέρχεται σε 10 λεπτά, μετά σε 1, 3, 7 και 21 μέρες. Η λάθος ξαναέρχεται στην ίδια εξάσκηση.

**Ήχος** (Ρυθμίσεις → Ήχος και MIDI):
- Μοτίβο: μπλοκ, αρπέζ ή παλμός σε όγδοα.
- Ηχόχρωμα: πιάνο, pad ή έγχορδα.
- Αν δεν διαλέξεις, ακολουθούν το ύφος: μινιμαλισμός αρπέζ, ιμπρεσιονιστικό pad, κινηματογραφική έγχορδα.

Ο επεξεργαστής νοτών μετακινείται από την κεφαλίδα του. Με διπλό κλικ γυρίζει στη θέση του.

Υπάρχει πάντα μία τρέχουσα συγχορδία: το επιλεγμένο βήμα. Οι προτάσεις υπολογίζονται από αυτό και μπαίνουν ακριβώς μετά από αυτό.

Τα χρώματα των λειτουργιών ακολουθούν ένα απλό σχολικό μοντέλο. Οι iii και vi (III και VI στην ελάσσονα) ακούγονται και αλλιώς, ανάλογα με τη φράση.

## Πλήκτρα

| | |
|---|---|
| 1 · 2 · 3 | άκου την πρόταση μέσα στη φράση |
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
| ⌘1 · ⌘2 · ⌘3 | Σύνθεση · Ανάλυση · Εξάσκηση |
| 1–4 · R · ⏎ | στην Εξάσκηση: απάντηση · ξανά · επόμενη |
| Esc | άκυρο / κλείσιμο |

## MIDI

Κάτω από τη συγχορδία, ένα πιάνο δείχνει την κλίμακα και τη συγχορδία από πάνω· τα πλήκτρα που πατιούνται γράφουν τη βαθμίδα τους σε σχέση με την τονική (1, ♭3, 5 …). Με την κιθάρα, την κλίμακα σε πέντε τάστα γύρω από το σχήμα της συγχορδίας, και το σχήμα με τις βαθμίδες του. Όταν ακούς μια πρόταση ή δοκιμάζεις μια συγχορδία από τον κύκλο, δείχνει με πορτοκαλί τι μένει, τι φεύγει και τι έρχεται. Όταν παίζεις στο MIDI, δείχνει μόνο τα πλήκτρα που κρατάς, με τη βαθμίδα τους, και γράφει το όνομα της συγχορδίας.

Στην εφαρμογή η είσοδος MIDI συνδέεται μόνη της. Κάθε πλήκτρο ακούγεται όσο το κρατάς, και με το πεντάλ. Αν το όργανο έχει δικό του ήχο, κλείσε το «Ήχος πλήκτρων» στις Ρυθμίσεις. Η συγχορδία που παίζεις γίνεται «Δοκιμή» και μένει ολόκληρη όταν αφήνεις τα πλήκτρα· το ⏎ τη βάζει στη σύνθεση με τις ακριβείς νότες. Ένα πλήκτρο μόνο του είναι νότα μελωδίας. Η έξοδος MIDI (Ρυθμίσεις) στέλνει την ακρόαση και την αναπαραγωγή σε DAW, π.χ. Ableton μέσω IAC Driver στο Mac.

## Εξαγωγές

- **MIDI**: ένα κομμάτι (type 0), οι αποθηκευμένες νότες και οκτάβες, η διάρκεια κάθε βήματος, το tempo και 4/4.
- **PDF ανάλυσης** σε μέγεθος για tablet και e-reader: 157×210 mm, Literata 420 στα 11,5 pt, μόνο μαύρο. Οι γραμματοσειρές είναι στατικά instances (fontTools) και ενσωματώνονται ως TrueType. Τα σύμβολα ♯ ♭ → δεν υπάρχουν στη Literata και παίρνουν σύμβολα του συστήματος.
- **Έργο JSON** (version 3, με διάρκειες). Ανοίγει και αρχεία των 1.4/1.5. Τα παλιά ονόματα χρωμάτων («Ελάσσων ανοιχτή») γίνονται σύμβολα συγχορδιών.

## Δεδομένα

Αυτόματη αποθήκευση και βιβλιοθήκη έως 64 έργων στο profile της εφαρμογής. Ανοίγει το έργο και τη βιβλιοθήκη των προηγούμενων εκδόσεων. Κράτα και αντίγραφα JSON.

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
node installer/windows/set-icon.mjs "dist/win-unpacked/Chord Lab Studio.exe" assets/icon.ico 1.7.0
python3 installer/windows/make-nsis.py dist/win-unpacked assets/icon.ico 1.7.0 dist/Chord-Lab-Studio-1.7.0-Setup.exe <makensis> <NSISDIR>
```

Το `makensis` και το `NSISDIR` είναι στο cache του electron-builder (`~/.cache/electron-builder/nsis/`). Ο uninstaller γράφεται από τον installer στα Windows και σβήνει μόνο τα αρχεία που εγκατέστησε.

Mac installer: `node installer/make-asar.cjs app.asar` φτιάχνει το `app.asar` και τυπώνει το hash ακεραιότητας της κεφαλίδας.

Electron 39.8.10, electron-builder 26.0.12. Η σελίδα (`index.html`) δουλεύει και offline σε Chrome/Edge, με ολόκληρο τον φάκελο δίπλα της.

- `src/next-engine.js`: οι τρεις προτάσεις, φωνοδήγηση, σύμβολα, βαθμίδες, κύκλος, φράσεις του ύφους, μελωδία, κανόνες.
- `src/practice-engine.js`: οι ερωτήσεις της εξάσκησης και τα κουτιά Leitner.
- `src/studio.js`, `src/studio.css`: η διεπαφή, ένα αρχείο CSS με tokens και τρία θέματα.
- `src/i18n.js`: ελληνικά και αγγλικά, με το ελληνικό κείμενο ως κλειδί. Φτιάχνεται από το `tools/make-i18n.cjs` (μεταφράσεις στα `tools/ui-en.tsv` και `tools/landscapes-en.txt`).
- `src/studio-analysis.js`, `src/remarkable-report.js`, `src/report-fonts.js`: Ανάλυση και PDF.
- `src/theory-map.js`, `fifths-engine.js`, `messiaen-engine.js`, `harmonic-context.js`, `modulation-engine.js`, `guitar-engine.js`, `project-store.js`: οι μουσικοί μηχανισμοί.
- `legacy/`: τα τοπία, η αναγνώριση συγχορδιών και το Εργαστήριο θεωρίας.
- `assets/fonts/`: Commissioner και Literata, SIL Open Font License 1.1.

Οι προτάσεις των υφών είναι ονομασμένες, ελέγξιμες ευρετικές για σύνθεση. Δεν προβλέπουν τις επιλογές κανενός συνθέτη.
