#!/usr/bin/env python3
"""Fetch the Rare Styles SVG icon set (Material Symbols Outlined cuts) from
Google's icon CDN and save them under assets/css/images/icons/.

Every glyph is fetched in the two supported weights (200 and 400) and saved
as <name>-<weight>.svg. The CSS consumes them via mask-image (see
modules/decorations/_icons.scss), so fill color is irrelevant — only the
path alpha matters.

To update the set: edit ICONS below, run `python3 scripts/fetch-icons.py`
from the repo root, review the diff, rebuild the CSS. Full instructions:
assets/css/images/icons/README.md."""
import os
import sys
import urllib.request

OUT_DIR = "assets/css/images/icons"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120 Safari/537.36")

# Google serves per-weight static SVG cuts of Material Symbols Outlined here;
# wght400 is the "default" segment, other weights are explicit (wght200, …).
URL = "https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/{name}/{weight}/24px.svg"
WEIGHTS = {200: "wght200", 400: "default"}

# The shipped set (BACKLOG, milestone v0.6.18 / CSS-096):
# - library-core: glyphs Rare Styles' own components and docs render
# - forward: added ahead of need for planned components (v0.7.2 delta chip)
# - extended: maintainer-selected additions (2026-07-14)
# - ecosystem: every glyph the known consumers (schnellreich.ru, raredigits.io)
#   render, promoted into the library set by maintainer decision (2026-07-14) —
#   one collection, one pipeline; sites host no icons of their own
ICONS = [
    # library-core
    "arrow_outward",
    "attach_file",
    "bolt",
    "bookmark",
    "check",
    "chevron_left",
    "chevron_right",
    "close",
    "code",
    "cognition",
    "construction",
    "content_copy",
    "description",
    "download",
    "info",
    "keyboard_arrow_down",
    "lightbulb_2",
    "menu",
    "open_in_new",
    "search",
    "subdirectory_arrow_right",
    # forward (v0.7.2 delta chip / .stat delta states)
    "arrow_drop_down",
    "arrow_drop_up",
    # extended (2026-07-14)
    "bookmark_star",
    "chess_knight",
    "delete",
    "diamond",
    "flag_2",
    "flight",
    "function",
    "keep",
    "key",
    "key_vertical",
    "login",
    "logout",
    "recycling",
    "star",
    "star_half",
    # ecosystem (2026-07-14): schnellreich.ru
    "arrow_right_alt",
    "inbox",
    "insert_drive_file",
    "psychology",
    # ecosystem (2026-07-14): raredigits.io
    "account_balance",
    "account_circle",
    "account_tree",
    "arrow_forward",
    "auto_awesome",
    "balance",
    "bar_chart",
    "bedtime",
    "chat",
    "check_circle",
    "credit_card",
    "currency_exchange",
    "dashboard",
    "draft",
    "drafts",
    "edit_document",
    "error",
    "event",
    "event_repeat",
    "family_restroom",
    "favorite",
    "festival",
    "flag",
    "folder",
    "folder_open",
    "forum",
    "group",
    "group_add",
    "groups",
    "handshake",
    "home_work",
    "hub",
    "insights",
    "inventory_2",
    "lightbulb",
    "mail",
    "movie",
    "music_note",
    "north_east",
    "new_releases",
    "notifications",
    "pause_circle",
    "payments",
    "person_add",
    "pets",
    "priority_high",
    "query_stats",
    "radio_button_checked",
    "radio_button_unchecked",
    "read_more",
    "receipt",
    "receipt_long",
    "record_voice_over",
    "remove_circle",
    "restart_alt",
    "restaurant",
    "rocket_launch",
    "schedule",
    "send",
    "show_chart",
    "smart_toy",
    "sms",
    "south_west",
    "swap_horiz",
    "target",
    "trending_down",
    "trending_up",
    "tune",
    "visibility",
    "warning",
    "waving_hand",
    # ecosystem (2026-07-14): raredigits.io — data-driven demo templates
    "attach_money",
    "auto_awesome_mosaic",
    "brush",
    "campaign",
    "corporate_fare",
    "directions_car",
    "error_outline",
    "event_available",
    "family_group",
    "format_paint",
    "grid_view",
    "local_shipping",
    "real_estate_agent",
    "rss_feed",
    "settings",
    "speaker",
    "speed",
    "storefront",
    "task_alt",
    "toggle_off",
    "toggle_on",
    "trip_origin",
    "warehouse",
]

# Axis variants — glyphs that are the same Material Symbols name as an entry
# above but a different point on an axis (FILL, GRAD, …), which the CDN encodes
# as an alternate URL segment rather than a distinct glyph name. Each shipped
# under its own logical name (and its own .rd-icon-<name> class); "src" is the
# real glyph, and the per-weight values are the CDN segments to fetch.
#   star_fill = star with FILL 1 (a solid star, vs. the hollow default)
VARIANTS = {
    "star_fill": {"src": "star", 400: "fill1", 200: "wght200fill1"},
}


def get(url, retries=3):
    # gstatic occasionally stalls a connection; a hard timeout + retry keeps
    # a full-set refresh from hanging on one glyph.
    last = None
    for _ in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.read()
        except Exception as e:
            last = e
    raise last


def fetch(name, glyph, segment, failed):
    out = os.path.join(OUT_DIR, f"{name}-{segment[0]}.svg")
    try:
        data = get(URL.format(name=glyph, weight=segment[1]))
    except Exception as e:
        failed.append((name, segment[0], str(e)))
        print(f"  FAIL {name} @{segment[0]}: {e}")
        return
    with open(out, "wb") as f:
        f.write(data)
    print(f"  ok   {out} ({len(data)} B)")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    failed = []
    for name in ICONS:
        for weight, seg in WEIGHTS.items():
            fetch(name, name, (weight, seg), failed)
    for name, spec in VARIANTS.items():
        for weight in WEIGHTS:
            fetch(name, spec["src"], (weight, spec[weight]), failed)
    total = len(ICONS) + len(VARIANTS)
    print(f"\n{total} glyphs x {len(WEIGHTS)} weights, {len(failed)} failures")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
