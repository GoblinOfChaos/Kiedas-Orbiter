#!/usr/bin/env python3
"""
riven_grader_overlay.py - GTK overlay showing your graded rivens. Ported
from Qt on 2026-07-16, same reason as fissure_overlay.py: Qt's platform
plugin was crashing on launch on this machine (X11 auth failure connecting
to :0), and Qt's own "stay above fullscreen" mechanism (LayerShellQt) has
no Python bindings at all. Windowing switched 2026-07-27 to replicate
Cephalon Kronos's actual override-redirect + raw-Xlib-hints +
focus-lost-AOT-keeper mechanism - see overlay_gtk.py and x11_overlay.py's
module docstrings for the full account.

Watches DATA_DIR/riven-graded.json (written by riven_grader_watcher.py
whenever inventory.json changes) and shows a floating list of all your
rivens ranked by roll quality, highlighting any that were just rerolled
(same id, different stats vs. the previous state). Auto-hides 2 minutes
after the last inventory refresh, reappearing on the next one.
"""

import json
import os
import re
import sys
import time
import traceback

os.environ.setdefault("GDK_BACKEND", "x11")

import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib, Gdk  # noqa: E402

from paths import DATA_DIR, WFINFO_DIR  # noqa: E402
from theme import get_palette  # noqa: E402
from x11_overlay import (  # noqa: E402
    setup_overlay_window, monitor_origin, move_to_monitor, target_monitor,
    apply_position, raise_and_keep_on_top,
)

STATE_FILE = DATA_DIR / "riven-graded.json"
PREV_STATE_FILE = DATA_DIR / "riven-graded-prev.json"
SCREEN_FILE = DATA_DIR / "riven-screen.json"
from paths import CONFIG_FILE

POLL_INTERVAL_MS = 100
AUTO_HIDE_MS = 120_000
SCREEN_STALE_MS = 18_000

from riven_grader_watcher import (
    EXPORT_UPGRADES_FILE,
    RIVEN_NAME_FRAGMENTS_FILE,
    _decode_riven_generated_name,
    _grade_riven,
    _load_json,
    _match_weapon_variant,
    _riven_mod_path_for_variant,
    _valid_riven_stat_shape,
    load_riven_data,
)
from riven_stat_matching import VISIBLE_STAT_PHRASES as _VISIBLE_STAT_CODES
from riven_stat_matching import match_stat_phrase as _match_stat_phrase
RIVEN_GRADE_DATA = load_riven_data()
RIVEN_UPGRADE_DATA = _load_json(EXPORT_UPGRADES_FILE, {})
RIVEN_NAME_FRAGMENTS = _load_json(RIVEN_NAME_FRAGMENTS_FILE, {})

# Read from whatever theme is currently selected in the main app. Grade
# colors (great/good/ok/weak/reroll) stay fixed - those are a categorical
# color language (same call already made for RIVEN_GRADER_TAB.py's
# GRADE_COLORS), not meant to shift with theme. Jacob 2026-07-24.
_p = get_palette()
BG = _p['bg']
TEXT = _p['fg']
DIM = _p['fg_dim']
GREAT_COLOR = "#3eff3e"
GOOD_COLOR = "#ffd24c"
OK_COLOR = "#ff9933"
WEAK_COLOR = "#ff6060"
REROLL_COLOR = "#ff4444"
UNKNOWN_COLOR = _p['fg_dim']

GRADE_COLORS = {
    "great": GREAT_COLOR,
    "good": GOOD_COLOR,
    "ok": OK_COLOR,
    "weak": WEAK_COLOR,
    "reroll": REROLL_COLOR,
    "review": UNKNOWN_COLOR,
    "unknown": UNKNOWN_COLOR,
}

def _riven_css(scale=1.0):
    return f"""
window {{ background-color: {_p['bg']}; border: 2px solid {_p['border_bright']}; }}
label {{ color: {_p['fg']}; font-family: sans-serif; }}
.title {{ color: {_p['gold_bright']}; font-size: {15 * scale:.1f}px; font-weight: bold; }}
.age {{ color: {_p['fg_dim']}; font-size: {12 * scale:.1f}px; }}
.weapon {{ font-size: {17 * scale:.1f}px; font-weight: bold; }}
.grade {{ font-size: {16 * scale:.1f}px; font-weight: bold; }}
.stats {{ font-size: {14 * scale:.1f}px; }}
.meta {{ color: {_p['fg_dim']}; font-size: {12 * scale:.1f}px; }}
.reroll-badge {{ color: {_p['gold']}; font-size: {13 * scale:.1f}px; font-weight: bold; }}
.empty {{ color: {_p['fg_dim']}; font-size: {14 * scale:.1f}px; padding: 12px; }}
"""


