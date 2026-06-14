import itertools
from functools import lru_cache
from typing import List, Dict, Any, Tuple, Union

import numpy as np
import pandas as pd
from prettytable import PrettyTable

from warframe_marketplace_predictor.shtuff.data_handler import DataHandler
from warframe_marketplace_predictor.shtuff.make_prediction import PricePredictor


def calculate_kuva_cost(re_rolls: int) -> int:
    return {
        0: 900,
        1: 1000,
        2: 1200,
        3: 1400,
        4: 1700,
        5: 2000,
        6: 2350,
        7: 2750,
        8: 3150,
        9: 3500
    }.get(re_rolls, 3500)


def calculate_expected_price_on_reroll(weapon_prices_pdf, listing_price):
    # Reconstruct the prices and probabilities
    weapon_prices = np.array(list(weapon_prices_pdf.keys()), dtype=np.float32)
    weapon_prices_pdf_values = np.array(list(weapon_prices_pdf.values()), dtype=np.float32)
    # Sort the prices and corresponding pdf values
    sorted_indices = np.argsort(weapon_prices)
    weapon_prices = weapon_prices[sorted_indices]
    weapon_prices_pdf_values = weapon_prices_pdf_values[sorted_indices]
    weapon_prices_pdf_values /= np.sum(weapon_prices_pdf_values)

    # Compute cumulative distribution function (CDF)
    prices_cdf = np.cumsum(weapon_prices_pdf_values)
    prices_cdf /= prices_cdf[-1]  # Normalize to make sure it sums to 1

    # Find the position of the listing price in the weapon's price distribution
    price_position = np.searchsorted(weapon_prices, listing_price, side="right")

    if price_position >= len(weapon_prices) - 1:
        probability_stagnant_roll = 1.0
        expected_improved_listing_price = listing_price
    else:
        probability_stagnant_roll = prices_cdf[price_position]
        improved_prices = weapon_prices[price_position + 1:]
        improved_prices_pdf = weapon_prices_pdf_values[price_position + 1:]
        improved_prices_pdf /= np.sum(improved_prices_pdf)
        expected_improved_listing_price = np.dot(improved_prices, improved_prices_pdf)

    expected_price_per_reroll = ((probability_stagnant_roll * listing_price)
                                 + (1 - probability_stagnant_roll) * expected_improved_listing_price)

    return expected_price_per_reroll, probability_stagnant_roll


def get_possible_rivens(item_name: str, re_rolled: bool, attributes: List[str] = None,
                        use_official_attributes: bool = False, order_matters: bool = True,
                        df_format: bool = False) -> Union[List[Dict[str, Any]], pd.DataFrame]:
    """
    Generate all possible rivens for a given item based on its attributes.
    Utilizes caching to avoid recomputing rivens for previously seen attribute sets.

    :param item_name: The name of the item.
    :param re_rolled: Boolean indicating if the riven has been re-rolled.
    :param attributes: Optional list of attributes. If None, attributes are fetched based on the item.
    :param use_official_attributes: Use the official attribute names instead of the training/url names.
    :param order_matters: Used to determine whether to get permutations (for analysis) or combinations (for estimates).
    :param df_format: Optionally return it in a dataframe format.
    :return: A list of dictionaries representing possible rivens.
    """
    if attributes is None:
        data_handler = DataHandler()
        attributes = data_handler.get_weapon_specific_attributes(item_name)

    if use_official_attributes:
        data_handler = DataHandler()
        attributes = [data_handler.get_official_attribute_name(x) for x in attributes]

    # Sort and convert attributes to a tuple to ensure consistency and hashability
    attributes_sorted = tuple(sorted(attributes))

    # Retrieve cached rivens based on attributes
    base_rivens = _compute_rivens_cached(attributes_sorted, order_matters)

    # Add 'name' and 're_rolled' to each riven
    rivens = [
        {
            **riven,
            "name": item_name,
            "re_rolled": re_rolled
        }
        for riven in base_rivens
    ]

    if df_format:
        for r in rivens:
            for i, p in enumerate(r["positives"], start=1):
                r[f"positive{i}"] = p
            del r["positives"]
            r["negative"] = r["negatives"][0] if r["negatives"] else None
            del r["negatives"]
        return pd.DataFrame(rivens)

    return rivens


