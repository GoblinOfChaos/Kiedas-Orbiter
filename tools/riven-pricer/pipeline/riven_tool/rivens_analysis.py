from warframe_marketplace_predictor.shtuff import riven_funcs

if __name__ == "__main__":
    rivens = [
        {
            "name": "Dual Ichor",
            "positives": ["sc", "tox", "ccs"],
            "negatives": ["fin"],
            "re_rolls": 9
        },

        {
            "name": "Acceltra",
            "positives": ["dmg", "ms", "ele"],
            "negatives": ["ammo"],
            "re_rolls": 9
        },
        {
            "name": "Afentis",
            "positives": ["ms", "dmg", "mag"],
            "negatives": [""],
            "re_rolls": 9
        },
        {
            "name": "Anku",
            "positives": ["sc", "dmg", "cd"],
            "negatives": ["heavy"],
            "re_rolls": 9
        },
        {
            "name": "Caustacyst",
            "positives": ["ele", "cc", "cd"],
            "negatives": ["sc"],
            "re_rolls": 9
        },
        {
            "name": "Convectrix",
            "positives": ["ms", "ele", "dmg"],
            "negatives": ["slash"],
            "re_rolls": 9
        },
        {
            "name": "Dark Split-Sword",
            "positives": ["range", "ele", ""],
            "negatives": ["ccs"],
            "re_rolls": 9
        },
        {
            "name": "Dual Ichor",
            "positives": ["cc", "range", ""],
            "negatives": ["stat_dur"],
            "re_rolls": 9
        },
        {
            "name": "Dual Toxocyst",
            "positives": ["cc", "tox", "punch"],
            "negatives": ["corp"],
            "re_rolls": 9
        },
        {
            "name": "Furax",
            "positives": ["speed", "range", ""],
            "negatives": ["heavy"],
            "re_rolls": 9
        },
        {
            "name": "Nukor",
            "positives": ["mag", "ms", "tox"],
            "negatives": ["inf"],
            "re_rolls": 9
        },
        {
            "name": "Phenmor",
            "positives": ["mag", "ms", "proj"],
            "negatives": [""],
            "re_rolls": 9
        },
        {
            "name": "Praedos",
            "positives": ["cc", "slash", "dmg"],
            "negatives": [""],
            "re_rolls": 9
        },
        {
            "name": "Rubico",
            "positives": ["cd", "cold", "tox"],
            "negatives": ["zoom"],
            "re_rolls": 3
        },
        {
            "name": "Sporothrix",
            "positives": ["ms", "tox", "mag"],
            "negatives": [""],
            "re_rolls": 9
        },
        {
            "name": "Sybaris",
            "positives": ["speed", "cc", "dmg"],
            "negatives": ["grin"],
            "re_rolls": 9
        },
        {
            "name": "Tenora",
            "positives": ["cd", "grin", "tox"],
            "negatives": ["sd"],
            "re_rolls": 3
        },
        {
            "name": "Zenith",
            "positives": ["cc", "cd", "ms"],
            "negatives": ["ammo"],
            "re_rolls": 4
        },

    ]

    riven_funcs.analyze_rivens(rivens)