def _scale_for_geom(geom):
    if not geom or not geom.get("height"):
        return 1.0
    return max(0.85, min(2.0, geom["height"] / 1080.0))


def log(msg):
    now = time.time()
    stamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now))
    print(f"[riven-overlay {stamp}.{int(now % 1 * 1000):03d}] {msg}",
          file=sys.stderr, flush=True)


def _load_config():
    try:
        return json.loads(CONFIG_FILE.read_text())
    except Exception:
        return {}


def _cached_warframe_geom():
    try:
        state = json.loads((DATA_DIR / "latest-detection.json").read_text())
        return state.get("warframe")
    except (OSError, json.JSONDecodeError):
        return None


def _target_monitor():
    display = Gdk.Display.get_default()
    if display is None:
        return None
    cfg = _load_config()
    warframe_geom = _cached_warframe_geom()
    return target_monitor(display, cfg.get("overlay_monitor", "auto"), warframe_geom)


def _existing_ts():
    """Read whatever timestamp is already sitting in riven-graded.json at
    startup - without this, _last_ts starting as None means the very
    first poll always looks "new" and shows the overlay immediately on
    launch, even with stale data from a much earlier session."""
    try:
        return json.loads(STATE_FILE.read_text()).get("ts")
    except (OSError, json.JSONDecodeError):
        return None


def _ocr_key(value):
    return "".join(ch.lower() for ch in str(value) if ch.isalnum())


def _match_riven(card_text, rivens):
    """Match visible OCR to an owned Riven by its weapon compatibility name."""
    haystack = _ocr_key(card_text)
    matches = []
    for riven in rivens:
        weapon_key = _ocr_key(riven.get("weapon", ""))
        if weapon_key and weapon_key in haystack:
            matches.append((len(weapon_key), riven))
    return max(matches, key=lambda pair: pair[0])[1] if matches else None


def _clean_ocr_lines(text):
    lines = []
    for raw in str(text).splitlines():
        line = " ".join(raw.strip().split())
        if line and _ocr_key(line) not in {"mr", "ranked"}:
            lines.append(line)
    return lines


def _generated_name_from_card(text, weapon=""):
    """Return the generated-name token before the first visible stat line."""
    headings = []
    for line in _clean_ocr_lines(text):
        key = _ocr_key(line)
        if "%" in line or any(phrase in key for phrase, _ in _VISIBLE_STAT_CODES):
            break
        headings.append(line)
    weapon_key = _ocr_key(weapon)
    # Only drop a heading line that IS the weapon name verbatim. A substring
    # check here was too aggressive: when OCR wraps the weapon name and the
    # start of a hyphenated generated name onto the same line (e.g. "Arca
    # Plasmor Arma-" before a second line "satides"), the weapon name is a
    # substring of that whole line, so the old check discarded the entire
    # line - including the "Arma-" name fragment it carried - leaving only
    # "satides" to decode instead of the real "Arma-satides", which then
    # falsely conflicted with the visible stats and blocked the grade forever.
    headings = [line for line in headings if not (
        weapon_key and _ocr_key(line) == weapon_key
    )]
    if not headings:
        return ""
    # Warframe commonly wraps a hyphenated generated name across two lines,
    # e.g. `Ampi-` then `lexipha`. Decoding only the last line loses an entire
    # positive stat and falsely reports a name/stat conflict.
    parts = [line.split()[-1].strip(".,:;()[]{}") for line in headings[-2:]]
    if len(parts) == 2:
        return parts[0] + parts[1] if parts[0].endswith("-") else "-".join(parts)
    return parts[0]