@lru_cache(maxsize=64)
def _compute_rivens_cached(attributes: Tuple[str, ...], order_matters: bool = True) -> List[Dict[str, Any]]:
    """
    Compute all possible rivens based on a sorted tuple of attributes.
    This function is cached to optimize performance for repeated attribute sets.

    :param attributes: A sorted tuple of attribute strings.
    :param order_matters: Used to determine whether to get permutations (for analysis) or combinations (for estimates).
    :return: A list of dictionaries representing possible rivens without item-specific details.
    """
    rivens = []

    elementals = {"heat_damage", "cold_damage", "electric_damage", "toxin_damage",
                  "Heat", "Cold", "Electricity", "Toxin"}

    # Define possible counts of positive and negative attributes
    combinations = [(2, 0), (2, 1), (3, 0), (3, 1)]

    for positive_count, negative_count in combinations:
        total_attributes = positive_count + negative_count

        # Generate all unique combinations without considering order
        attribute_groups = itertools.permutations(attributes, r=total_attributes)
        for attribute_group in attribute_groups:
            positives = attribute_group[:positive_count]
            negatives = attribute_group[positive_count:] if negative_count > 0 else tuple()

            # Skip if any elemental attribute is negative
            if any(attr in elementals for attr in negatives):
                continue

            riven = {
                "positives": positives,
                "negatives": negatives
            }
            rivens.append(riven)

    # Filter out duplicates
    riven_ids = dict()
    if not order_matters:
        for riven in rivens:
            riven_id = "p".join(sorted(riven["positives"])) + "n".join(sorted(riven["negatives"]))
            if riven_id in riven_ids:
                continue
            riven_ids[riven_id] = riven

    if order_matters:
        return rivens
    else:
        return list(riven_ids.values())


def generate_table(rivens: List[Dict[str, Any]]) -> None:
    data_handler = DataHandler()
    rivens.sort(key=lambda x: x["expected_profit_per_kuva"], reverse=True)
    kuva_scale = 1000

    thingy = {
        "name": ("Name", "Weapon Name", lambda x: x),

        "weapon_ranking": ("Rank", "Weapon Ranking", lambda x: x),
        "weapon_percentile": ("WP", "Weapon Ranking Percentile", lambda x: f"{100 * x:.2f}"),
        "global_percentile": ("GP", "Global Ranking Percentile", lambda x: f"{x:.2f}"),

        "listing_price": ("List", "Predicted Listing Price", lambda x: f"{x:.0f}"),
        "average_list_price": ("AvgList", "Weapon Average Listing Price", lambda x: f"{x:.0f}"),
        "expected_price_on_reroll": ("EList", "Expected Listing Price on Reroll", lambda x: f"{x:.0f}"),
        "expected_profit_on_reroll": ("EProf", "Expected Listing Profit on Reroll", lambda x: f"{x:.0f}"),
        "expected_profit_per_kuva": (f"EProf{kuva_scale}K", f"Expected Listing Profit per {kuva_scale} Kuva",
                                     lambda x: f"{kuva_scale * x:.2f}"),

        "positives": ("Pos", "Positives", lambda x: ", ".join(map(data_handler.get_official_attribute_name, x))),
        "negatives": ("Neg", "Negatives", lambda x: ", ".join(map(data_handler.get_official_attribute_name, x))),
        "re_rolls": ("Rerolls", "Number of Rerolls", lambda x: x),
    }

    keys_order = list(rivens[0].keys())

    key_table = PrettyTable()
    key_table.field_names = ["Key", "Meaning"]
    for key in keys_order:
        key_table.add_row([thingy[key][0], thingy[key][1]])

    print(key_table)

    table = PrettyTable()
    table.field_names = [thingy[key][0] for key in keys_order]
    for riven in rivens:
        table.add_row([thingy[key][-1](riven[key]) for key in riven])

    print(table)


def analyze_rivens(rivens: List[Dict[str, Any]]) -> None:
    data_handler = DataHandler()
    price_predictor = PricePredictor()

    # Check and validate riven attributes
    if not all(map(price_predictor.is_valid, rivens)):
        return

    processed_rivens = []

    # Predict the listing prices
    listing_prices = price_predictor.predict(rivens, verbose=True)
    for riven, listing_price in zip(rivens, listing_prices):
        # Get weapon-related info from precomputed data
        weapon_name = riven["name"]
        rank_data = data_handler.get_weapon_ranking_information(weapon_name)
        rank = rank_data["rank"]
        expected_value = rank_data["expected_value"]
        weapon_ranking = f"{rank}"

        # Get the price distribution for the weapon
        weapon_prices_pdf = rank_data["price_distribution"]
        expected_price_on_reroll, probability_stagnant_roll = (
            calculate_expected_price_on_reroll(weapon_prices_pdf, listing_price))

        expected_profit_on_reroll = expected_price_on_reroll - listing_price

        re_rolls = riven["re_rolls"]
        kuva_cost = calculate_kuva_cost(re_rolls)
        expected_profit_per_kuva = expected_profit_on_reroll / kuva_cost

        # Get global price percentile
        global_percentile = data_handler.get_global_price_percentile(listing_price)

        # Get correctly named positives and negatives
        positives = [data_handler.get_proper_attribute_name(x) for x in riven["positives"]]
        negatives = [data_handler.get_proper_attribute_name(x) for x in riven["negatives"]]

        processed_riven = {
            "name": weapon_name,

            "weapon_ranking": weapon_ranking,
            "weapon_percentile": probability_stagnant_roll,
            "global_percentile": global_percentile,

            "listing_price": listing_price,
            "average_list_price": expected_value,
            "expected_price_on_reroll": expected_price_on_reroll,
            "expected_profit_on_reroll": expected_profit_on_reroll,
            "expected_profit_per_kuva": expected_profit_per_kuva,

            "positives": positives,
            "negatives": negatives,
            "re_rolls": re_rolls,
        }

        processed_rivens.append(processed_riven)

    generate_table(processed_rivens)

