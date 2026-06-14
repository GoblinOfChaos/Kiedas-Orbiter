#!/usr/bin/env python3
"""
Generate weapon ranking information using ONNX model (no TensorFlow needed).

Usage:
    python setup_weapon_information_onnx.py [--data-dir DIR]

Defaults to the pipeline/ directory alongside this script.

Produces:
    {data_dir}/data_files/weapon_ranking_information.json
    {data_dir}/data_files/global_price_freq.json
"""

import json, itertools, collections, sys, argparse
from pathlib import Path
import numpy as np
import onnxruntime as ort

ELEMENTALS = {'heat_damage', 'cold_damage', 'electric_damage', 'toxin_damage'}
COMBO_TYPES = [(2, 0), (2, 1), (3, 0), (3, 1)]

MELEE_ATTRS = [
    'damage_vs_corpus', 'cold_damage', 'critical_chance', 'critical_damage',
    'base_damage_/_melee_damage', 'fire_rate_/_attack_speed', 'impact_damage',
    'toxin_damage', 'puncture_damage', 'range', 'slash_damage', 'status_chance',
    'status_duration', 'combo_duration', 'channeling_damage', 'channeling_efficiency',
    'electric_damage', 'heat_damage', 'finisher_damage', 'critical_chance_on_slide_attack',
    'damage_vs_grineer', 'damage_vs_infested', 'chance_to_gain_extra_combo_count',
    'chance_to_gain_combo_count',
]
GUN_ATTRS = [
    'ammo_maximum', 'damage_vs_corpus', 'damage_vs_grineer', 'damage_vs_infested',
    'cold_damage', 'critical_chance', 'critical_damage', 'base_damage_/_melee_damage',
    'electric_damage', 'heat_damage', 'fire_rate_/_attack_speed', 'projectile_speed',
    'impact_damage', 'magazine_capacity', 'multishot', 'toxin_damage', 'punch_through',
    'puncture_damage', 'reload_speed', 'slash_damage', 'status_chance', 'status_duration',
    'recoil', 'zoom',
]
MELEE_GROUPS = {'melee', 'zaw'}
GUN_GROUPS = {'primary', 'secondary', 'shotgun', 'pistol', 'archgun', 'sentinel', 'kitgun'}


def enumerate_combos(attrs):
    for pc, nc in COMBO_TYPES:
        for grp in itertools.combinations(attrs, pc + nc):
            p = grp[:pc]
            n = grp[pc:]
            if any(a in ELEMENTALS for a in n):
                continue
            yield list(p), list(n)