def _grade_visible_card(text, old_riven):
    """Grade visible reroll stats. Perfectness is unavailable pre-confirmation."""
    if not old_riven:
        return None
    positives = []
    negatives = []
    displays = {}
    for line in _clean_ocr_lines(text):
        key = _ocr_key(line)
        code = _match_stat_phrase(key)
        if not code:
            continue
        stripped = line.lstrip()
        compact = "".join(stripped.lower().split())
        # A live test showed animation-noise OCR prepending stray characters
        # before a REAL negative value (e.g. "v » -70.5% Damage"), so
        # requiring the sign at the very start of the line missed a real
        # curse. But scanning the whole line for any "-"/"−" was too broad in
        # the other direction - a live test then showed decorative OCR noise
        # (some stray glyph reading as "-") landing before a genuinely
        # positive "+48% Toxin" line, misclassifying it as a curse. A real
        # negative value always has the sign directly touching its digits
        # ("-70.5"); requiring that adjacency (rather than the sign appearing
        # anywhere, or only at position 0) catches the real curse without the
        # false positive.
        is_curse = (
            (bool(re.search(r"[-−]\d", compact)) and code != "REC")
            or "x0." in compact
            or "x0," in compact
        )
        target = negatives if is_curse else positives
        if code not in target:
            target.append(code)
            displays[code] = line

    def review(reason):
        return {
            "id": "",
            "weapon": old_riven.get("weapon", ""),
            "positives": positives,
            "negatives": negatives,
            "pos_display": [displays.get(code, f"+{code}") for code in positives],
            "neg_display": [displays.get(code, f"-{code}") for code in negatives],
            "rerolls": old_riven.get("rerolls", 0) + 1,
            "polarity": "",
            "grade": "review",
            "label": "REVIEW · uncertain OCR",
            "score": 0,
            "guidance_status": "ocr_uncertain",
            "profile_source": "Live reroll OCR",
            "reviewed_at": None,
            "explanation": reason,
            "selected_variant": old_riven.get("selected_variant"),
            "perfectness": None,
        }

    generated_name = _generated_name_from_card(text, old_riven.get("weapon", ""))
    mod_path = _riven_mod_path_for_variant(old_riven.get("selected_variant"))
    decoded = _decode_riven_generated_name(
        generated_name, RIVEN_UPGRADE_DATA, mod_path, RIVEN_NAME_FRAGMENTS
    )
    if decoded:
        visible_positive_set = set(positives)
        decoded_set = set(decoded)
        if visible_positive_set and not visible_positive_set <= decoded_set:
            return review(
                f"Generated name {generated_name!r} decodes to {sorted(decoded_set)}, "
                f"but visible stat OCR read {sorted(visible_positive_set)}."
            )
        positives[:] = decoded
        legend = RIVEN_GRADE_DATA.get("legend", {})
        for code in positives:
            # The generated name is deterministic and more trustworthy than
            # the animated card's punctuation. Never display OCR artifacts
            # such as yen signs or stray sentence fragments as stat text.
            displays[code] = f"+{legend.get(code, code)}"

    if not positives and not negatives:
        return None

    if not _valid_riven_stat_shape(positives, negatives):
        return review(
            f"Read {len(positives)} positive and {len(negatives)} negative stats; "
            "an unveiled Riven must have 2–3 positives and at most 1 negative."
        )
    # Never expose raw Tesseract punctuation in the live UI. Generated names
    # canonicalize positives, while visible OCR is still needed to discover the
    # optional curse; both are displayed using the same clean legend names.
    legend = RIVEN_GRADE_DATA.get("legend", {})
    for code in positives:
        displays[code] = f"+{legend.get(code, code)}"
    for code in negatives:
        displays[code] = f"-{legend.get(code, code)}"
    result = _grade_riven(
        old_riven.get("weapon", ""), positives, negatives,
        RIVEN_GRADE_DATA, perfectness=0.0,
    )
    return {
        "id": "",
        "weapon": old_riven.get("weapon", ""),
        "positives": positives,
        "negatives": negatives,
        "pos_display": [displays[code] for code in positives],
        "neg_display": [displays[code] for code in negatives],
        "rerolls": old_riven.get("rerolls", 0) + 1,
        "polarity": "",
        "grade": result.get("grade", "unknown"),
        "label": result.get("label", "Not graded"),
        "score": result.get("score", 0),
        "guidance_status": result.get("guidance_status", "unversioned"),
        "profile_source": result.get("profile_source", "Unknown profile source"),
        "reviewed_at": result.get("reviewed_at"),
        "explanation": result.get("explanation", ""),
        "mandatory": result.get("mandatory", []),
        "optional": result.get("optional", []),
        "pick_n": result.get("pick_n", 0),
        "safe_negatives": result.get("safe_negatives", []),
        "risky_negatives": result.get("risky_negatives", []),
        "selected_variant": old_riven.get("selected_variant"),
        "perfectness": None,
    }


