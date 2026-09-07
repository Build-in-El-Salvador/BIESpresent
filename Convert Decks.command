#!/bin/bash
#
# BIES Event Screen — deck converter
#
# Double-click this file. Anything sitting in decks/inbox gets turned into a
# PDF plus a numbered slide-image sequence in decks/ready, which is what the
# event screen can actually put on the projector.
#
# Flags (only needed when something looks wrong):
#   --keynote      force Keynote as the conversion engine
#   --libreoffice  force LibreOffice
#   --jpeg         write JPEG slides instead of PNG (much smaller, big decks)
#   --width N      slide image width in pixels (default 1920)
#
cd "$(dirname "$0")" || exit 1
HERE="$(pwd)"
IN="$HERE/decks/inbox"
OUT="$HERE/decks/ready"
mkdir -p "$IN" "$OUT"

FORCE=""; FMT="png"; WIDTH=1920
while [ $# -gt 0 ]; do
  case "$1" in
    --keynote)     FORCE="keynote" ;;
    --libreoffice) FORCE="lo" ;;
    --jpeg)        FMT="jpeg" ;;
    --width)       shift; WIDTH="$1" ;;
  esac
  shift
done

# ---------------------------------------------------------------- engines ---
SOFFICE=""
for c in /Applications/LibreOffice.app/Contents/MacOS/soffice "$(command -v soffice 2>/dev/null)"; do
  [ -x "$c" ] && SOFFICE="$c" && break
done
KEYNOTE=""
[ -d /Applications/Keynote.app ] && KEYNOTE=1

PDFTOPPM=""
for c in /opt/homebrew/bin/pdftoppm /usr/local/bin/pdftoppm "$(command -v pdftoppm 2>/dev/null)"; do
  [ -x "$c" ] && PDFTOPPM="$c" && break
done
PDFINFO=""
for c in /opt/homebrew/bin/pdfinfo /usr/local/bin/pdfinfo "$(command -v pdfinfo 2>/dev/null)"; do
  [ -x "$c" ] && PDFINFO="$c" && break
done

B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; N=$'\033[0m'

echo ""
echo "${B}BIES — deck converter${N}"
echo "  Keynote      $([ -n "$KEYNOTE" ] && echo "${G}yes${N}" || echo "${Y}not installed${N}")"
echo "  LibreOffice  $([ -n "$SOFFICE" ] && echo "${G}yes${N}" || echo "${Y}not installed${N}")"
echo "  slide images $([ -n "$PDFTOPPM" ] && echo "${G}pdftoppm, ${WIDTH}px${N}" || echo "${Y}Keynote export (1024px)${N}")"
echo ""

if [ -z "$KEYNOTE" ] && [ -z "$SOFFICE" ]; then
  echo "${R}Nothing to convert with.${N}"
  echo "Install Keynote (free, App Store) or LibreOffice (libreoffice.org), then run this again."
  echo ""; read -r -p "Press return to close. "; exit 1
fi

# Keynote: its own format, and Apple's own PowerPoint importer, so it is the
# higher-fidelity path. It drives the real app rather than a headless engine,
# so two things need care: AppleScript will not cold-start Keynote here (it
# answers "application isn't running"), and a deck with missing fonts can put
# a dialog up. So the file is opened through `open -a`, the document is then
# waited for by name, and everything is wrapped in a timeout that gives up
# rather than leaving someone staring at a stalled window before doors.
keynote_export() {   # src, destination, mode: pdf | images
  local src="$1" dst="$2" mode="$3"
  local want; want="$(basename "$src")"; want="${want%.*}"
  open -a Keynote "$src" >/dev/null 2>&1 || return 1
  osascript - "$want" "$dst" "$mode" <<'APPLE' >/dev/null 2>&1
on run argv
  set want to item 1 of argv
  set dst to item 2 of argv
  set mode to item 3 of argv
  tell application "Keynote"
    set d to missing value
    repeat 120 times
      try
        repeat with c in documents
          if name of c starts with want then set d to c
        end repeat
      end try
      if d is not missing value then exit repeat
      delay 0.5
    end repeat
    if d is missing value then error "document never appeared"
    with timeout of 180 seconds
      if mode is "pdf" then
        export d to POSIX file dst as PDF with properties ¬
          {export style:IndividualSlides, PDF image quality:Best}
      else
        export d to POSIX file dst as slide images with properties ¬
          {image format:PNG, skipped slides:false, all stages:false}
      end if
      close d saving no
    end timeout
  end tell
end run
APPLE
}

keynote_pdf()    { keynote_export "$1" "$2" pdf; }
keynote_images() { keynote_export "$1" "$2" images; }

lo_pdf() {  # src, outdir
  "$SOFFICE" --headless --norestore --invisible \
     --convert-to pdf --outdir "$2" "$1" >/dev/null 2>&1
}

pages_of() {
  [ -n "$PDFINFO" ] && "$PDFINFO" "$1" 2>/dev/null | awk '/^Pages/{print $2}'
}

