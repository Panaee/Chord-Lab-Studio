#!/bin/bash
# Chord Lab Studio 1.7 · εγκατάσταση σε macOS.
#
# Τι κάνει:
#  1. Διαλέγει φάκελο: αυτόν που δίνεις ως όρισμα, αλλιώς τον φάκελο όπου είναι ήδη
#     εγκατεστημένο το Chord Lab Studio, αλλιώς το /Applications (ή ~/Applications).
#  2. Φτιάχνει το «Chord Lab Studio.app» 1.7:
#     α) με τον μηχανισμό Electron του Chord Lab Studio που ήδη έχεις, ή
#     β) με το επίσημο Electron, που κατεβαίνει από το GitHub με έλεγχο SHA256, ή
#     γ) με npm (electron-builder), ή
#     δ) ως παράθυρο Google Chrome, αν δεν γίνεται τίποτα από τα παραπάνω.
#  3. Δείχνει τις παλιές εκδόσεις και, αν απαντήσεις «ν», τις μετακινεί στον Κάδο.
#  4. Ανοίγει τη νέα εφαρμογή.
# Τα έργα σου (Library/Application Support/Chord Lab Studio) δεν αγγίζονται.
#
# Χρήση: bash "Εγκατάσταση Chord Lab Studio.command" [φάκελος]

set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/app"
ASAR="$HERE/app.asar"
ASAR_HASH="$(cat "$HERE/app.asar.sha256" 2>/dev/null | tr -d '[:space:]')"
NAME="Chord Lab Studio"
VERSION="1.7.0"
BUNDLE_ID="com.chordlab.harmonicuniverse"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/chordlab.XXXXXX")" || { echo "Δεν δημιουργήθηκε προσωρινός φάκελος."; exit 1; }
[ -d "$WORK" ] || { echo "Δεν δημιουργήθηκε προσωρινός φάκελος."; exit 1; }
trap 'rm -rf "$WORK"' EXIT

