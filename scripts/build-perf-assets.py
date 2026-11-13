#!/usr/bin/env python3
"""Regenerate performance assets: logo WebP, Poppins, Font Awesome subset.

Requires: pillow, fonttools[woff], brotli
  python3 -m venv .venv-assets && .venv-assets/bin/pip install pillow fonttools brotli
  .venv-assets/bin/python scripts/build-perf-assets.py
"""

from __future__ import annotations

import re
import sys
import urllib.request
from pathlib import Path

from fontTools.subset import main as subset_main
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
FONTS = PUBLIC / "fonts"
STYLES = ROOT / "src" / "styles"
FA_TMP = Path("/tmp/sem-fa")
FA_VERSION = "6.4.0"
FA_BASE = f"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/{FA_VERSION}"

SOLID_ICONS = [
    "fa-plug",
    "fa-bolt",
    "fa-bolt-lightning",
    "fa-industry",
    "fa-gears",
    "fa-gear",
    "fa-helmet-safety",
    "fa-fire-extinguisher",
    "fa-fire",
    "fa-shield-halved",
    "fa-video",
    "fa-camera",
    "fa-snowflake",
    "fa-temperature-low",
    "fa-wrench",
    "fa-screwdriver-wrench",
    "fa-toolbox",
    "fa-hard-hat",
    "fa-building",
    "fa-building-shield",
    "fa-warehouse",
    "fa-truck",
    "fa-ship",
    "fa-gas-pump",
    "fa-oil-can",
    "fa-mountain",
    "fa-mountain-sun",
    "fa-wheat-awn",
    "fa-wheat-alt",
    "fa-box-open",
    "fa-boxes-stacked",
    "fa-cart-shopping",
    "fa-store",
    "fa-shirt",
    "fa-glasses",
    "fa-eye",
    "fa-handshake",
    "fa-users",
    "fa-user-gear",
    "fa-phone",
    "fa-envelope",
    "fa-clock",
    "fa-map-location-dot",
    "fa-earth-americas",
    "fa-check",
    "fa-circle-check",
    "fa-star",
    "fa-image",
    "fa-images",
    "fa-lightbulb",
    "fa-solar-panel",
    "fa-network-wired",
    "fa-server",
    "fa-lock",
    "fa-key",
    "fa-bell",
    "fa-tower-broadcast",
    "fa-faucet",
    "fa-droplet",
    "fa-water",
    "fa-fan",
    "fa-wind",
    "fa-arrow-right",
    "fa-phone-volume",
]

LEGACY_ALIASES = {
    "fa-mountain-rocks": "fa-mountain",
    "fa-wheat-straw": "fa-wheat-awn",
}

BRAND_ICONS = ["fa-whatsapp"]


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, dest)


def build_logos() -> None:
    logo = Image.open(PUBLIC / "logo.png").convert("RGBA")
    logo.save(PUBLIC / "logo.webp", "WEBP", quality=82, method=6)
    logo.resize((180, 180), Image.Resampling.LANCZOS).save(
        PUBLIC / "logo-180.webp", "WEBP", quality=82, method=6
    )
    logo.resize((96, 96), Image.Resampling.LANCZOS).save(
        PUBLIC / "logo-96.webp", "WEBP", quality=82, method=6
    )