def get_attrs(weapon_url, items):
    g = items.get(weapon_url, {}).get('group', '')
    if g in MELEE_GROUPS:
        return MELEE_ATTRS
    if g in GUN_GROUPS:
        return GUN_ATTRS
    return []


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-dir', help='Base directory containing data_files/ and training/model_data/')
    args = parser.parse_args()

    if args.data_dir:
        base = Path(args.data_dir)
    else:
        base = Path(__file__).resolve().parent / "pipeline"
        if not (base / "data_files").exists():
            sys.exit('Data directory not found. Pass --data-dir or run from tools/riven-pricer/.')

    DATA = base / 'data_files'
    MODEL = base / 'training' / 'model_data'
    ONNX = MODEL / 'price_model.onnx'

    for p in [ONNX, DATA / 'items_data.json', MODEL / 'weapon_vocab.json', MODEL / 'attr_vocab.json']:
        if not p.exists():
            sys.exit(f'Required file not found: {p}')

    print('Loading model...')
    session = ort.InferenceSession(str(ONNX))
    with open(MODEL / 'weapon_vocab.json') as f:
        wv = json.load(f)
    with open(MODEL / 'attr_vocab.json') as f:
        av = json.load(f)
    with open(DATA / 'items_data.json') as f:
        items = json.load(f)
    wi = {n: i for i, n in enumerate(wv)}
    ai = {n: i for i, n in enumerate(av)}
    mask = wi.get('<NONE>', 0)

    weapons = sorted(items.keys())
    print(f'{len(weapons)} weapons')

    ranking = {}
    all_p = []
    all_w = []
    t0 = __import__('time').time()

    for idx, wu in enumerate(weapons, 1):
        attrs = get_attrs(wu, items)
        if not attrs:
            continue
        combos = list(enumerate_combos(attrs))
        if not combos:
            continue
        n = len(combos)

        w = np.full((n, 1), wi.get(wu, mask), dtype=np.int32)
        r = np.full((n, 1), 0.0, dtype=np.float32)
        a = np.zeros((n, 4), dtype=np.int32)
        for i, (p, neg) in enumerate(combos):
            a[i, 0] = ai.get(p[0] if len(p) >= 1 else '<NONE>', mask)
            a[i, 1] = ai.get(p[1] if len(p) >= 2 else '<NONE>', mask)
            a[i, 2] = ai.get(p[2] if len(p) >= 3 else '<NONE>', mask)
            a[i, 3] = ai.get(neg[0] if len(neg) >= 1 else '<NONE>', mask)

        out = session.run(['output'], {'weapon_idx': w, 're_rolled': r, 'attr_indices': a})
        prices = np.expm1(out[0].flatten())

        ctypes = [f'p{len(p)}n{len(n)}' for p, n in combos]
        freq = collections.Counter(ctypes)
        target_count = max(freq.values())
        weights = np.array([target_count / freq[ct] for ct in ctypes], dtype=np.float32)
        tw = np.sum(weights)
        pdf = weights / tw if tw > 0 else weights
        ev = float(np.dot(pdf, prices))

        sidx = np.argsort(prices)
        ps = prices[sidx]
        ws = weights[sidx]
        nb = min(200, len(ps) // 2) if len(ps) >= 4 else 1
        dist = {}
        bs = max(len(ps) // nb, 1)
        for i in range(0, len(ps), bs):
            chunk = ps[i:i + bs]
            wch = ws[i:i + bs]
            exp = float(np.average(chunk, weights=wch)) if wch.sum() > 0 else float(chunk.mean())
            dist[exp] = float(np.sum(wch))

        ranking[wu] = {
            'expected_value': ev,
            'price_distribution': dist,
            'attribute_importance': {'positives': {}, 'negatives': {}},
        }
        all_p.extend(prices.tolist())
        all_w.extend(weights.tolist())

        if idx % 100 == 0:
            elapsed = __import__('time').time() - t0
            print(f'  {idx}/{len(weapons)} ({elapsed:.1f}s)')

    ranking = dict(sorted(ranking.items(), key=lambda x: -x[1]['expected_value']))
    for i, (k, v) in enumerate(ranking.items(), 1):
        v['rank'] = i

    ap = np.array(all_p)
    aw = np.array(all_w)
    sidx = np.argsort(ap)
    ap = ap[sidx]
    aw = aw[sidx]
    nb = min(100, len(ap) // 2) if len(ap) >= 4 else 1
    gdist = {}
    bs = max(len(ap) // nb, 1)
    for i in range(0, len(ap), bs):
        chunk = ap[i:i + bs]
        wch = aw[i:i + bs]
        exp = float(np.average(chunk, weights=wch)) if wch.sum() > 0 else float(chunk.mean())
        gdist[exp] = float(np.sum(wch))

    with open(DATA / 'weapon_ranking_information.json', 'w') as f:
        json.dump(ranking, f)
    with open(DATA / 'global_price_freq.json', 'w') as f:
        json.dump(gdist, f)

    print(f'Saved: {DATA}/weapon_ranking_information.json ({len(ranking)} weapons)')
    print(f'Saved: {DATA}/global_price_freq.json')
    print(f'Done in {__import__("time").time() - t0:.1f}s')


if __name__ == '__main__':
    main()
