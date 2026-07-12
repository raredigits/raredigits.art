#!/usr/bin/env python3
"""Fetch Google-hosted woff2 for the four Rare Styles text families, keep the
latin + cyrillic subsets, save them under assets/css/fonts/ with readable
names, and emit the @font-face CSS with relative url(fonts/...) paths."""
import re, os, sys, urllib.request

OUT_DIR = "assets/css/fonts"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120 Safari/537.36")
KEEP_SUBSETS = {"latin", "cyrillic"}
WEIGHT_NAME = {100:"Thin",200:"ExtraLight",300:"Light",400:"Regular",
               500:"Medium",600:"SemiBold",700:"Bold",800:"ExtraBold",900:"Black"}

FAMILIES = [
    ("PlayfairDisplay", "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400..900&display=swap"),
    ("FiraSans", "https://fonts.googleapis.com/css2?family=Fira+Sans:ital,wght@0,100;0,200;0,400;0,700;0,900;1,100;1,200;1,400;1,700;1,900&display=swap"),
    ("Cousine", "https://fonts.googleapis.com/css2?family=Cousine:ital,wght@0,400;0,700;1,400;1,700&display=swap"),
    ("Caveat", "https://fonts.googleapis.com/css2?family=Caveat&display=swap"),
]

def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req) as r:
        return r.read() if binary else r.read().decode("utf-8")

def parse_blocks(css):
    # split into "subset-comment + @font-face{...}" chunks
    out = []
    for m in re.finditer(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{.*?\})", css, re.S):
        subset = m.group(1)
        block = m.group(2)
        def field(name):
            mm = re.search(name + r"\s*:\s*([^;]+);", block)
            return mm.group(1).strip() if mm else None
        out.append({
            "subset": subset,
            "style": field("font-style"),
            "weight": field("font-weight"),
            "src_url": re.search(r"url\((https://[^)]+)\)", block).group(1),
            "unicode_range": field("unicode-range"),
            "family": re.search(r"font-family:\s*'([^']+)'", block).group(1),
        })
    return out

def readable_name(base, b):
    variable = " " in (b["weight"] or "")
    ital = "Italic" if b["style"] == "italic" else ""
    if variable:
        core = f"{base}{('-'+ital) if ital else ''}"
    else:
        wname = WEIGHT_NAME.get(int(b["weight"]), b["weight"])
        core = f"{base}-{wname}{ital}"
    return f"{core}-{b['subset']}.woff2"

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    css_out, manifest = [], []
    for base, url in FAMILIES:
        blocks = [b for b in parse_blocks(get(url)) if b["subset"] in KEEP_SUBSETS]
        css_out.append(f"/* ===== {blocks[0]['family']} ===== */")
        for b in blocks:
            fname = readable_name(base, b)
            data = get(b["src_url"], binary=True)
            with open(os.path.join(OUT_DIR, fname), "wb") as f:
                f.write(data)
            manifest.append((fname, len(data)))
            # single-word family names are emitted unquoted to match the repo's
            # stylelint config (font-family-name-quotes: quotes-where-recommended)
            fam_css = f"'{b['family']}'" if " " in b["family"] else b["family"]
            css_out.append(
                "@font-face {\n"
                f"  font-family: {fam_css};\n"
                f"  font-style: {b['style']};\n"
                f"  font-weight: {b['weight']};\n"
                "  font-display: swap;\n"
                f"  src: url('fonts/{fname}') format('woff2');\n"
                f"  unicode-range: {b['unicode_range']};\n"
                "}\n")   # blank line after each block (at-rule-empty-line-before)
        css_out.append("")
    with open(os.path.join(OUT_DIR, "_generated_faces.css"), "w") as f:
        f.write("\n".join(css_out))
    total = sum(s for _, s in manifest)
    print(f"Saved {len(manifest)} woff2 files, {total/1024:.0f} KB total:")
    for name, size in manifest:
        print(f"  {size/1024:6.1f} KB  {name}")

if __name__ == "__main__":
    main()
