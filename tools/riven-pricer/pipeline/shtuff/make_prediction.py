from typing import Dict, Any, Union, Iterable

import numpy as np
import pandas as pd
import tensorflow as tf
from tqdm import tqdm

from warframe_marketplace_predictor.filepaths import *
from warframe_marketplace_predictor.shtuff.data_handler import DataHandler
from warframe_marketplace_predictor.training.preprocessors.price_model_preprocessor import Preprocessor


class PricePredictor:
    def __init__(self, model_predict_batch_size: int = 256):
        """
        Initializes the PricePredictor class, loading the preprocessor, model,
        attribute name shortcuts, and item name to URL mapping only once.
        """
        self.model_predict_batch_size = model_predict_batch_size
        self.data_handler = DataHandler()

        # Load the preprocessor and model once
        self.preprocessor = Preprocessor().load()
        self.model: tf.keras.Model = tf.keras.models.load_model(price_model_model_file_path)
        self._mask_token = "<NONE>"

    def is_valid(self, item: Dict[str, Any]) -> bool:
        """
        Checks if the provided attribute names (positives + negatives) are valid by comparing them against the shortcuts.

        Args:
            item (Dict[str, Any]): A dictionary containing the item's "positives" and "negatives" attributes.

        Returns:
            bool: True if all attribute names are valid, False otherwise.
        """
        if not self.data_handler.weapon_exists(item["name"]):
            print(f"{item['name']} is not a valid weapon name")
            print("Name suggestions:")
            print([k for k in sorted(self.data_handler.get_item_names())
                   if k and item["name"] and (k[0]).lower() == (item["name"][0]).lower()])
            return False

        if "re_rolls" in item:
            if not isinstance(item["re_rolls"], int):
                print("'re_rolls' must be an integer.")
                return False
            item["re_rolled"] = item["re_rolls"] > 0

        if "re_rolled" not in item or not isinstance(item["re_rolled"], bool):
            print("'re_rolled' is missing or incorrectly formatted.")
            return False

        # Combine the positives and negatives from the item to validate
        attribute_names = item["positives"] + item["negatives"]
        for attribute_name in attribute_names:
            if not self.data_handler.is_valid_attribute_shortcut(attribute_name):
                print(f"{attribute_name} is not a valid attribute.")
                print("Did you mean:")
                print([k for k in sorted(self.data_handler.get_attribute_shortcuts())
                       if k and attribute_name and k[0] == attribute_name[0]])
                return False

        return True

    def prepare(self, item: Dict[str, Any]) -> Dict[str, Any]:
        res = {
            "weapon_url_name": self.data_handler.get_url_name(item["name"]),
            "positive1": item["positives"][0] if len(item["positives"]) >= 1 else self._mask_token,
            "positive2": item["positives"][1] if len(item["positives"]) >= 2 else self._mask_token,
            "positive3": item["positives"][2] if len(item["positives"]) >= 3 else self._mask_token,
            "negative": item["negatives"][0] if len(item["negatives"]) >= 1 else self._mask_token,
            "re_rolled": item["re_rolled"],
            # "group": self.data_handler.get_weapon_group(self.data_handler.get_url_name(item["name"])),
            # "has_incarnon": self.data_handler.weapon_has_incarnon(self.data_handler.get_url_name(item["name"])),
            # "avg_trade_price": self.data_handler.get_average_trade_price(
            #     self.data_handler.get_url_name(item["name"]), rolled_status="rerolled"),
            # "disposition": self.data_handler.get_disposition(self.data_handler.get_url_name(item["name"])),
        }
        return res

    def get_prepared_data(self, data: Iterable[Dict[str, Any]], skip_validation: bool, verbose: bool) -> pd.DataFrame:
        # If data is a single dictionary, wrap it in a list for consistent processing
        if isinstance(data, dict):
            data = [data]

        prepared_data = []

        iterator = tqdm(data, desc="Preparing data", unit="riven") if verbose else data
        for item in iterator:

            # Check for invalid names or shortcuts
            if not skip_validation and not self.is_valid(item):
                return pd.DataFrame([])

            row = self.prepare(item)

            if not skip_validation:
                row["positive1"] = self.data_handler.get_proper_attribute_name(row["positive1"])
                row["positive2"] = self.data_handler.get_proper_attribute_name(row["positive2"])
                row["positive3"] = self.data_handler.get_proper_attribute_name(row["positive3"])
                row["negative"] = self.data_handler.get_proper_attribute_name(row["negative"])

            prepared_data.append(row)

        prepared_data = pd.DataFrame(prepared_data)
        return prepared_data

    def predict(self,
                data: Union[Iterable[Dict[str, Any]], Dict[str, Any], pd.DataFrame],
                verbose: bool = True,
                skip_validation: bool = False, raw: bool = False) -> Union[np.ndarray, np.float32]:
        """
        Predicts outcomes based on the provided input data using a pre-trained model.
        """

        if single_entry_flag := isinstance(data, dict):
            data = [data]

        if not raw:
            data = self.get_prepared_data(data, skip_validation, verbose)

        model_ready_data = self.preprocessor.transform(data)
        predictions = self.model.predict(model_ready_data,
                                         batch_size=self.model_predict_batch_size,
                                         verbose=verbose).reshape(-1)

        if raw:
            return predictions
        elif single_entry_flag:
            return np.expm1(predictions)[0]
        else:
            return np.expm1(predictions)


def main():
    # Examples
    rivens = [
        {
            "name": "Verglas",
            "positives": ["dmg", "cc", ""],
            "negatives": [""],
            "re_rolled": True
        },
        {
            "name": "Verglas",
            "positives": ["imp", "corp", ""],
            "negatives": [""],
            "re_rolled": True
        },
        {
            "name": "Verglas",
            "positives": ["ms", "cd", ""],
            "negatives": [""],
            "re_rolled": True
        },
    ]

    predictor = PricePredictor()
    predictions = predictor.predict(rivens)

    for riven, prediction in zip(rivens, predictions):
        print(f"{riven['name']} riven is estimated to be listed at {prediction:.0f} platinum")


if __name__ == "__main__":
    main()
