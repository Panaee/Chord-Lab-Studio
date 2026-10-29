#!/bin/bash
# Chord Lab Studio 1.6 · εγκατάσταση στον φάκελο «Applications by AI» (macOS).
#
# Τι κάνει:
#  1. Βρίσκει τον φάκελο «Applications by AI» (ή «Apps by AI»).
#  2. Φτιάχνει το «Chord Lab Studio.app» 1.6:
#     α) με τον μηχανισμό Electron του Chord Lab Studio που ήδη έχεις, ή
#     β) με npm (electron-builder), αν δεν βρεθεί εγκατεστημένο, ή
#     γ) ως παράθυρο Google Chrome, αν δεν υπάρχει ούτε npm.
#  3. Δείχνει τις παλιές εκδόσεις και, αν απαντήσεις «ν», τις μετακινεί στον Κάδο.
#  4. Ανοίγει τη νέα εφαρμογή.
# Τα έργα σου (Library/Application Support/Chord Lab Studio) δεν αγγίζονται.

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/app"
ASAR="$HERE/app.asar"
ASAR_HASH="$(cat "$HERE/app.asar.sha256" 2>/dev/null | tr -d '[:space:]')"
NAME="Chord Lab Studio"
VERSION="1.6.0"
BUNDLE_ID="com.chordlab.harmonicuniverse"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/chordlab.XXXXXX")" || { echo "Δεν δημιουργήθηκε προσωρινός φάκελος."; exit 1; }
[ -d "$WORK" ] || { echo "Δεν δημιουργήθηκε προσωρινός φάκελος."; exit 1; }
trap 'rm -rf "$WORK"' EXIT

say(){ printf '%s\n' "$*"; }
fail(){ say ""; say "Η εγκατάσταση σταμάτησε: $*"; say "Τίποτα δεν διαγράφηκε."; read -r -p "Πάτα ⏎ για κλείσιμο." _; exit 1; }

say "Chord Lab Studio $VERSION · εγκατάσταση"
say ""
[ -f "$SRC/index.html" ] && [ -f "$SRC/package.json" ] || fail "λείπει ο φάκελος app δίπλα σε αυτό το αρχείο. Αποσυμπίεσε ολόκληρο το zip."

# 1. Ο φάκελος προορισμού -------------------------------------------------
find_target(){
  local d
  for d in "$HOME/Applications/Applications by AI" "/Applications/Applications by AI" "$HOME/Applications by AI" \
           "$HOME/Applications/Apps by AI" "/Applications/Apps by AI" "$HOME/Apps by AI" \
           "$HOME/Desktop/Applications by AI" "$HOME/Documents/Applications by AI"; do
    [ -d "$d" ] && { printf '%s' "$d"; return; }
  done
  d="$(mdfind 'kMDItemContentType == "public.folder" && (kMDItemFSName ==[c] "Applications by AI" || kMDItemFSName ==[c] "Apps by AI")' 2>/dev/null | head -n 1)"
  [ -n "$d" ] && [ -d "$d" ] && { printf '%s' "$d"; return; }
  d="$(find "$HOME" /Applications -maxdepth 3 -type d \( -iname 'Applications by AI' -o -iname 'Apps by AI' \) 2>/dev/null | head -n 1)"
  printf '%s' "$d"
}
TARGET="$(find_target)"
if [ -z "$TARGET" ]; then
  TARGET="$HOME/Applications/Applications by AI"
  mkdir -p "$TARGET" || fail "δεν δημιουργήθηκε ο φάκελος $TARGET"
  say "Δεν βρέθηκε φάκελος «Applications by AI». Δημιουργήθηκε: $TARGET"
else
  say "Φάκελος: $TARGET"
fi