class RivenGraderOverlay:
    def __init__(self):
        self._last_screen_signature = None
        self._hide_source = None
        self._current_riven = None
        self._new_offer = None

        self.window = Gtk.Window(type=Gtk.WindowType.TOPLEVEL)
        self.window.set_decorated(False)
        self.window.set_resizable(False)
        self.window.set_size_request(380, -1)

        # override-redirect + focus-lost AOT keeper is required to remain
        # visible above fullscreen/borderless Warframe. Detector crops and
        # strict FITS IN validation prevent this window from contaminating
        # OCR without needing to lower it below the game.
        setup_overlay_window(self.window)
        monitor = _target_monitor()
        position_file = DATA_DIR / "riven-overlay-gtk-position.json"
        default_position = {"top": 220, "left": 100}
        if monitor is not None:
            move_to_monitor(self.window, monitor, position_file, default_position)

        from gtk_overlay_drag import enable_drag
        enable_drag(self.window, None, position_file, default_position)

        self._css_provider = Gtk.CssProvider()
        self._css_provider.load_from_data(_riven_css().encode())
        Gtk.StyleContext.add_provider_for_screen(
            self.window.get_screen(), self._css_provider, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

        self._setup_ui()
        self.window.set_opacity(0.95)

        GLib.timeout_add(POLL_INTERVAL_MS, self._poll)
        log(f"started, polling {STATE_FILE}")

    def _setup_ui(self):
        outer = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=0)
        self.window.add(outer)

        title_row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=4)
        title_row.set_margin_top(4)
        title_row.set_margin_bottom(4)
        title_row.set_margin_start(8)
        title_row.set_margin_end(8)
        title_lbl = Gtk.Label(label="⚔ Riven Rolls")
        title_lbl.get_style_context().add_class("title")
        title_row.pack_start(title_lbl, False, False, 0)
        self._age_lbl = Gtk.Label(label="")
        self._age_lbl.get_style_context().add_class("age")
        title_row.pack_end(self._age_lbl, False, False, 0)
        outer.pack_start(title_row, False, False, 0)

        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        scroll.set_max_content_height(480)
        scroll.set_propagate_natural_height(True)
        self._content = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=4)
        self._content.set_margin_top(6)
        self._content.set_margin_bottom(6)
        self._content.set_margin_start(8)
        self._content.set_margin_end(8)
        scroll.add(self._content)
        outer.pack_start(scroll, True, True, 0)

        self._empty_lbl = Gtk.Label(label="Waiting for inventory refresh…")
        self._empty_lbl.get_style_context().add_class("empty")
        self._content.pack_start(self._empty_lbl, False, False, 0)
        # Deliberately not shown yet - stays hidden until the first real
        # riven data arrives via _poll(), matching the reward overlay's
        # pattern (which doesn't show anything until its first detection
        # either) rather than flashing an empty window on startup.

    def _clear_content(self):
        for child in self._content.get_children():
            self._content.remove(child)

    def _poll(self):
        try:
            if not SCREEN_FILE.exists():
                return True
            screen = json.loads(SCREEN_FILE.read_text())
            graded = json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}
            written_at_ms = int(screen.get("written_at_ms", 0) or 0)
            if screen.get("visible") and (
                written_at_ms <= 0 or int(time.time() * 1000) - written_at_ms > SCREEN_STALE_MS
            ):
                if self.window.get_visible():
                    log("hiding stale Riven screen state (detector heartbeat expired)")
                    self._hide()
                self._last_screen_signature = None
                return True
            # Detector heartbeat writes advance written_at_ms while the same
            # screen remains visible. Exclude that timestamp from the render
            # signature so freshness updates do not rebuild/flicker the UI.
            signature = (
                screen.get("visible"), screen.get("stable"), screen.get("mode"),
                tuple(screen.get("cards", [])), screen.get("variant", ""),
                graded.get("ts"), screen.get("just_confirmed"),
            )
            if signature == self._last_screen_signature:
                return True
            self._last_screen_signature = signature
            if not screen.get("visible"):
                self._current_riven = None
                self._new_offer = None
                self._hide()
                return True
            mode = screen.get("mode")
            # SelectionConfirmed collapses Confirm -> Cycle immediately, but
            # the freshly-confirmed roll's real stats have not reached
            # inventory.json/riven-graded.json yet (that only updates on the
            # next periodic inventory refresh). Reusing the cached
            # _current_riven left CURRENT ROLL showing the pre-reroll stats
            # even though the game's own card already showed the new ones.
            # The just-confirmed OCR grade (_new_offer) is the real ground
            # truth until the slower inventory refresh catches up.
            #
            # Rust's just_confirmed flag (rather than merely noticing the
            # mode went Confirm -> Cycle) is required here: backing out of
            # a preview WITHOUT confirming collapses back to Cycle exactly
            # the same way. A live test showed this promoting a merely-
            # previewed-then-cancelled roll into CURRENT ROLL - the mode
            # transition alone can't tell "confirmed" and "cancelled" apart,
            # only Rust's EE.log-driven SelectionConfirmed event can.
            if screen.get("just_confirmed") and self._new_offer:
                self._current_riven = self._new_offer
            self._new_offer = None
            self._show_reroll_screen(
                mode, screen.get("cards", []), graded.get("rivens", []),
                screen.get("stable", True), screen.get("variant", ""),
            )
        except Exception as e:
            log(f"poll error: {e}\n{traceback.format_exc()}")
        return True

    def _show_reroll_screen(self, mode, cards, rivens, stable=True, variant_text=""):
        self._clear_content()
        card_texts = [str(card) for card in cards]
        old = self._current_riven
        if old is None:
            old = next((_match_riven(text, rivens) for text in card_texts
                        if _match_riven(text, rivens)), None)
        if old:
            old = dict(old)
            selected_variant = _match_weapon_variant(
                variant_text, old.get("weapon_variants", [])
            )
            if selected_variant:
                old["selected_variant"] = selected_variant
            # `old` may be stale: it comes from the separate, slower
            # inventory.json refresh cycle, which can lag well behind the
            # live in-game roll (a live test showed CURRENT ROLL displaying
            # stats from before the current testing session even though the
            # game's own card already showed the real current roll). The
            # visible card OCR is ground truth for what's on screen right
            # now, so re-grade it directly and prefer that whenever OCR
            # consensus is available and it disagrees with the cached entry.
            if mode == "cycle" and card_texts:
                live = _grade_visible_card(card_texts[0], old)
                if live:
                    live_signature = (set(live.get("positives", [])), set(live.get("negatives", [])))
                    old_signature = (set(old.get("positives", [])), set(old.get("negatives", [])))
                    if live_signature != old_signature:
                        # _grade_visible_card assumes it's grading a new
                        # reroll candidate (blank id, rerolls+1); this is
                        # actually the same riven's current live state, not a
                        # reroll, so keep its real identity/reroll count.
                        # During fast rerolling, "stable" can stay false
                        # while the screen already changed, so fall back to
                        # live OCR whenever it decodes a valid stat shape.
                        if stable or live.get("guidance_status") != "ocr_uncertain":
                            live["id"] = old.get("id", "")
                            live["rerolls"] = old.get("rerolls", 0)
                            old = live
                        else:
                            # Live OCR disagrees with the cached snapshot but
                            # isn't confident enough to trust yet - never fall
                            # through to displaying the now-known-stale cached
                            # stats. Confirmed live 2026-07-30/31 (issue #7):
                            # CURRENT ROLL showed stats matching neither
                            # visible card because this exact branch fell
                            # through to the stale `old` with nothing to
                            # override it. Suppress to a neutral card instead;
                            # the next stable capture resolves it for real.
                            old = None
                else:
                    # Live grading failed outright (no readable stats this
                    # frame) - the cached snapshot is unverified against
                    # what's actually on screen, so don't display it as if
                    # it were confirmed current.
                    old = None
            self._current_riven = old

        geom = _cached_warframe_geom() or {}
        scale = _scale_for_geom(geom)
        self._css_provider.load_from_data(_riven_css(scale).encode())
        monitor = _target_monitor()
        mx, my = monitor_origin(monitor)
        game_width = int(geom.get("width") or 1920)
        game_height = int(geom.get("height") or 1080)

        if mode == "cycle":
            self.window.set_size_request(round(520 * scale), -1)
            self._last_left = round(game_width * 0.05)
            self._last_top = round(game_height * 0.27)
            if old:
                self._content.pack_start(self._make_riven_row(old), False, False, 0)
            else:
                # Never show raw per-frame OCR text (alt-tab/compositor
                # transitions can hand us a garbled frame) until the detector
                # itself has confirmed consensus across repeated captures.
                self._content.pack_start(
                    self._make_ocr_card(
                        "SELECTED RIVEN", card_texts[0] if (stable and card_texts) else ""
                    ),
                    False, False, 0,
                )
        elif mode == "confirm":
            self.window.set_size_request(round(1040 * scale), -1)
            # Keep the panel below the header OCR crop (top 13%) and above all
            # card/action crops. It can be present in the desktop bitmap but
            # cannot cover any pixels the detector reads.
            self._last_left = round(game_width * 0.19)
            self._last_top = round(game_height * 0.15)
            candidates = []
            if stable and old:
                old_signature = (set(old.get("positives", [])), set(old.get("negatives", [])))
                # Confirm-mode card_texts is [current/left, new-offer/right]
                # (matches src/bin/main.rs's card_rects order: index 0 is
                # the left rect at x=0.245, index 1 the right rect at
                # x=0.41). This used to loop over BOTH positions and take
                # whichever one first graded as "different from old" -
                # but "old" (CURRENT ROLL's cached reference) can itself
                # be stale, in which case the LEFT/current card can also
                # legitimately differ from it and win that race, getting
                # mislabeled as the new offer while the real new-offer
                # card (index 1) gets ignored. A live test showed exactly
                # this: NEW OFFER displaying the stats of the *current*
                # (left) card while CURRENT ROLL showed the *new* (right)
                # card's stats - the two panels effectively swapped.
                # Only the actual new-offer position should ever be
                # considered here. Jacob 2026-07-27 ("it now has them as
                # opposite cards").
                new_offer_text = card_texts[1] if len(card_texts) > 1 else None
                if new_offer_text is not None:
                    candidate = _grade_visible_card(new_offer_text, old)
                    if candidate and candidate.get("guidance_status") == "ocr_uncertain":
                        log(
                            f"new offer stuck: {candidate.get('explanation', '(no reason given)')} "
                            f"| raw ocr lines: {_clean_ocr_lines(new_offer_text)!r}"
                        )
                    if candidate and candidate.get("guidance_status") != "ocr_uncertain" and (
                        set(candidate.get("positives", [])),
                        set(candidate.get("negatives", [])),
                    ) != old_signature:
                        candidates.append(candidate)
            new_riven = candidates[0] if candidates else self._new_offer
            if candidates:
                self._new_offer = candidates[0]
            comparison = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=8)
            comparison.set_homogeneous(True)
            comparison.pack_start(
                self._labeled_card(
                    "CURRENT ROLL",
                    self._make_riven_row(old) if old else self._make_ocr_card(
                        "CURRENT ROLL", card_texts[0] if (stable and card_texts) else ""
                    ),
                ),
                True, True, 0,
            )
            comparison.pack_start(
                self._labeled_card(
                    "NEW OFFER" if stable else "NEW OFFER · PROVISIONAL",
                    self._make_riven_row(new_riven) if new_riven else
                    self._make_ocr_card("NEW ROLL", ""),
                ), True, True, 0,
            )
            self._content.pack_start(comparison, False, False, 0)
        else:
            self._hide()
            return

        self._age_lbl.set_text("live reroll" if stable else "verifying OCR…")
        self._content.show_all()
        self.window.show_all()
        # Position AFTER show_all() finalizes real size for this frame's
        # content - see Overlay._show_rewards in overlay_gtk.py for why
        # (Kronos's confirmed KWin ConfigureNotify-reorder fix, 647ffd7).
        apply_position(self.window, mx + self._last_left, my + self._last_top)
        raise_and_keep_on_top(self.window)
        log(f"showing {mode} Riven reroll overlay")
        GLib.idle_add(self._log_window_state, mode)

    def _log_window_state(self, mode):
        allocation = self.window.get_allocation()
        top = getattr(self, "_last_top", None)
        left = getattr(self, "_last_left", None)
        log(
            f"window state after {mode}: visible={self.window.get_visible()} "
            f"mapped={self.window.get_mapped()} size={allocation.width}x{allocation.height} "
            f"position=top:{top},left:{left}"
        )
        return False

    def _labeled_card(self, title, widget):
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=3)
        label = Gtk.Label(label=title)
        label.get_style_context().add_class("title")
        box.pack_start(label, False, False, 0)
        box.pack_start(widget, False, False, 0)
        return box

    def _make_ocr_card(self, title, text):
        frame = Gtk.Frame()
        frame.set_shadow_type(Gtk.ShadowType.NONE)
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=2)
        box.set_margin_top(5)
        box.set_margin_bottom(5)
        box.set_margin_start(7)
        box.set_margin_end(7)
        frame.add(box)
        lines = _clean_ocr_lines(text)
        label = Gtk.Label(label="\n".join(lines) if lines else "Reading Riven stats…")
        label.set_xalign(0)
        label.set_line_wrap(True)
        label.set_max_width_chars(36)
        box.pack_start(label, False, False, 0)
        return frame

    def _show_rivens(self, rivens, ts, prev_by_id=None):
        self._clear_content()
        prev_by_id = prev_by_id or {}

        if not rivens:
            lbl = Gtk.Label(label="No rivens found in inventory")
            lbl.get_style_context().add_class("empty")
            self._content.pack_start(lbl, False, False, 0)
        else:
            rerolled_ids = set()
            for r in rivens:
                rid = r.get("id")
                if rid and rid in prev_by_id:
                    prev = prev_by_id[rid]
                    if (prev.get("positives") != r.get("positives") or
                            prev.get("negatives") != r.get("negatives")):
                        rerolled_ids.add(rid)

            for r in rivens:
                prev = prev_by_id.get(r.get("id", ""))
                was_rerolled = r.get("id") in rerolled_ids
                self._content.pack_start(
                    self._make_riven_row(r, prev if was_rerolled else None), False, False, 0
                )

        age = int(time.time()) - ts
        self._age_lbl.set_text(f"updated {age}s ago")

        self._content.show_all()
        self.window.show_all()
        raise_and_keep_on_top(self.window)
        log(f"showing {len(rivens)} rivens")

        if self._hide_source is not None:
            GLib.source_remove(self._hide_source)
        self._hide_source = GLib.timeout_add(AUTO_HIDE_MS, self._hide)

    def _make_riven_row(self, r, prev=None):
        grade = r.get("grade", "unknown")
        color = GRADE_COLORS.get(grade, UNKNOWN_COLOR)

        frame = Gtk.Frame()
        frame.set_shadow_type(Gtk.ShadowType.NONE)
        border_width = 4 if prev else 3
        css = Gtk.CssProvider()
        css.load_from_data(
            f"frame {{ background: {_p['bg_panel']}; border-left: {border_width}px solid {color}; "
            f"border-radius: 3px; }}".encode()
        )
        frame.get_style_context().add_provider(css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)

        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=1)
        box.set_margin_top(3)
        box.set_margin_bottom(3)
        box.set_margin_start(6)
        box.set_margin_end(6)
        frame.add(box)

        top = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=6)
        weapon_lbl = Gtk.Label(label=r.get("weapon", "?").title())
        weapon_lbl.get_style_context().add_class("weapon")
        weapon_lbl.set_xalign(0)
        top.pack_start(weapon_lbl, False, False, 0)
        if prev:
            badge = Gtk.Label(label="↻ REROLLED")
            badge.get_style_context().add_class("reroll-badge")
            top.pack_start(badge, False, False, 0)
        grade_lbl = Gtk.Label()
        display_label = r.get("label", "").replace("↻ REROLL", "BAD")
        grade_lbl.set_markup(
            f"<span foreground='{color}'>{GLib.markup_escape_text(display_label)}</span>"
        )
        grade_lbl.get_style_context().add_class("grade")
        grade_lbl.set_xalign(1)
        top.pack_end(grade_lbl, False, False, 0)
        box.pack_start(top, False, False, 0)

        if prev:
            old_parts = prev.get("pos_display", []) + prev.get("neg_display", [])
            old_text = "  ·  ".join(old_parts) if old_parts else "No stats"
            old_grade = prev.get("grade", "unknown")
            old_color = GRADE_COLORS.get(old_grade, UNKNOWN_COLOR)
            old_lbl = Gtk.Label()
            old_lbl.set_markup(
                f"<span foreground='{old_color}' strikethrough='true'>OLD: {GLib.markup_escape_text(old_text)}</span>"
            )
            old_lbl.get_style_context().add_class("stats")
            old_lbl.set_xalign(0)
            box.pack_start(old_lbl, False, False, 0)

        stats_parts = r.get("pos_display", []) + r.get("neg_display", [])
        stats_text = "  ·  ".join(stats_parts) if stats_parts else "No stats"
        prefix = "NEW: " if prev else ""
        stats_lbl = Gtk.Label()
        if prev:
            stats_lbl.set_markup(f"<span foreground='{color}' weight='bold'>{prefix}{GLib.markup_escape_text(stats_text)}</span>")
        else:
            stats_lbl.set_text(stats_text)
        stats_lbl.get_style_context().add_class("stats")
        stats_lbl.set_xalign(0)
        box.pack_start(stats_lbl, False, False, 0)

        legend = RIVEN_GRADE_DATA.get("legend", {})
        positives = set(r.get("positives", []))
        negatives = set(r.get("negatives", []))
        mandatory = set(r.get("mandatory", []))
        optional = set(r.get("optional", []))
        safe_negatives = set(r.get("safe_negatives", []))
        if mandatory or optional or negatives:
            assessment = []
            for code in sorted(positives):
                name = legend.get(code, code)
                if code in mandatory or code in optional:
                    assessment.append((GREAT_COLOR, f"GOOD +{name}"))
                else:
                    assessment.append((WEAK_COLOR, f"OFF-TARGET +{name}"))
            for code in sorted(negatives):
                name = legend.get(code, code)
                if code in safe_negatives:
                    assessment.append((GREAT_COLOR, f"SAFE NEGATIVE -{name}"))
                else:
                    assessment.append((WEAK_COLOR, f"RISKY NEGATIVE -{name}"))
            for code in sorted(mandatory - positives):
                assessment.append((WEAK_COLOR, f"MISSING REQUIRED +{legend.get(code, code)}"))
            for assessment_color, assessment_text in assessment:
                assessment_lbl = Gtk.Label()
                assessment_lbl.set_markup(
                    f"<span foreground='{assessment_color}' weight='bold'>"
                    f"{GLib.markup_escape_text(assessment_text)}</span>"
                )
                assessment_lbl.get_style_context().add_class("stats")
                assessment_lbl.set_xalign(0)
                box.pack_start(assessment_lbl, False, False, 0)

        meta_parts = []
        if r.get("rerolls", 0) > 0:
            meta_parts.append(f"{r['rerolls']} rerolls")
        if r.get("polarity"):
            meta_parts.append(r["polarity"])
        selected_variant = r.get("selected_variant")
        if selected_variant:
            meta_parts.append(
                f"{selected_variant.get('name', '')} · attenuation "
                f"{selected_variant.get('omega_attenuation', 0):.2f}"
            )
        if meta_parts:
            meta_lbl = Gtk.Label(label="  ".join(meta_parts))
            meta_lbl.get_style_context().add_class("meta")
            meta_lbl.set_xalign(0)
            box.pack_start(meta_lbl, False, False, 0)

        return frame

    def _hide(self):
        self.window.hide()
        self._hide_source = None
        return False


def _enforce_singleton():
    """Same pid-file singleton pattern as overlay_gtk.py."""
    import os
    import signal
    pid_path = DATA_DIR / "riven-overlay.pid"
    pid_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        old_pid = int(pid_path.read_text().strip())
        if old_pid != os.getpid():
            try:
                os.kill(old_pid, signal.SIGTERM)
                log(f"killed previous instance (pid {old_pid})")
                time.sleep(0.3)
            except ProcessLookupError:
                pass
    except Exception:
        pass
    pid_path.write_text(str(os.getpid()))


def main():
    _enforce_singleton()
    overlay = RivenGraderOverlay()  # noqa: F841 - keep reference alive
    Gtk.main()


if __name__ == "__main__":
    main()