say(){ printf '%s\n' "$*"; }
# Messages in Greek on a Greek Mac, otherwise in English.
UILANG=en
case "$(defaults read -g AppleLanguages 2>/dev/null | tr -d ' "\n' | cut -d, -f1 | tr -d '(')" in el*) UILANG=el;; esac
t(){ if [ "$UILANG" = el ]; then printf '%s' "$1"; else printf '%s' "$2"; fi; }
fail(){ say ""; say "$(t 'Η εγκατάσταση σταμάτησε' 'Installation stopped'): $*"; say "$(t 'Τίποτα δεν διαγράφηκε.' 'Nothing was deleted.')"; read -r -p "$(t 'Πάτα ⏎ για κλείσιμο.' 'Press Return to close.')" _; exit 1; }

say "Chord Lab Studio $VERSION · $(t 'εγκατάσταση' 'installation')"
say ""
[ -f "$SRC/index.html" ] && [ -f "$SRC/package.json" ] || fail "$(t 'λείπει ο φάκελος app δίπλα σε αυτό το αρχείο. Αποσυμπίεσε ολόκληρο το zip.' 'the app folder next to this file is missing. Unzip the whole archive.')"

# 1. Ο φάκελος προορισμού -------------------------------------------------
# Όρισμα, αλλιώς εκεί όπου είναι ήδη εγκατεστημένο, αλλιώς Applications.
installed_dir(){
  local app
  while IFS= read -r app; do
    case "$app" in /Volumes/*|*/.Trash/*|"$HOME/Downloads"/*|"$HOME/Desktop"/*|"$WORK"/*) continue;; esac
    [ -d "$app" ] && { dirname "$app"; return; }
  done < <({ mdfind "kMDItemCFBundleIdentifier == 'com.chordlab.harmonicuniverse'" 2>/dev/null
             find /Applications "$HOME/Applications" -maxdepth 3 -type d -name "Chord Lab Studio.app" 2>/dev/null; })
}
if [ -n "${1:-}" ]; then
  TARGET="$1"; mkdir -p "$TARGET" || fail "$(t 'δεν δημιουργήθηκε ο φάκελος' 'could not create the folder') $TARGET"
else
  TARGET="$(installed_dir)"
  if [ -z "$TARGET" ]; then
    if [ -w /Applications ]; then TARGET="/Applications"; else TARGET="$HOME/Applications"; mkdir -p "$TARGET" || fail "$(t 'δεν δημιουργήθηκε ο φάκελος' 'could not create the folder') $TARGET"; fi
  fi
fi
say "$(t 'Φάκελος' 'Folder'): $TARGET"

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

# Επίσημο Electron από το GitHub, με έλεγχο SHA256 από το SHASUMS256.txt της έκδοσης.
ELECTRON="39.8.10"
download_electron(){ fetch_electron || { rm -rf "${NEW:?}"; return 1; }; }
fetch_electron(){
  local arch zip url sums want got
  arch="$(uname -m)"; [ "$arch" = "x86_64" ] && arch="x64"
  zip="electron-v$ELECTRON-darwin-$arch.zip"
  url="https://github.com/electron/electron/releases/download/v$ELECTRON"
  say "$(t 'Κατέβασμα του Electron' 'Downloading Electron') $ELECTRON ($arch, $(t 'περίπου 110 MB' 'about 110 MB'))…"
  curl -fL --retry 3 -o "$WORK/$zip" "$url/$zip" || { say "$(t 'Το κατέβασμα απέτυχε.' 'The download failed.')"; return 1; }
  sums="$(curl -fsSL --retry 3 "$url/SHASUMS256.txt")" || { say "$(t 'Δεν βρέθηκε το SHASUMS256.txt.' 'SHASUMS256.txt was not found.')"; return 1; }
  want="$(printf '%s\n' "$sums" | awk -v f="*$zip" -v g="$zip" '$2==f||$2==g{print $1}')"
  got="$(shasum -a 256 "$WORK/$zip" | awk '{print $1}')"
  [ -n "$want" ] && [ "$want" = "$got" ] || { say "$(t 'Το SHA256 του Electron δεν ταιριάζει. Δεν χρησιμοποιήθηκε.' 'The SHA256 of Electron does not match. It was not used.')"; return 1; }
  mkdir -p "$WORK/electron" && ditto -x -k "$WORK/$zip" "$WORK/electron" || return 1
  [ -d "$WORK/electron/Electron.app" ] || return 1
  mv "$WORK/electron/Electron.app" "$NEW" || return 1
  local res="$NEW/Contents/Resources" plist="$NEW/Contents/Info.plist"
  rm -f "$res/default_app.asar"
  cp "$ASAR" "$res/app.asar" || return 1
  cp "$SRC/assets/icon.icns" "$res/electron.icns" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier $BUNDLE_ID" -c "Set :CFBundleName \"$NAME\"" \
    -c "Set :CFBundleShortVersionString $VERSION" -c "Set :CFBundleVersion $VERSION" "$plist" >/dev/null 2>&1 || return 1
  /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName \"$NAME\"" "$plist" >/dev/null 2>&1 || \
    /usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string \"$NAME\"" "$plist" >/dev/null 2>&1 || true
  return 0
}

if [ -n "$RUNTIME" ]; then
  say "$(t 'Μηχανισμός Electron από' 'Electron runtime from'): $RUNTIME ($(bundle_version "$RUNTIME"))"
  ditto "$RUNTIME" "$NEW" || fail "$(t 'δεν αντιγράφηκε η υπάρχουσα εφαρμογή' 'could not copy the installed app')"
  RES="$NEW/Contents/Resources"
  rm -rf "$RES/app.asar" "$RES/app.asar.unpacked" "$RES/app"
  if [ -f "$ASAR" ] && [ -n "$ASAR_HASH" ]; then
    cp "$ASAR" "$RES/app.asar" || fail "$(t 'δεν αντιγράφηκε το app.asar' 'could not copy app.asar')"
    # Αν το Electron ελέγχει την ακεραιότητα του asar, το hash της κεφαλίδας πρέπει να ταιριάζει.
    if /usr/libexec/PlistBuddy -c "Print :ElectronAsarIntegrity" "$NEW/Contents/Info.plist" >/dev/null 2>&1; then
      /usr/libexec/PlistBuddy -c "Set :ElectronAsarIntegrity:Resources/app.asar:hash $ASAR_HASH" "$NEW/Contents/Info.plist" >/dev/null 2>&1 || fail "$(t 'δεν ενημερώθηκε το hash ακεραιότητας' 'could not update the integrity hash')"
    fi
  else
    copy_source "$RES/app" || fail "$(t 'δεν αντιγράφηκαν τα αρχεία της 1.7' 'could not copy the 1.7 files')"
  fi
  /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" -c "Set :CFBundleVersion $VERSION" "$NEW/Contents/Info.plist" >/dev/null 2>&1 || true
  METHOD="Electron ($(t 'ο μηχανισμός της προηγούμενης εγκατάστασης' 'the runtime of the earlier installation'))"
elif [ -f "$ASAR" ] && [ -n "$ASAR_HASH" ] && command -v curl >/dev/null 2>&1 && download_electron; then
  METHOD="Electron $ELECTRON ($(t 'κατέβηκε από το GitHub, επαληθευμένο SHA256' 'downloaded from GitHub, SHA256 verified'))"
elif command -v npm >/dev/null 2>&1; then
  say "$(t 'Κατασκευή με npm (χρειάζεται δίκτυο, λίγα λεπτά)…' 'Building with npm (needs internet, a few minutes)…')"
  BUILD="$WORK/build"; mkdir -p "$BUILD"
  ( cd "$SRC" && cp -R . "$BUILD/" ) || fail "$(t 'δεν αντιγράφηκαν τα αρχεία' 'could not copy the files')"
  ARCH="$(uname -m)"; [ "$ARCH" = "x86_64" ] && ARCH="x64"
  ( cd "$BUILD" && npm ci --no-audit --no-fund && npx --no-install electron-builder --mac dir "--$ARCH" ) || fail "$(t 'η κατασκευή με npm απέτυχε (δες τα μηνύματα παραπάνω)' 'the npm build failed (see the messages above)')"
  BUILT="$(find "$BUILD/dist" -maxdepth 2 -type d -name "$NAME.app" | head -n 1)"
  [ -n "$BUILT" ] || fail "$(t 'δεν βρέθηκε η εφαρμογή στο dist' 'the app was not found in dist')"
  ditto "$BUILT" "$NEW" || fail "$(t 'δεν αντιγράφηκε η εφαρμογή' 'could not copy the app')"
  METHOD="Electron ($(t 'κατασκευή με npm' 'built with npm'))"
elif [ -d "/Applications/Google Chrome.app" ] || [ -d "$HOME/Applications/Google Chrome.app" ]; then
  say "$(t 'Δεν βρέθηκε ούτε Chord Lab Studio ούτε npm. Η 1.7 θα ανοίγει σε παράθυρο Google Chrome.' 'Neither Chord Lab Studio nor npm was found. Version 1.7 will open in a Google Chrome window.')"
  mkdir -p "$NEW/Contents/MacOS" "$NEW/Contents/Resources"
  copy_source "$NEW/Contents/Resources/app" || fail "$(t 'δεν αντιγράφηκαν τα αρχεία' 'could not copy the files')"
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
  METHOD="$(t 'παράθυρο Google Chrome' 'Google Chrome window')"
else
  fail "$(t 'χρειάζεται σύνδεση στο διαδίκτυο (για το Electron), ή Node.js (npm), ή Google Chrome.' 'needs an internet connection (for Electron), or Node.js (npm), or Google Chrome.')"
fi

xattr -cr "$NEW" 2>/dev/null || true
codesign --force --deep --sign - "$NEW" >/dev/null 2>&1 || fail "$(t 'η τοπική υπογραφή (codesign) απέτυχε' 'local signing (codesign) failed')"
codesign --verify --deep "$NEW" >/dev/null 2>&1 || fail "$(t 'η τοπική υπογραφή δεν επαληθεύτηκε' 'the local signature did not verify')"
[ -f "$NEW/Contents/Resources/app.asar" ] || [ -f "$NEW/Contents/Resources/app/index.html" ] || fail "$(t 'η νέα εφαρμογή δεν περιέχει τα αρχεία της 1.7' 'the new app does not contain the 1.7 files')"

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
  say "$(t 'Παλιές εκδόσεις που βρέθηκαν:' 'Old versions found:')"
  for p in "${OLD[@]}"; do v=""; [ -d "$p/Contents" ] && v=" ($(bundle_version "$p"))"; say "  • $p$v"; done
  say ""
  read -r -p "$(t 'Να μετακινηθούν στον Κάδο; [ν/Ο] ' 'Move them to the Trash? [y/N] ')" answer
else
  answer="ο"
fi
trash(){ local p="$1" base dest; base="$(basename "$p")"; dest="$HOME/.Trash/$base"
  [ -e "$dest" ] && dest="$HOME/.Trash/${base%.*} $(date +%H%M%S)${base##"${base%.*}"}"
  mv "$p" "$dest"; }

# Only an explicit yes moves anything: ν/ναι or y/yes. («n» means no in English.)
case "$answer" in ν|Ν|ναι|Ναι|ΝΑΙ|y|Y|yes|Yes|YES)
  for p in "${OLD[@]}"; do trash "$p" && say "$(t 'Στον Κάδο' 'In the Trash'): $p" || say "$(t 'Δεν μετακινήθηκε' 'Not moved'): $p"; done;;
*)
  # Η εφαρμογή στον φάκελο προορισμού αντικαθίσταται πάντα· η παλιά πάει στον Κάδο.
  [ -e "$TARGET/$NAME.app" ] && trash "$TARGET/$NAME.app" && say "$(t "Η προηγούμενη $NAME στον φάκελο πήγε στον Κάδο." "The earlier $NAME in the folder went to the Trash.")"
  [ ${#OLD[@]} -gt 0 ] && say "$(t 'Οι υπόλοιπες παλιές εκδόσεις έμειναν στη θέση τους.' 'The other old versions stayed where they are.')";;
esac

# 5. Εγκατάσταση -------------------------------------------------------------
[ -e "$TARGET/$NAME.app" ] && trash "$TARGET/$NAME.app"
ditto "$NEW" "$TARGET/$NAME.app" || fail "$(t 'δεν αντιγράφηκε στο' 'could not copy to') $TARGET"
xattr -cr "$TARGET/$NAME.app" 2>/dev/null || true
say ""
say "$(t 'Έτοιμο' 'Done'): $TARGET/$NAME.app ($VERSION · $METHOD)"
say "$(t 'Τα έργα σου μένουν εκεί που ήταν· η εφαρμογή ανοίγει αυτόματα το τελευταίο σου έργο.' 'Your projects stay where they were; the app opens your last project by itself.')"
open "$TARGET/$NAME.app"
sleep 1