# 2. Υπάρχουσες εκδόσεις ---------------------------------------------------
bundle_id(){ /usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$1/Contents/Info.plist" 2>/dev/null; }
bundle_version(){ /usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$1/Contents/Info.plist" 2>/dev/null; }
is_electron(){ [ -d "$1/Contents/Frameworks/Electron Framework.framework" ]; }

STUDIO_APPS=()
while IFS= read -r app; do [ -n "$app" ] && STUDIO_APPS+=("$app"); done < <(
  { mdfind "kMDItemCFBundleIdentifier == '$BUNDLE_ID'" 2>/dev/null
    for d in "$TARGET" /Applications "$HOME/Applications" "$HOME/Downloads" "$HOME/Desktop"; do
      find "$d" -maxdepth 2 -type d -name "$NAME.app" 2>/dev/null; done; } | grep -v -e "^$WORK" -e '^/Volumes/' -e '/\.Trash/' | sort -u)

RUNTIME=""
for app in ${STUDIO_APPS[@]+"${STUDIO_APPS[@]}"}; do
  if is_electron "$app"; then RUNTIME="$app"; break; fi
done

# Κλείσε την εφαρμογή αν τρέχει.
osascript -e "if application \"$NAME\" is running then tell application \"$NAME\" to quit" >/dev/null 2>&1 || true
sleep 1

# 3. Κατασκευή --------------------------------------------------------------
NEW="$WORK/$NAME.app"
copy_source(){ # $1 = Resources/app
  mkdir -p "$1" || return 1
  ( cd "$SRC" && cp -R index.html package.json src legacy assets desktop "$1/" ) || return 1
}

if [ -n "$RUNTIME" ]; then
  say "Μηχανισμός Electron από: $RUNTIME ($(bundle_version "$RUNTIME"))"
  ditto "$RUNTIME" "$NEW" || fail "δεν αντιγράφηκε η υπάρχουσα εφαρμογή"
  RES="$NEW/Contents/Resources"
  rm -rf "$RES/app.asar" "$RES/app.asar.unpacked" "$RES/app"
  if [ -f "$ASAR" ] && [ -n "$ASAR_HASH" ]; then
    cp "$ASAR" "$RES/app.asar" || fail "δεν αντιγράφηκε το app.asar"
    # Αν το Electron ελέγχει την ακεραιότητα του asar, το hash της κεφαλίδας πρέπει να ταιριάζει.
    if /usr/libexec/PlistBuddy -c "Print :ElectronAsarIntegrity" "$NEW/Contents/Info.plist" >/dev/null 2>&1; then
      /usr/libexec/PlistBuddy -c "Set :ElectronAsarIntegrity:Resources/app.asar:hash $ASAR_HASH" "$NEW/Contents/Info.plist" >/dev/null 2>&1 || fail "δεν ενημερώθηκε το hash ακεραιότητας"
    fi
  else
    copy_source "$RES/app" || fail "δεν αντιγράφηκαν τα αρχεία της 1.6"
  fi
  /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" -c "Set :CFBundleVersion $VERSION" "$NEW/Contents/Info.plist" >/dev/null 2>&1 || true
  METHOD="Electron (ο μηχανισμός της προηγούμενης εγκατάστασης)"
elif command -v npm >/dev/null 2>&1; then
  say "Δεν βρέθηκε εγκατεστημένο Chord Lab Studio. Κατασκευή με npm (χρειάζεται δίκτυο, λίγα λεπτά)…"
  BUILD="$WORK/build"; mkdir -p "$BUILD"
  ( cd "$SRC" && cp -R . "$BUILD/" ) || fail "δεν αντιγράφηκαν τα αρχεία"
  ARCH="$(uname -m)"; [ "$ARCH" = "x86_64" ] && ARCH="x64"
  ( cd "$BUILD" && npm ci --no-audit --no-fund && npx --no-install electron-builder --mac dir "--$ARCH" ) || fail "η κατασκευή με npm απέτυχε (δες τα μηνύματα παραπάνω)"
  BUILT="$(find "$BUILD/dist" -maxdepth 2 -type d -name "$NAME.app" | head -n 1)"
  [ -n "$BUILT" ] || fail "δεν βρέθηκε η εφαρμογή στο dist"
  ditto "$BUILT" "$NEW" || fail "δεν αντιγράφηκε η εφαρμογή"
  METHOD="Electron (κατασκευή με npm)"
elif [ -d "/Applications/Google Chrome.app" ] || [ -d "$HOME/Applications/Google Chrome.app" ]; then
  say "Δεν βρέθηκε ούτε Chord Lab Studio ούτε npm. Η 1.6 θα ανοίγει σε παράθυρο Google Chrome."
  mkdir -p "$NEW/Contents/MacOS" "$NEW/Contents/Resources"
  copy_source "$NEW/Contents/Resources/app" || fail "δεν αντιγράφηκαν τα αρχεία"
  cp "$SRC/assets/icon.icns" "$NEW/Contents/Resources/icon.icns"
  cat > "$NEW/Contents/MacOS/chord-lab" <<'LAUNCH'
#!/bin/bash
DIR="$(cd "$(dirname "$0")/../Resources/app" && pwd)"
open -na "Google Chrome" --args --app="file://$DIR/index.html" --user-data-dir="$HOME/Library/Application Support/Chord Lab Studio Web" --no-first-run --window-size=1440,900
LAUNCH
  chmod +x "$NEW/Contents/MacOS/chord-lab"
  cat > "$NEW/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleName</key><string>$NAME</string><key>CFBundleDisplayName</key><string>$NAME</string>
<key>CFBundleIdentifier</key><string>com.chordlab.studio.web</string><key>CFBundleExecutable</key><string>chord-lab</string>
<key>CFBundleIconFile</key><string>icon.icns</string><key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>$VERSION</string><key>CFBundleVersion</key><string>$VERSION</string>
<key>LSMinimumSystemVersion</key><string>11.0</string>
</dict></plist>
PLIST
  METHOD="παράθυρο Google Chrome"
else
  fail "χρειάζεται είτε το Chord Lab Studio 1.5, είτε Node.js (npm), είτε Google Chrome."
fi

xattr -cr "$NEW" 2>/dev/null || true
codesign --force --deep --sign - "$NEW" >/dev/null 2>&1 || fail "η τοπική υπογραφή (codesign) απέτυχε"
codesign --verify --deep "$NEW" >/dev/null 2>&1 || fail "η τοπική υπογραφή δεν επαληθεύτηκε"
[ -f "$NEW/Contents/Resources/app.asar" ] || [ -f "$NEW/Contents/Resources/app/index.html" ] || fail "η νέα εφαρμογή δεν περιέχει τα αρχεία της 1.6"

# 4. Παλιές εκδόσεις --------------------------------------------------------
OLD=()
add_old(){ local p="$1"; [ -e "$p" ] || return; for x in ${OLD[@]+"${OLD[@]}"}; do [ "$x" = "$p" ] && return; done; OLD+=("$p"); }
for app in ${STUDIO_APPS[@]+"${STUDIO_APPS[@]}"}; do add_old "$app"; done
for d in "$TARGET" /Applications "$HOME/Applications"; do
  for app in "$d/Chord Lab.app" "$d/Chord Lab Studio 1.5.app"; do [ -d "$app" ] && add_old "$app"; done
done
while IFS= read -r p; do [ -n "$p" ] && add_old "$p"; done < <(
  find "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents" -maxdepth 3 \
    \( -iname 'start_chordlab_mac.command' -o -iname 'Chord-Lab-Studio-1.[0-5]*' -o -iname 'Chord-Lab-Setup*.exe' -o -iname 'Chord-Lab 2' -o -iname 'Chord-Lab_2.zip' -o -iname 'Chord-Lab 2.zip' \) \
    -not -path "$HERE*" 2>/dev/null)

say ""
if [ ${#OLD[@]} -gt 0 ]; then
  say "Παλιές εκδόσεις που βρέθηκαν:"
  for p in "${OLD[@]}"; do v=""; [ -d "$p/Contents" ] && v=" ($(bundle_version "$p"))"; say "  • $p$v"; done
  say ""
  read -r -p "Να μετακινηθούν στον Κάδο; [ν/Ο] " answer
else
  answer="ο"
fi
trash(){ local p="$1" base dest; base="$(basename "$p")"; dest="$HOME/.Trash/$base"
  [ -e "$dest" ] && dest="$HOME/.Trash/${base%.*} $(date +%H%M%S)${base##"${base%.*}"}"
  mv "$p" "$dest"; }

case "$answer" in ν|Ν|n|N|y|Y|ναι|Ναι|yes)
  for p in "${OLD[@]}"; do trash "$p" && say "Στον Κάδο: $p" || say "Δεν μετακινήθηκε: $p"; done;;
*)
  # Η εφαρμογή στον φάκελο προορισμού αντικαθίσταται πάντα· η παλιά πάει στον Κάδο.
  [ -e "$TARGET/$NAME.app" ] && trash "$TARGET/$NAME.app" && say "Η προηγούμενη $NAME στον φάκελο πήγε στον Κάδο."
  say "Οι υπόλοιπες παλιές εκδόσεις έμειναν στη θέση τους.";;
esac

# 5. Εγκατάσταση -------------------------------------------------------------
[ -e "$TARGET/$NAME.app" ] && trash "$TARGET/$NAME.app"
ditto "$NEW" "$TARGET/$NAME.app" || fail "δεν αντιγράφηκε στο $TARGET"
xattr -cr "$TARGET/$NAME.app" 2>/dev/null || true
say ""
say "Έτοιμο: $TARGET/$NAME.app ($VERSION · $METHOD)"
say "Τα έργα σου μένουν εκεί που ήταν· η 1.6 ανοίγει αυτόματα το τελευταίο έργο της 1.5."
open "$TARGET/$NAME.app"
sleep 1
