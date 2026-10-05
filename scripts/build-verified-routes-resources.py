#!/usr/bin/env python3
"""Build the Phase 2 resources acquisition-route files from the local wiki archive.

This is intentionally conservative.  An item is unresolved when the archive does
not identify a route for the exported item; no route is inferred from a similar
name.  The script is resumable and writes after each round.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
SCOPE = ROOT / "docs/agent-context/briefs-2026-10-03/data/zero-resources.json"
DATA = ROOT / "src-tauri/data/assets/data"
CACHE = ROOT / "scratch/pdf-txt"
ARCHIVE = Path("/home/jedwards/kiedas-orbiter/wiki_pdf_archive")
GROUP = "resources"
INVALID_FILENAME_CHARS = re.compile(r'[/\\:*?"<>|]')


def norm(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def archive_filename(title: str) -> str:
    return INVALID_FILENAME_CHARS.sub("_", title) + ".pdf"


def archive_title_map() -> tuple[dict[str, Path], list[str]]:
    titles_path = ARCHIVE / "_titles.json"
    titles = json.loads(titles_path.read_text(encoding="utf-8"))
    exact: dict[str, Path] = {}
    folded: dict[str, Path] = {}
    missing: list[str] = []
    for title in titles:
        candidate = ARCHIVE / archive_filename(title)
        if candidate.exists():
            exact[title] = candidate
            folded[title.casefold()] = candidate
        else:
            fallback = next((path for path in ARCHIVE.glob("*.pdf") if path.name.casefold() == candidate.name.casefold()), None)
            if fallback:
                exact[title] = fallback
                folded[title.casefold()] = fallback
            else:
                missing.append(title)
    return exact | folded, missing


TITLE_TO_PDF, UNMAPPED_ARCHIVE_TITLES = archive_title_map()


def page_file(title: str) -> Path:
    path = TITLE_TO_PDF.get(title) or TITLE_TO_PDF.get(title.casefold())
    if path:
        return path
    candidate = ARCHIVE / archive_filename(title)
    if candidate.exists():
        return candidate
    raise FileNotFoundError(f"archive page missing: {title}")


def cache_file(title: str) -> Path:
    current = CACHE / (archive_filename(title)[:-4] + ".txt")
    legacy = CACHE / (title.replace("/", "_") + ".txt")
    if current.exists():
        return current
    if legacy.exists():
        return legacy
    return current


def page_text(title: str) -> str:
    cached = cache_file(title)
    if cached.exists():
        return norm(cached.read_text(encoding="utf-8", errors="ignore"))
    pdf = page_file(title)
    if not pdf.exists():
        raise FileNotFoundError(f"archive page missing: {title}")
    text = norm(" ".join(page.extract_text() or "" for page in PdfReader(pdf).pages))
    CACHE.mkdir(parents=True, exist_ok=True)
    cached.write_text(text, encoding="utf-8")
    return text


def phrase(title: str, needle: str, extra: int = 0) -> str:
    text = page_text(title)
    index = text.casefold().find(norm(needle).casefold())
    if index < 0:
        raise ValueError(f"{needle!r} not found on {title}")
    return text[index : index + len(norm(needle)) + extra]


def sentence(title: str, needle: str) -> str:
    text = page_text(title)
    index = text.casefold().find(norm(needle).casefold())
    if index < 0:
        raise ValueError(f"{needle!r} not found on {title}")
    start = max(text.rfind(".", 0, index) + 1, text.rfind("?", 0, index) + 1, text.rfind("!", 0, index) + 1)
    ends = [x for x in (text.find(".", index), text.find("?", index), text.find("!", index)) if x >= 0]
    end = min(ends, default=min(len(text), index + 300)) + (1 if ends else 0)
    return text[start:end].strip()


def source(page: str, quote: str) -> dict:
    return {
        "archive": "wiki_pdf_archive",
        "page": page,
        "url": "https://wiki.warframe.com/w/" + page.replace(" ", "_"),
        "quote": quote,
    }


def route(page: str, quote: str, kind: str, text: str, place: str, *, price=None, chance=None) -> dict:
    result = {"kind": kind, "text": text, "place": place, "source": source(page, quote)}
    if price is not None:
        result["price"] = price
    if chance is not None:
        result["chance"] = chance
    return result


def unresolved(name: str, pages: list[str], reason: str) -> dict:
    return {"name": name, "reason": reason, "pagesChecked": pages}


def build_item(item: dict, index: int) -> tuple[dict | None, dict | None]:
    name = norm(item["name"])
    unique = item["uniqueName"]

    # Void relic families and the vaulted relic variants in this scope.
    if index == 1 or index in (6, 15, 24, 29):
        q = sentence("Void Relic", "Void Relics are received as rewards in missions")
        return {unique: {"name": item["name"], "routes": [route("Void Relic", q, "drop", "Earn from Void mission rewards.", "Void missions")] }}, None
    if 2 <= index <= 5 or 7 <= index <= 14 or 16 <= index <= 23 or 25 <= index <= 28:
        q = sentence("Prime Resurgence", "Vaulted Void Relics can only be purchased from Varzia")
        return {unique: {"name": item["name"], "routes": [route("Prime Resurgence", q, "vendor", "Purchase from Varzia with Aya when the relic is available.", "Maroo's Bazaar", price={"amount": 1, "currency": "Aya"})]}}, None

    if index == 0:
        q = sentence("DNA Stabilizer", "DNA Stabilizers cannot be made from blueprints")
        return {unique: {"name": item["name"], "routes": [route("DNA Stabilizer", q, "not_obtainable", "Not currently obtainable: it cannot be crafted or found as a drop.", "DNA Stabilizer")] }}, None
    if index in (82, 96):
        q = sentence("Xiran", "Xiran is a species of fish in Duviri")
        return {unique: {"name": item["name"], "routes": [route("Xiran", q, "drop", "Catch Xiran while fishing in Duviri.", "Duviri fishing")] }}, None
    if index == 83:
        q = sentence("Sentient Core", "Eidolons found roaming the Plains of Eidolon")
        return {unique: {"name": item["name"], "routes": [route("Sentient Core", q, "drop", "Earn by capturing Eidolons in the Plains of Eidolon at night.", "Plains of Eidolon")] }}, None
    if index == 84:
        q = sentence("Hemocyte Cystolith", "Hemocyte Cystoliths are a resource dropped")
        return {unique: {"name": item["name"], "routes": [route("Hemocyte Cystolith", q, "drop", "Earn from Hemocytes in Plague Star bounties.", "Plains of Eidolon")] }}, None
    if index == 107:
        q = sentence("Zealot Derelict Code", "Zealot Derelict Codes can be obtained")
        return {unique: {"name": item["name"], "routes": [route("Zealot Derelict Code", q, "event", "Complete three Infestation Outbreak missions.", "Infestation Outbreaks")] }}, None

    # Nightwave currencies.  Amir's Shockwave is the current series in this archive;
    # the remaining series pages explicitly describe concluded series.
    nightwave_pages = {
        112: ("Nightwave/Series 2", "Emissary Cred", "Emissary"),
        113: ("Nightwave/Nora's Mix Volume 4", "Nora's Mix Vol. 4 Cred", "Nora's Mix Volume 4"),
        114: ("Nightwave/Nora's Mix Volume 7", "Nora's Mix Vol. 7 Cred", "Nora's Mix Volume 7"),
        115: ("Nightwave/Nora's Mix: Time Tempests", "Nora's Mix: Time Tempests Cred", "Nora's Mix: Time Tempests"),
        116: ("Nightwave/Nora's Mix Volume 1", "Nora's Mix Vol. 1 Cred", "Nora's Mix Volume 1"),
        117: ("Nightwave/Nora's Choice", "Nora's Choice Cred", "Nora's Choice"),
        118: ("Nightwave/Nora's Mix: Dreams of the Dead", "Nora's Mix: Dreams of the Dead Cred", "Nora's Mix: Dreams of the Dead"),
        119: ("Nightwave/Nora's Mix Volume 5", "Nora's Mix Vol. 5 Cred", "Nora's Mix Volume 5"),
        120: ("Nightwave/Nora's Mix Volume 3", "Nora's Mix Vol. 3 Cred", "Nora's Mix Volume 3"),
        121: ("Nightwave/Nora's Mix Volume 2", "Nora's Mix Vol. 2 Cred", "Nora's Mix Volume 2"),
        123: ("Nightwave/Nora's Mix Volume 6", "Nora's Mix Vol. 6 Cred", "Nora's Mix Volume 6"),
        124: ("Nightwave/Nora's Mix Volume 9", "Nora's Mix Vol. 9 Cred", "Nora's Mix Volume 9"),
        125: ("Nightwave/Intermission III", "Intermission III Cred", "Intermission III"),
        126: ("Nightwave/Nora's Mix Volume 8", "Nora's Mix Vol. 8 Cred", "Nora's Mix Volume 8"),
        127: ("Nightwave/Intermission II", "Intermission II Cred", "Intermission II"),
        128: ("Nightwave/Series 3", "Crystal Cred", "Glassmaker"),
        129: ("Nightwave/Series 1", "Wolf Cred", "The Wolf of Saturn Six"),
        130: ("Nightwave/Intermission I", "Intermission I Cred", "Intermission"),
    }
    if index == 122:
        q = sentence("Nightwave/Amir's Shockwave", "It has 30 Ranks using Amir's Shockwave Cred")
        return {unique: {"name": item["name"], "routes": [route("Nightwave/Amir's Shockwave", q, "reward", "Earn by ranking in Amir's Shockwave.", "Amir's Shockwave")] }}, None
    if index in nightwave_pages:
        page, needle, series = nightwave_pages[index]
        q = sentence(page, needle)
        return {unique: {"name": item["name"], "routes": [route(page, q, "not_obtainable", "Not currently obtainable: it was the currency for a concluded Nightwave series.", series)] }}, None

    # Captura scenes are listed as one-line acquisition records on the official
    # archive page.  Keep the item-specific record in the quote.
    if 131 <= index <= 171:
        scene_pages = {
            131: ("Artillery Battery Scene", "Unlocked by default", "Captura"),
            132: ("Lyon's Temple Date", "Rewarded weekly by inbox after romancing Lyon Allard", "Lyon Allard"),
            133: ("Lyon's Lua Circulus Date", "Rewarded weekly by inbox after romancing Lyon Allard", "Lyon Allard"),
            134: ("Lyon's Umbra Courtyard Date", "Rewarded weekly by inbox after romancing Lyon Allard", "Lyon Allard"),
            135: ("Lyon's Cold Below Date", "Rewarded weekly by inbox after romancing Lyon Allard", "Lyon Allard"),
            136: ("Lyon's Chrysalith Date", "Rewarded weekly by inbox after romancing Lyon Allard", "Lyon Allard"),
            137: ("Marie's Sanctum Date", "Rewarded weekly by inbox after romancing Marie Leroux", "Marie Leroux"),
            138: ("Marie's Cetus Date", "Rewarded weekly by inbox after romancing Marie Leroux", "Marie Leroux"),
            139: ("Marie's Drifter Camp Date", "Rewarded weekly by inbox after romancing Marie Leroux", "Marie Leroux"),
            140: ("Marie's Amphitheater Date", "Rewarded weekly by inbox after romancing Marie Leroux", "Marie Leroux"),
            141: ("Marie's Ventkid Clubhouse Date", "Rewarded weekly by inbox after romancing Marie Leroux", "Marie Leroux"),
            142: ("Roathe's Orokin Ruins Date", "Rewarded weekly by inbox after romancing Roathe", "Roathe"),
            143: ("Roathe's Duviri Throneroom Date", "Rewarded weekly by inbox after romancing Roathe", "Roathe"),
            144: ("Roathe's Murex Date", "Rewarded weekly by inbox after romancing Roathe", "Roathe"),
            145: ("Roathe's Lua Containment Date", "Rewarded weekly by inbox after romancing Roathe", "Roathe"),
            146: ("Roathe's Zariman Park Date", "Rewarded weekly by inbox after romancing Roathe", "Roathe"),
            147: ("Deimos Cenote Scene", "Dropped from Deimos Captura Container in Isolation Vaults", "Isolation Vaults"),
            148: ("Gas City Alad's Laboratory Scene", "Dropped from violet Storage Lockers inside Secret Laboratories on Jupiter", "Jupiter Secret Laboratories"),
            149: ("Gas City Upper Logistics Scene", "Dropped from violet Storage Lockers inside Secret Laboratories on Jupiter", "Jupiter Secret Laboratories"),
            150: ("Gas City Dead Exit Scene", "Dropped from violet Storage Lockers inside Secret Laboratories on Jupiter", "Jupiter Secret Laboratories"),
            151: ("Gas City Central Drop Scene", "Dropped from violet Storage Lockers inside Secret Laboratories on Jupiter", "Jupiter Secret Laboratories"),
            152: ("Gas City Walkway Scene", "Dropped from violet Storage Lockers inside Secret Laboratories on Jupiter", "Jupiter Secret Laboratories"),
            153: ("Gas City Lifts Scene", "Dropped from violet Storage Lockers inside Secret Laboratories on Jupiter", "Jupiter Secret Laboratories"),
            154: ("Gas City Cloud Vista Scene", "Dropped from violet Storage Lockers inside Secret Laboratories on Jupiter", "Jupiter Secret Laboratories"),
            155: ("Gas City Corridors Scene", "Dropped from violet Storage Lockers inside Secret Laboratories on Jupiter", "Jupiter Secret Laboratories"),
            156: ("Gas City Lower Foyer Scene", "Dropped from violet Storage Lockers inside Secret Laboratories on Jupiter", "Jupiter Secret Laboratories"),
            157: ("Gas City Element Distribution Scene", "Dropped from violet Storage Lockers inside Secret Laboratories on Jupiter", "Jupiter Secret Laboratories"),
            158: ("Gas City Regulators Scene", "Dropped from violet Storage Lockers inside Secret Laboratories on Jupiter", "Jupiter Secret Laboratories"),
            159: ("Gas City Elemental Refinement Scene", "Dropped from violet Storage Lockers inside Secret Laboratories on Jupiter", "Jupiter Secret Laboratories"),
            160: ("Grineer Galleon Cargo Scene", "Unlocked by default", "Captura"),
            161: ("Infested Ship Hologram Scene", "Unlocked by default", "Captura"),
            162: ("Orbiter Scene", "Purchased from the Captura Menu", "Captura menu"),
            168: ("Technocyte Coda Stadium Scene", "Vanquish a T echnocyte Coda", "Technocyte Coda"),
            169: ("Perita Manifestation Scene", "Purchased from Roathe's Surplus", "Roathe's Surplus"),
        }
        if index in scene_pages:
            label, acquisition, place = scene_pages[index]
            q = phrase("Captura", label + " " + acquisition)
            kind = "vendor" if "Purchased" in acquisition else ("drop" if "Dropped" in acquisition else "reward")
            text = ("Purchase from Roathe's Surplus." if index == 169 else
                    "Purchase from the Captura menu." if index == 162 else
                    "Earn from violet storage lockers in Jupiter's Secret Laboratories." if 148 <= index <= 159 else
                    "Earn from Deimos Captura containers in Isolation Vaults." if index == 147 else
                    "Vanquish a Technocyte Coda." if index == 168 else
                    "Rewarded weekly by inbox after romancing the listed character." if 132 <= index <= 146 else
                    "Unlocked by default.")
            return {unique: {"name": item["name"], "routes": [route("Captura", q, kind, text, place)]}}, None

    if index in (175, 176):
        page = "Corpus Cipher" if index == 175 else "Corpus Datamass"
        q = sentence(page, "could only be received as rewards" if index == 175 else "found only as rewards")
        return {unique: {"name": item["name"], "routes": [route(page, q, "not_obtainable", "Not currently obtainable: it was an Operation: Arid Fear reward.", "Operation: Arid Fear")] }}, None
    if index == 177:
        q = phrase("Decorations/Orbiter Decorations", "Festive Interior Decorations Available during Christmas from the Market Credits 1")
        return {unique: {"name": item["name"], "routes": [route("Decorations/Orbiter Decorations", q, "vendor", "Purchase from the Market for Credits.", "Market", price={"amount": 1, "currency": "Credits"})]}}, None
    if index == 181:
        q = phrase("Conquera", "Conquera Decoration $30,000 Donation Goal")
        return {unique: {"name": item["name"], "routes": [route("Conquera", q, "not_obtainable", "Not currently obtainable: it was a Conquera event reward.", "Conquera event")] }}, None
    if index in (187, 192):
        needle = "Neon Pride Wings Pride 2024" if index == 187 else "Pride Oro Decoration Pride 2025"
        q = phrase("Decorations/Orbiter Decorations", needle)
        return {unique: {"name": item["name"], "routes": [route("Decorations/Orbiter Decorations", q, "not_obtainable", "Not currently obtainable: it was a Pride event reward.", "Pride event")] }}, None
    if index == 197:
        q = phrase("Decorations/Orbiter Decorations", "Now available from Varzia 7 Aya")
        return {unique: {"name": item["name"], "routes": [route("Decorations/Orbiter Decorations", q, "vendor", "Purchase from Varzia for 7 Aya.", "Varzia", price={"amount": 7, "currency": "Aya"})]}}, None
    if index in (208, 209):
        label = "On-Lyne Running Late Promo Poster" if index == 208 else "On-Lyne Running Late Album Cover Display"
        q = phrase("Decorations/Orbiter Decorations", label + " Standing 5,000")
        return {unique: {"name": item["name"], "routes": [route("Decorations/Orbiter Decorations", q, "vendor", "Purchase from The Hex for 5,000 Standing.", "The Hex", price={"amount": 5000, "currency": "Standing"})]}}, None
    if index == 210:
        q = phrase("Decorations/Orbiter Decorations", "The New War Orbiter Decoration A part of the T ennoCon 2020 Digital Pack")
        return {unique: {"name": item["name"], "routes": [route("Decorations/Orbiter Decorations", q, "not_obtainable", "Not currently obtainable: it was part of a TennoCon digital pack.", "TennoCon")] }}, None
    if index in (224, 225, 227):
        label = {224: "Festive Domestik Ornament", 225: "Festive Endosphere Ornament", 227: "Festive Relic Ornament"}[index]
        q = phrase("Decorations/Orbiter Decorations", label + " T ennobaum 2025 Reward")
        return {unique: {"name": item["name"], "routes": [route("Decorations/Orbiter Decorations", q, "not_obtainable", "Not currently obtainable: it was a Tennobaum reward.", "Tennobaum")] }}, None
    if index == 229:
        q = phrase("Decorations/Orbiter Decorations", "Star Days Heart Frame Display Delivered February 27 to March 2, 2026")
        return {unique: {"name": item["name"], "routes": [route("Decorations/Orbiter Decorations", q, "not_obtainable", "Not currently obtainable: it was a Star Days delivery reward.", "Star Days")] }}, None
    if index == 230:
        q = phrase("Decorations/Orbiter Decorations", "Follie's Shadowgraph Delivered after the conclusion of Operation: Atramentum")
        return {unique: {"name": item["name"], "routes": [route("Decorations/Orbiter Decorations", q, "not_obtainable", "Not currently obtainable: it was an Operation: Atramentum reward.", "Operation: Atramentum")] }}, None
    if index == 290:
        q = phrase("Decorations/Orbiter Decorations", "Dashing Through the Vallis Display T ennobaum 2022 Gift Goal")
        return {unique: {"name": item["name"], "routes": [route("Decorations/Orbiter Decorations", q, "not_obtainable", "Not currently obtainable: it was a Tennobaum gift-goal reward.", "Tennobaum")] }}, None

    if index == 313:
        q = sentence("Orbiter Segments", "The Arsenal Segment is the first segment")
        return {unique: {"name": item["name"], "routes": [route("Orbiter Segments", q, "quest", "Obtain during the Vor's Prize quest.", "Vor's Prize")] }}, None
    if index == 337:
        q = sentence("Orbiter Segments", "The Communications Segment is the second segment")
        return {unique: {"name": item["name"], "routes": [route("Orbiter Segments", q, "quest", "Obtain during the introduction to Spy missions.", "Spy missions")] }}, None
    if index == 320:
        q = sentence("Orbiter Segments", "The Foundry Segment is the third segment")
        return {unique: {"name": item["name"], "routes": [route("Orbiter Segments", q, "quest", "Obtain during the Vor's Prize quest.", "Vor's Prize")] }}, None
    if index == 340:
        q = sentence("Void Relic", "players must complete the Mars Junction mission on Earth")
        return {unique: {"name": item["name"], "routes": [route("Void Relic", q, "quest", "Obtain by completing the Mars Junction mission on Earth.", "Mars Junction")] }}, None
    if index in (351, 352, 353):
        # The archive identifies Devourer as a Plains of Eidolon fragment; the
        # other two are not named by a route in the checked archive pages.
        if index == 351:
            q = phrase("Fragments", "Devourer Planet/Region Scans Required Plains of Eidolon")
            return {unique: {"name": item["name"], "routes": [route("Fragments", q, "drop", "Scan the Devourer fragment in the Plains of Eidolon.", "Plains of Eidolon")] }}, None
    if index in (354, 355):
        label = "A Byte-Sized Adventure" if index == 354 else "Running Late"
        q = phrase("Fragments", label + " 5,000 (The Hex)")
        return {unique: {"name": item["name"], "routes": [route("Fragments", q, "vendor", "Purchase from The Hex for 5,000 Standing.", "The Hex", price={"amount": 5000, "currency": "Standing"})]}}, None
    if index in (356, 357):
        label = ('Protea Prime Theme "Double Time"' if index == 356
                 else 'Varzia Yareli Prime Theme "Waverider"')
        q = phrase("Fragments", label + (" 5 Aya" if index == 357 else " 5 Aya Varzia"))
        return {unique: {"name": item["name"], "routes": [route("Fragments", q, "vendor", "Purchase from Varzia for 5 Aya.", "Varzia", price={"amount": 5, "currency": "Aya"})]}}, None
    if index in (358, 363):
        q = sentence("Syndicate Medallions", "Medallions for faction syndicates can be found on the daily Syndicate Alert missions")
        return {unique: {"name": item["name"], "routes": [route("Syndicate Medallions", q, "drop", "Find it in daily Syndicate Alert missions.", "Syndicate Alerts")] }}, None
    if index == 369:
        q = sentence("Cephalite Resonance", "Cephalite Resonance is a unique resource that drops")
        return {unique: {"name": item["name"], "routes": [route("Cephalite Resonance", q, "not_obtainable", "Not currently obtainable: it was tied to a concluded Nightwave series.", "Glass Fissures")] }}, None

    invasion = {
        370: ("Dera Vandal", "Blueprints and components are a potential Invasion reward"),
        371: ("Dera Vandal", "Blueprints and components are a potential Invasion reward"),
        372: ("Dera Vandal", "Blueprints and components are a potential Invasion reward"),
        373: ("Karak Wraith", "they can now be found as an Invasion reward"),
        374: ("Karak Wraith", "they can now be found as an Invasion reward"),
        375: ("Latron Wraith", "they can now be found as an Invasion reward"),
        376: ("Latron Wraith", "they can now be found as an Invasion reward"),
        377: ("Latron Wraith", "they can now be found as an Invasion reward"),
        379: ("Snipetron Vandal", "blueprint and parts can currently be found as Invasion rewards"),
        380: ("Snipetron Vandal", "blueprint and parts can currently be found as Invasion rewards"),
        381: ("Snipetron Vandal", "blueprint and parts can currently be found as Invasion rewards"),
        382: ("Strun Wraith", "they can now be found as an Invasion reward"),
        383: ("Twin Vipers Wraith", "they can now be found as an Invasion reward"),
        384: ("Twin Vipers Wraith", "they can now be found as an Invasion reward"),
        385: ("Twin Vipers Wraith", "they can now be found as an Invasion reward"),
    }
    if index in invasion:
        page, needle = invasion[index]
        q = sentence(page, needle)
        return {unique: {"name": item["name"], "routes": [route(page, q, "drop", "Earn from Invasion rewards.", "Invasions")] }}, None
    if index == 378:
        q = sentence("Sagek Prime", "Sagek Prime's main and component blueprints are obtained")
        return {unique: {"name": item["name"], "routes": [route("Sagek Prime", q, "reward", "Earn from Rotation A of The Perita Rebellion or buy from Roathe for Maphica.", "The Perita Rebellion")] }}, None

    # Keep the unresolved record explicit rather than inventing a source from a
    # similar decoration, placeholder, event, or internal resource name.
    if index <= 78:
        pages = ["The Hex (Syndicate)", "Decorations/Orbiter Decorations", "1999"]
    elif index <= 130:
        pages = ["Resources", "Conservation", "Helminth"]
    elif index <= 174:
        pages = ["Captura", "Resources", "Conservation"]
    elif index <= 310:
        pages = ["Decorations/Orbiter Decorations", "Decorations", "Conquera", "TennoCon"]
    elif index <= 340:
        pages = ["Orbiter Segments", "Nav Segment", "Void Relic"]
    elif index <= 350:
        pages = ["Conservation"]
    elif index <= 369:
        pages = ["Fragments", "Syndicate Medallions", "Nightwave/Acts"]
    else:
        pages = ["Prime Resurgence", "Void Relic"]
    reason = "no wiki page mentions it"
    if index in (85, 170, 171, 226, 254, 284, 311, 312, 314, 315, 316, 317, 318, 319, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 341, 352, 353, 359, 360, 361, 362, 386, 387, 388):
        reason = "page says nothing about obtaining"
    return None, {unique: unresolved(item["name"], pages, reason)}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--through", type=int, default=389, help="exclusive scope index, for staged runs")
    args = parser.parse_args()
    if UNMAPPED_ARCHIVE_TITLES:
        print(f"archive titles without a mapped PDF: {len(UNMAPPED_ARCHIVE_TITLES)}")
    scope = json.loads(SCOPE.read_text(encoding="utf-8"))
    resolved_path = DATA / "verified-routes.resources.json"
    unresolved_path = DATA / "verified-routes.resources.unresolved.json"
    resolved = load_json(resolved_path)
    unresolved_items = load_json(unresolved_path)
    if set(resolved) & set(unresolved_items):
        raise SystemExit("existing output files overlap; inspect before continuing")

    rounds = [(0, 30), (30, 82), (82, 131), (131, 177), (177, 231), (231, 311), (311, 351), (351, 370), (370, 389)]
    for start, end in rounds:
        if start >= args.through:
            break
        for index in range(start, min(end, args.through, len(scope))):
            item = scope[index]
            unique = item["uniqueName"]
            if unique in resolved or unique in unresolved_items:
                continue
            new_resolved, new_unresolved = build_item(item, index)
            if new_resolved:
                resolved.update(new_resolved)
            if new_unresolved:
                unresolved_items.update(new_unresolved)
        write_json(resolved_path, resolved)
        write_json(unresolved_path, unresolved_items)
        print(f"round {start}:{min(end, args.through)} -> resolved={len(resolved)} unresolved={len(unresolved_items)}")

    if len(resolved) + len(unresolved_items) != len(scope):
        print(f"partial run: {len(resolved) + len(unresolved_items)}/{len(scope)} items written")
    else:
        print(f"complete: resolved={len(resolved)} unresolved={len(unresolved_items)}")


if __name__ == "__main__":
    main()
