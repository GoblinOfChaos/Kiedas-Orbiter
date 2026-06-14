from typing import List, Dict, Any, Optional

from warframe_marketplace_predictor.filepaths import *
from warframe_marketplace_predictor.shtuff.storage_handling import read_json


class DataHandler:

    def __init__(self):
        self.items_data_mapped_by_item_name = None
        self.items_data_mapped_by_url_name = None
        self.name_inverse_mapping = None
        self.attributes_data = None
        self.attribute_name_shortcuts = None
        self.weapon_ranking_information = None
        self.global_price_freq = None
        self.ig_weapon_stats = None
        self.developer_summary_stats = None

        self.variants = None

    def load_items(self):
        """ Load items data and generate mappings. """
        if self.items_data_mapped_by_item_name is None:
            self.items_data_mapped_by_item_name = read_json(items_data_file_path)
            self.items_data_mapped_by_url_name = {v["url_name"]: v for v in
                                                  self.items_data_mapped_by_item_name.values()}
            self.name_inverse_mapping = {k: v["url_name"] for k, v in self.items_data_mapped_by_item_name.items()}
            self.name_inverse_mapping.update({v: k for k, v in self.name_inverse_mapping.items()})

    def load_attributes(self):
        """ Load attributes data and generate attribute shortcuts. """
        if self.attributes_data is None or self.attribute_name_shortcuts is None:
            if attributes_data_file_path and attribute_name_shortcuts_file_path:
                self.attributes_data = read_json(attributes_data_file_path)
                self.attribute_name_shortcuts = read_json(attribute_name_shortcuts_file_path)
                self.attribute_name_shortcuts.update({v: v for v in self.attribute_name_shortcuts.values()})

    def load_weapon_ranking_information(self):
        """ Load weapon ranking information data. """
        if self.weapon_ranking_information is None:
            self.weapon_ranking_information = read_json(weapon_ranking_information_file_path)

    def load_global_price_freq(self):
        """ Load global price frequency data. """
        if self.global_price_freq is None:
            self.global_price_freq = read_json(global_price_freq_file_path)

    def load_ig_weapon_stats(self):
        """ Load in-game weapon statistics data. """
        if self.ig_weapon_stats is None:
            self.ig_weapon_stats = read_json(ig_weapon_stats_file_path)

    def load_developer_summary_stats(self):
        """ Load developer summary statistics data. """
        if self.developer_summary_stats is None:
            self.load_items()
            sum_stats = dict()
            riven_stats_data = read_json(developer_summary_stats_file_path)
            for riven_type in riven_stats_data.values():
                for weapon_item_name, riven_stats in riven_type.items():
                    if weapon_item_name not in self.items_data_mapped_by_item_name:
                        continue
                    weapon_url_name = self.get_url_name(weapon_item_name)
                    sum_stats[weapon_url_name] = riven_stats
            self.developer_summary_stats = sum_stats

    def get_item_names(self) -> List[str]:
        self.load_items()
        return sorted(self.items_data_mapped_by_item_name.keys())

    def get_url_names(self) -> List[str]:
        self.load_items()
        return sorted(self.items_data_mapped_by_url_name.keys())

    def get_attribute_names(self) -> List[str]:
        self.load_attributes()
        return sorted(self.attributes_data.keys())

    def get_attribute_shortcuts(self) -> List[str]:
        self.load_attributes()
        return sorted(self.attribute_name_shortcuts.keys())

    def get_proper_attribute_name(self, attribute_name: str) -> str:
        self.load_attributes()
        return self.attribute_name_shortcuts[attribute_name]

    def get_url_name(self, weapon_name: str) -> str:
        self.load_items()
        if weapon_name in self.items_data_mapped_by_item_name:
            return self.name_inverse_mapping[weapon_name]
        elif weapon_name in self.items_data_mapped_by_url_name:
            return weapon_name
        else:
            print("Incorrect weapon name. Displaying possible names:")
            for x in self.items_data_mapped_by_item_name.keys():
                if x[:2].lower() == weapon_name[:2].lower():
                    print(x)
            raise ValueError(f"{weapon_name} does not exist.")

    def get_item_name(self, weapon_name: str) -> str:
        self.load_items()
        if weapon_name in self.items_data_mapped_by_url_name:
            return self.name_inverse_mapping[weapon_name]
        elif weapon_name in self.items_data_mapped_by_item_name:
            return weapon_name
        else:
            print("Incorrect weapon name. Displaying possible names:")
            for x in self.items_data_mapped_by_item_name.keys():
                if x[:2].lower() == weapon_name[:2].lower():
                    print(x)
            raise ValueError(f"{weapon_name} does not exist.")

    def weapon_exists(self, weapon_name: str) -> bool:
        self.load_items()
        return self.get_url_name(weapon_name) in self.items_data_mapped_by_url_name

    def is_valid_attribute_shortcut(self, attribute_name: str) -> bool:
        self.load_attributes()
        return attribute_name in self.attribute_name_shortcuts

    def get_weapon_specific_attributes(self, weapon_name: str) -> List[str]:
        self.load_items()
        weapon_name = self.get_url_name(weapon_name)
        weapon_group = self.items_data_mapped_by_url_name[weapon_name]["group"]

        melee_attributes = ["damage_vs_corpus", "damage_vs_grineer", "damage_vs_infested", "cold_damage",
                            "channeling_damage", "channeling_efficiency", "combo_duration", "critical_chance",
                            "critical_chance_on_slide_attack", "critical_damage", "base_damage_/_melee_damage",
                            "electric_damage", "heat_damage", "finisher_damage", "fire_rate_/_attack_speed",
                            "impact_damage", "toxin_damage", "puncture_damage", "range", "slash_damage",
                            "status_chance", "status_duration", "chance_to_gain_extra_combo_count",
                            "chance_to_gain_combo_count"]
        gun_attributes = ["ammo_maximum", "damage_vs_corpus", "damage_vs_grineer", "damage_vs_infested", "cold_damage",
                          "critical_chance", "critical_damage", "base_damage_/_melee_damage", "electric_damage",
                          "heat_damage", "fire_rate_/_attack_speed", "projectile_speed", "impact_damage",
                          "magazine_capacity", "multishot", "toxin_damage", "punch_through", "puncture_damage",
                          "reload_speed", "slash_damage", "status_chance", "status_duration", "recoil", "zoom"]

        melee_groups = ["zaw", "melee"]
        gun_groups = ["kitgun", "sentinel", "archgun", "primary", "secondary"]

        if weapon_group in melee_groups:
            return melee_attributes.copy()
        if weapon_group in gun_groups:
            return gun_attributes.copy()

    def get_official_attribute_name(self, attribute_url_name: str) -> str:
        self.load_attributes()
        if attribute_url_name == "<NONE>":
            return ""
        return self.attributes_data[attribute_url_name]["effect"]

    def get_weapon_ranking_information(self, weapon_name: str) -> Dict[str, Any]:
        self.load_weapon_ranking_information()
        weapon_name = self.get_url_name(weapon_name)
        rank_data = {"total_ranks": len(self.weapon_ranking_information)}
        rank_data.update(self.weapon_ranking_information[weapon_name])
        return rank_data

    def get_global_price_percentile(self, weapon_price: float) -> float:
        self.load_global_price_freq()
        total_freq = sum(self.global_price_freq.values())
        cumulative_freq = sum(freq for price, freq in self.global_price_freq.items() if float(price) <= weapon_price)
        percentile = (cumulative_freq / total_freq) * 100 if total_freq > 0 else 0.0
        return percentile

    def determine_variants(self) -> None:
        if self.variants:
            return

        self.load_ig_weapon_stats()
        names: List[str] = list(self.ig_weapon_stats)

        prefixes = {"Carmine", "Ceti", "Kuva", "Prisma", "Rakta", "Sancti", "Secura", "Synoid", "Telos", "Tenet",
                    "Vaykor"}
        suffixes = {"Prime", "Vandal", "Wraith"}

        variants = dict()
        for name in names:
            has_prefix = any(prefix in name for prefix in prefixes)
            has_suffix = any(suffix in name for suffix in suffixes)
            if not has_prefix and not has_suffix:
                variants[name] = []

        for name in names:
            if name not in variants:
                base_name = " ".join(word for word in name.split() if word not in prefixes and word not in suffixes)
                if base_name not in variants:
                    variants[name] = []
                else:
                    variants[base_name].append(name)

        self.variants = variants

    def get_most_common_variant(self, weapon_name: str) -> Optional[str]:
        self.load_items()
        weapon_name = self.get_item_name(weapon_name)

        subjective_best_variants = {
            "Braton": "Braton Vandal",
            "Gorgon": "Prisma Gorgon",
            "Karak": "Kuva Karak",
            "Lato": "Lato",
            "Latron": "Latron Prime",
            "Machete": "Machete Wraith",
            "Penta": "Secura Penta",
            "Skana": "Prisma Skana",
            "Strun": "Strun Prime",
            "Tigris": "Tigris Prime",
        }
        if weapon_name in subjective_best_variants:
            return subjective_best_variants[weapon_name]

        self.determine_variants()

        if weapon_name not in self.variants:
            return None

        if not self.variants[weapon_name]:
            return weapon_name

        for variant in self.variants[weapon_name]:
            for x in ["Prime", "Kuva", "Tenet"]:
                if x in variant:
                    return variant

        return self.variants[weapon_name][-1]

    def get_disposition(self, weapon_name: str) -> Optional[int]:
        self.load_ig_weapon_stats()
        weapon_name = self.get_url_name(weapon_name)

        best_variant = self.get_most_common_variant(weapon_name)
        if best_variant and "disposition" in self.ig_weapon_stats[best_variant]:
            return self.ig_weapon_stats[best_variant]["disposition"]

        dispositions = {
            "Verglas": 4,
            "Akaten": 3,
            "Lacerten": 3,
            "Helstrum": 3,
            "Deconstructor": 4,
            "AX-52": 1,
            "Batoten": 3,
            "Laser Rifle": 4,
            "Vermisplicer": 3,
            "Vulklok": 4,
            "Tombfinger": 3,
            "Amanata": 1,
            "Sweeper": 3,
            "Burst Laser": 5,
            "Vulcax": 3,
            "Deth Machine Rifle": 5,
            "Sporelacer": 3,
            "Higasa": 1,
            "Stinger": 5,
            "Dark Split-Sword": 4,
            "Multron": 3,
            "Artax": 3,
            "Tazicor": 3,
            "Gaze": 3,
            "Cryotra": 3,
            "Catchmoon": 3,
            "Rattleguts": 3,
        }
        if (item_name := self.get_item_name(weapon_name)) in dispositions:
            return dispositions[item_name]

        return None

    def weapon_has_incarnon(self, weapon_name: str) -> bool:
        self.load_items()
        weapon_name = self.get_url_name(weapon_name)
        incarnons = {
            # Week 1 (A)
            "Braton", "Lato", "Skana", "Paris", "Kunai",
            # Week 2 (B)
            "Boar", "Gammacor", "Angstrum", "Gorgon", "Anku",
            # Week 3 (C)
            "Bo", "Latron", "Furis", "Furax", "Strun",
            # Week 4 (D)
            "Lex", "Magistar", "Boltor", "Bronco", "Ceramic Dagger",
            # Week 5 (E)
            "Torid", "Dual Toxocyst", "Dual Ichor", "Miter", "Atomos",
            # Week 6 (F)
            "Ack & Brunt", "Soma", "Vasto", "Nami Solo", "Burston",
            # Week 7 (G)
            "Zylok", "Sibear", "Dread", "Despair", "Hate",
            # Week 8 (H)
            "Dera", "Sybaris", "Cestra", "Sicarus", "Okina",
            # Zariman
            "Felarx", "Innodem", "Laetum", "Phenmor", "Praedos",
            # Sanctum Anatomica
            "Onos", "Ruvox",
        }

        return self.get_item_name(weapon_name) in incarnons

    def get_summary_stats(self, name: str, rolled_status: str = "rerolled") -> Dict:
        name = self.get_url_name(name)
        return self.developer_summary_stats.get(name, {}).get(rolled_status)

    def get_weapon_group(self, name: str) -> str:
        self.load_developer_summary_stats()
        name = self.get_url_name(name)
        de_weapon_group = summary_stats["itemType"].split()[0] if (summary_stats := self.get_summary_stats(name)) \
            else ""
        item_name = self.get_item_name(name)
        marketplace_weapon_group = self.items_data_mapped_by_item_name[item_name]["group"]
        if marketplace_weapon_group == "sentinel":
            weapon_group = "Sentinel"
        elif de_weapon_group == "Shotgun":
            weapon_group = "Shotgun"
        elif de_weapon_group == "":
            weapon_group = {
                "primary": "Rifle",
                "secondary": "Pistol",
                "melee": "Melee",

            }.get(marketplace_weapon_group, marketplace_weapon_group.title())
        else:
            weapon_group = de_weapon_group
        return weapon_group

    def get_groups(self):
        return sorted(set(map(self.get_weapon_group, self.get_url_names())))

    def get_popularity(self, name: str, rolled_status: str = "rerolled") -> Optional[float]:
        self.load_developer_summary_stats()
        name = self.get_item_name(name)

        if (summary_stats := self.get_summary_stats(name, rolled_status)) is None:
            return None

        return summary_stats.get("pop", 0)

    def get_average_trade_price(self, name: str, rolled_status: str = "rerolled") -> Optional[float]:
        self.load_developer_summary_stats()
        name = self.get_url_name(name)

        if (summary_stats := self.get_summary_stats(name, rolled_status)) is None:
            return None

        return summary_stats.get("avg", 0)
