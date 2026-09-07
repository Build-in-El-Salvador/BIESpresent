#!/usr/bin/env python3
"""
Build the single self-contained BIESpresent HTML file.

Reads src/screen.html and replaces the {{...}} placeholders with base64-encoded
fonts and inlined logo SVGs.

There are two builds, and they differ only in the display typeface:

  open   fonts/BarlowCondensed-Bold.ttf   -> BIESpresent.html
  brand  the brandkit's PP Formula Narrow -> BIESpresent (BIES brand).html

PP Formula is a commercial typeface from Pangram Pangram. It is not ours to
publish, so the brand build is gitignored and the open build is the one that
lives in the repository. Everything else about the two files is identical:
same logic, same logos, same Inter body text.

Usage:  python3 build.py            both, if the brandkit is on this machine
        python3 build.py --open     only the publishable one
        python3 build.py --brand    only the BIES one
No dependencies. python3 ships with macOS.
"""

import base64
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
BRANDKIT = pathlib.Path("/Users/mike/Desktop/BIES/brandkit")

SRC   = HERE / "src" / "screen.html"
FONTS = HERE / "fonts"

# Inter is OFL, so the repository carries its own copy and both builds use it.
# Only the display face differs.
BODY = [
    (FONTS / "Inter-Regular.otf",  "Inter", 400),
    (FONTS / "Inter-SemiBold.otf", "Inter", 600),
]

BUILDS = {
    "open":  (FONTS / "BarlowCondensed-Bold.ttf",
              HERE / "BIESpresent.html",
              "Barlow Condensed Bold (SIL Open Font License)"),
    "brand": (BRANDKIT / "02 Fonts/PP Formula Narrow Bold/PPFormula-NarrowBold.otf",
              HERE / "BIESpresent (BIES brand).html",
              "PP Formula Narrow Bold (Pangram Pangram, licensed \u2014 do not publish)"),
}

LOGOS = {
    "LOGO_HORIZONTAL": BRANDKIT / "01 Logos/SVG/Bies horizontal dark background.svg",
    "LOGO_ICON":       BRANDKIT / "01 Logos/SVG/Bies Icon dark background.svg",
}

# The brandkit SVGs all use the same generic class names (.cls-1, .cls-2) in a
# <style> block. Inlining two of them into one document makes those collide
# globally, so the fills get rewritten to attributes:
#   .cls-1 (#f9f5f4, the wordmark) -> currentColor, so CSS can recolor it
#   .cls-2 (#ff5b00, the ring)     -> the literal Blaze Orange
CLASS_FILL = {
    "cls-1": "currentColor",
    "cls-2": "#FF5B00",
}


def inline_svg(path: pathlib.Path) -> str:
    svg = path.read_text(encoding="utf-8")

    svg = re.sub(r"<\?xml.*?\?>", "", svg, flags=re.S)      # XML declaration
    svg = re.sub(r"<defs>.*?</defs>", "", svg, flags=re.S)  # the colliding <style>
    svg = re.sub(r'\s(?:id|data-name)="[^"]*"', "", svg)    # Illustrator layer ids

    def swap(m):
        name = m.group(1)
        if name not in CLASS_FILL:
            raise SystemExit(f"! {path.name}: unmapped class '{name}' — update CLASS_FILL")
        return f'fill="{CLASS_FILL[name]}"'

    svg = re.sub(r'class="(cls-\d+)"', swap, svg)

    if 'class="cls-' in svg:
        raise SystemExit(f"! {path.name}: class attributes survived the rewrite")

    return re.sub(r"\s*\n\s*", "", svg).strip()


MIME = {".otf": ("font/otf", "opentype"), ".ttf": ("font/ttf", "truetype"),
        ".woff2": ("font/woff2", "woff2")}


def data_uri(path: pathlib.Path) -> str:
    mime, _ = MIME[path.suffix.lower()]
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def font_face(path: pathlib.Path, family: str, weight: int) -> str:
    """One @font-face rule with the file inlined.

    font-display:block matters here: the board is read from the back of a room,
    and a fallback face flashing up first would reflow the countdown."""
    _, fmt = MIME[path.suffix.lower()]
    return ("@font-face{\n"
            f"  font-family:'{family}';\n"
            f"  src:url('{data_uri(path)}') format('{fmt}');\n"
            f"  font-weight:{weight}; font-style:normal; font-display:block;\n"
            "}")


def build(which: str, html: str) -> pathlib.Path:
    display, out, note = BUILDS[which]
    if not display.exists():
        sys.exit(f"! {which} build needs a font that is not here:\n  {display}")

    faces = [font_face(display, "BIES Display", 700)]
    faces += [font_face(p, fam, w) for p, fam, w in BODY]
    page = html.replace("{{FONT_FACES}}", "\n".join(faces))

    leftover = re.findall(r"\{\{[A-Z_]+\}\}", page)
    if leftover:
        sys.exit(f"! unreplaced placeholders: {sorted(set(leftover))}")

    out.write_text(page, encoding="utf-8")
    print(f"  {which:<6} {out.name}")
    print(f"         display: {note}")
    print(f"         {out.stat().st_size / 1024:.0f} KB")
    return out


def main() -> int:
    if not SRC.exists():
        sys.exit(f"! missing source: {SRC}")

    args = sys.argv[1:]
    bad = [a for a in args if a not in ("--open", "--brand")]
    if bad:
        sys.exit(f"! unknown option {bad[0]} — expected --open or --brand")

    which = [a[2:] for a in args]
    if not which:
        # Nothing asked for: make what this machine can. Away from the brandkit
        # that is the publishable build alone, which is the point of having one.
        which = ["open"] + (["brand"] if BUILDS["brand"][0].exists() else [])
        if len(which) == 1:
            print("  (no brandkit on this machine — building the open version only)")

    html = SRC.read_text(encoding="utf-8")

    for missing in [p for p, _, _ in BODY if not p.exists()]:
        sys.exit(f"! missing body font: {missing}")
    if "{{FONT_FACES}}" not in html:
        sys.exit("! placeholder {{FONT_FACES}} not found in source")

    for key, path in LOGOS.items():
        token = "{{" + key + "}}"
        if token not in html:
            sys.exit(f"! placeholder {token} not found in source")
        html = html.replace(token, inline_svg(path))
        print(f"  logo   {key:<18} {path.name}")
    print()

    for w in which:
        build(w, html)
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