def build_poppins() -> None:
    FONTS.mkdir(parents=True, exist_ok=True)
    ua = (
        "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 "
        "Chrome/120.0.0.0 Mobile Safari/537.36"
    )
    css_url = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
    req = urllib.request.Request(css_url, headers={"User-Agent": ua})
    css = urllib.request.urlopen(req, timeout=30).read().decode()
    chosen: dict[int, str] = {}
    for block in re.split(r"/\*\s*", css):
        if not re.match(r"latin\s*\*/", block):
            continue
        weight = re.search(r"font-weight:\s*(\d+)", block)
        url = re.search(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", block)
        if weight and url:
            chosen[int(weight.group(1))] = url.group(1)
    for weight, url in chosen.items():
        download(url, FONTS / f"poppins-{weight}.woff2")

    (STYLES / "fonts.css").write_text(
        """/* Self-hosted Poppins (latin) */
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/poppins-400.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/poppins-600.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: 'Poppins';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/fonts/poppins-700.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
"""
    )


def codepoint_for(css_all: str, icon_class: str) -> str | None:
    pat = rf'\.{re.escape(icon_class)}(?=[,.:{{])[^{{]*\{{content:"\\([0-9a-fA-F]+)"\}}'
    match = re.search(pat, css_all)
    return match.group(1).lower() if match else None


def build_icons() -> None:
    FA_TMP.mkdir(parents=True, exist_ok=True)
    for name in [
        "css/all.min.css",
        "webfonts/fa-solid-900.woff2",
        "webfonts/fa-brands-400.woff2",
    ]:
        download(f"{FA_BASE}/{name}", FA_TMP / Path(name).name)

    css_all = (FA_TMP / "all.min.css").read_text(encoding="utf-8", errors="replace")
    solid_map = {}
    missing = []
    for icon in SOLID_ICONS:
        cp = codepoint_for(css_all, icon)
        if cp:
            solid_map[icon] = cp
        else:
            missing.append(icon)
    if missing:
        raise SystemExit(f"Missing FA icons: {missing}")

    brand_map = {}
    for icon in BRAND_ICONS:
        cp = codepoint_for(css_all, icon)
        if not cp:
            raise SystemExit(f"Missing brand icon: {icon}")
        brand_map[icon] = cp

    alias_map = {alias: solid_map[target] for alias, target in LEGACY_ALIASES.items()}

    solid_out = str(FONTS / "fa-solid-subset.woff2")
    brand_out = str(FONTS / "fa-brands-subset.woff2")
    unicodes_solid = ",".join(sorted({f"U+{cp.upper()}" for cp in solid_map.values()}))
    unicodes_brand = ",".join(sorted({f"U+{cp.upper()}" for cp in brand_map.values()}))

    sys.argv = [
        "pyftsubset",
        str(FA_TMP / "fa-solid-900.woff2"),
        f"--unicodes={unicodes_solid}",
        "--flavor=woff2",
        f"--output-file={solid_out}",
    ]
    subset_main()
    sys.argv = [
        "pyftsubset",
        str(FA_TMP / "fa-brands-400.woff2"),
        f"--unicodes={unicodes_brand}",
        "--flavor=woff2",
        f"--output-file={brand_out}",
    ]
    subset_main()

    lines = [
        "/* Font Awesome 6 subset (self-hosted) — public site icons */",
        """@font-face {
  font-family: 'Font Awesome 6 Free';
  font-style: normal;
  font-weight: 900;
  font-display: swap;
  src: url('/fonts/fa-solid-subset.woff2') format('woff2');
}
@font-face {
  font-family: 'Font Awesome 6 Brands';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/fa-brands-subset.woff2') format('woff2');
}
.fa,
.fa-solid,
.fa-brands {
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  display: inline-block;
  font-style: normal;
  font-variant: normal;
  line-height: 1;
  text-rendering: auto;
}
.fa-solid {
  font-family: 'Font Awesome 6 Free';
  font-weight: 900;
}
.fa-brands {
  font-family: 'Font Awesome 6 Brands';
  font-weight: 400;
}
.fa-2x { font-size: 2em; }
.fa-3x { font-size: 3em; }
""",
    ]
    for icon, cp in sorted(solid_map.items()):
        lines.append(f'.{icon}:before {{ content: "\\{cp}"; }}')
    for icon, cp in sorted(alias_map.items()):
        lines.append(f'.{icon}:before {{ content: "\\{cp}"; }} /* legacy alias */')
    for icon, cp in sorted(brand_map.items()):
        lines.append(f'.{icon}:before {{ content: "\\{cp}"; }}')

    (STYLES / "icons.css").write_text("\n".join(lines) + "\n")


def main() -> None:
    build_logos()
    build_poppins()
    build_icons()
    print("OK: logos, fonts and FA subset regenerated")


if __name__ == "__main__":
    main()