# ------------------------------------------------------------------ sweep ---
shopt -s nullglob nocaseglob
FILES=("$IN"/*.pptx "$IN"/*.ppt "$IN"/*.key "$IN"/*.odp "$IN"/*.pdf)
STUBS=("$IN"/*.gslides "$IN"/*.webloc "$IN"/*.url)
shopt -u nocaseglob

for s in "${STUBS[@]}"; do
  echo "${Y}skipped${N}  $(basename "$s")"
  echo "          A Google Slides link, not a file. Open it, then"
  echo "          File > Download > PDF Document, and drop the PDF in here."
  echo ""
done

if [ ${#FILES[@]} -eq 0 ]; then
  echo "${Y}Nothing in decks/inbox.${N}"
  echo "Put .pptx, .ppt, .key, .odp or .pdf files in there and run this again."
  echo ""
  open "$IN"
  read -r -p "Press return to close. "; exit 0
fi

OK=0; BAD=0
for src in "${FILES[@]}"; do
  base="$(basename "$src")"
  name="${base%.*}"
  ext="$(echo "${base##*.}" | tr '[:upper:]' '[:lower:]')"
  dir="$OUT/$name"
  rm -rf "$dir"; mkdir -p "$dir/slides"
  pdf="$dir/deck.pdf"

  MEDIA_NOTE=""
  printf "%s%-42s%s " "$B" "$base" "$N"

  if [ "$ext" = "pdf" ]; then
    cp "$src" "$pdf"; engine="already a PDF"
  else
    # .key is Keynote's own format and LibreOffice reads it only through a
    # reverse-engineered importer, so Keynote goes first there. Everything else
    # starts with LibreOffice, which is fully headless and cannot pop a dialog.
    if [ "$FORCE" = "keynote" ]; then order="k l"
    elif [ "$FORCE" = "lo" ];   then order="l k"
    elif [ "$ext" = "key" ];    then order="k l"
    else                             order="l k"; fi

    engine=""
    for e in $order; do
      if [ "$e" = "k" ] && [ -n "$KEYNOTE" ]; then
        keynote_pdf "$src" "$pdf"
        [ -s "$pdf" ] && engine="Keynote" && break
      fi
      if [ "$e" = "l" ] && [ -n "$SOFFICE" ]; then
        lo_pdf "$src" "$dir"
        [ -f "$dir/$name.pdf" ] && mv "$dir/$name.pdf" "$pdf"
        [ -s "$pdf" ] && engine="LibreOffice" && break
      fi
    done
  fi

  if [ ! -s "$pdf" ]; then
    echo "${R}could not convert${N}"
    rm -rf "$dir"; BAD=$((BAD+1)); continue
  fi

  # Slide images: the format the board prefers, because a PNG fills the screen
  # with no viewer chrome around it and switches instantly.
  if [ -n "$PDFTOPPM" ]; then
    if [ "$FMT" = "jpeg" ]; then
      "$PDFTOPPM" -jpeg -jpegopt quality=92 -scale-to-x "$WIDTH" -scale-to-y -1 \
        "$pdf" "$dir/slides/s" >/dev/null 2>&1
    else
      "$PDFTOPPM" -png -scale-to-x "$WIDTH" -scale-to-y -1 \
        "$pdf" "$dir/slides/s" >/dev/null 2>&1
    fi
  elif [ -n "$KEYNOTE" ] && [ "$ext" != "pdf" ]; then
    keynote_images "$src" "$dir/slides"
  fi

  # pdftoppm pads page numbers to the width of the highest page, so a 9-slide
  # deck and a 10-slide deck sort differently. Renumber to a fixed three
  # digits so the board can just sort the filenames.
  i=0
  for f in "$dir"/slides/*.png "$dir"/slides/*.jpg "$dir"/slides/*.jpeg; do
    [ -e "$f" ] || continue
    i=$((i+1))
    printf -v num "%03d" "$i"
    mv "$f" "$dir/slides/slide-$num.${f##*.}"
  done

  # A deck's embedded audio and video does not survive the trip: PDF export
  # flattens every page to static artwork and drops the media entirely. But
  # both .pptx and .key are zip archives, so the original files are still in
  # there and can be lifted out whole — the tech queues them in the Media tab
  # and fires them by hand on the speaker's cue.
  if [ "$ext" = "pptx" ] || [ "$ext" = "ppt" ] || [ "$ext" = "key" ] || [ "$ext" = "odp" ]; then
    tmpz="$dir/.unzip"
    if unzip -qq -o "$src" -d "$tmpz" 2>/dev/null; then
      found=0
      while IFS= read -r m; do
        [ -z "$m" ] && continue
        mkdir -p "$dir/embedded media"
        cp "$m" "$dir/embedded media/$(basename "$m")" 2>/dev/null && found=$((found+1))
      done <<< "$(find "$tmpz" -type f \( \
          -iname '*.mp4'  -o -iname '*.m4v' -o -iname '*.mov' -o -iname '*.avi' -o \
          -iname '*.wmv'  -o -iname '*.mkv' -o -iname '*.webm' -o \
          -iname '*.mp3'  -o -iname '*.m4a' -o -iname '*.wav' -o -iname '*.aac' -o \
          -iname '*.aiff' -o -iname '*.wma' \) 2>/dev/null)"
      [ "$found" -gt 0 ] && MEDIA_NOTE=" ${Y}+$found embedded media${N}"
    fi
    rm -rf "$tmpz"
  fi

  n="$(pages_of "$pdf")"
  [ -z "$n" ] && n="$i"
  echo "${G}ok${N}  ${n:-?} slides  ($engine$([ "$i" -gt 0 ] && echo ", $i images"))$MEDIA_NOTE"
  OK=$((OK+1))
done

echo ""
echo "${B}$OK converted${N}$([ $BAD -gt 0 ] && echo ", ${R}$BAD failed${N}")  ->  decks/ready"
echo ""
echo "${Y}Before the night: open each deck.pdf and look at it.${N}"
echo "Converters substitute missing fonts, so check nothing has moved or overflowed."
echo ""
open "$OUT"
read -r -p "Press return to close. "
