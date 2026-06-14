import pickle
import warnings
from typing import List

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.base import BaseEstimator, TransformerMixin
from tensorflow.keras import layers, Model
from sklearn.base import BaseEstimator, TransformerMixin

from warframe_marketplace_predictor.filepaths import *
from warframe_marketplace_predictor.shtuff.data_handler import DataHandler

# Suppress specific FutureWarning related to .fillna downcasting
warnings.filterwarnings("ignore", message=".*Downcasting object dtype arrays.*")


class Preprocessor(BaseEstimator, TransformerMixin):
    def __init__(self):
        # Scalers for numerical features
        # self.disposition_scaler = MinMaxScaler()
        # self.avg_trade_price_scaler = StandardScaler()

        # Placeholder for most common disposition and mean log price
        # self.disposition_most_common = None
        # self.avg_trade_price_log_mean = None

        # Vocabulary for attributes and groups
        # group_names = DataHandler().get_groups()

        # OneHotEncoders for "group" and attributes
        # self.group_encoder = OneHotEncoder(
        #     categories=[group_names],
        #     handle_unknown="error",
        #     sparse_output=False
        # )
        pass

    def fit(self, X: pd.DataFrame, y=None) -> "Preprocessor":
        # # Compute the most common disposition
        # self.disposition_most_common = X["disposition"].mode()[0]
        #
        # # Fill missing values in avg_trade_price with the mean
        # self.avg_trade_price_mean = X["avg_trade_price"].mean()
        # X_avg_trade_price_filled = X["avg_trade_price"].fillna(self.avg_trade_price_mean)
        #
        # # Logarithmic transformation
        # X_avg_trade_price_log = np.log1p(X_avg_trade_price_filled)
        # self.avg_trade_price_log_mean = X_avg_trade_price_log.mean()
        #
        # # Fit scalars
        # X_disposition_filled = X["disposition"].fillna(self.disposition_most_common).to_frame()
        # self.disposition_scaler.fit(X_disposition_filled)
        # self.avg_trade_price_scaler.fit(X_avg_trade_price_log.to_frame())
        #
        # # Fit the OneHotEncoders
        # self.group_encoder.fit(X[["group"]])

        return self

    def transform(self, X: pd.DataFrame) -> List[pd.DataFrame]:
        X_copy = X.copy()

        # # Convert boolean columns to integers
        # X_copy["has_incarnon"] = X_copy["has_incarnon"].astype(int)
        # X_copy["re_rolled"] = X_copy["re_rolled"].astype(int)
        #
        # # Handle missing values and scale "disposition"
        # X_copy["disposition"] = X_copy["disposition"].fillna(self.disposition_most_common)
        # X_copy["disposition"] = self.disposition_scaler.transform(X_copy[["disposition"]])
        #
        # # Fill missing values in avg_trade_price with the mean from fit
        # X_copy["avg_trade_price"] = X_copy["avg_trade_price"].fillna(self.avg_trade_price_mean)
        #
        # # Apply logarithmic transformation
        # X_copy["avg_trade_price"] = np.log1p(X_copy["avg_trade_price"])
        #
        # # Scale avg_trade_price
        # X_copy["avg_trade_price"] = self.avg_trade_price_scaler.transform(X_copy[["avg_trade_price"]])
        #
        # # One-hot encode "group"
        # group_encoded = self.group_encoder.transform(X_copy[["group"]])
        # group_encoded_df = pd.DataFrame(
        #     group_encoded,
        #     columns=self.group_encoder.get_feature_names_out(["group"]),
        #     index=X_copy.index
        # )
        #
        # # Drop original categorical columns
        # X_copy = X_copy.drop(columns=["group"])
        #
        # # Concatenate the one-hot encoded columns
        # X_copy = pd.concat([X_copy, group_encoded_df], axis=1)

        X_copy["re_rolled"] = X_copy["re_rolled"].astype(np.float32)

        X_copy = X_copy.fillna("<NONE>")

        return self.split_X(X_copy)

    @staticmethod
    def split_X(X: pd.DataFrame) -> List[pd.DataFrame]:
        # Assuming the one-hot encoded group columns start with "group_"
        # group_columns = [col for col in X.columns if col.startswith("group_")]

        return [
            X[["weapon_url_name"]],  # weapon_url_name_input
            # X[group_columns],  # group_one_hot_encoded
            # X[["has_incarnon"]],  # has_incarnon_input
            # X[["avg_trade_price"]],  # avg_trade_price_input
            X[["re_rolled"]],  # re_rolled_input
            # X[["disposition"]],  # disposition_input
            X[["positive1", "positive2", "positive3", "negative"]]  # attribute_names_input
        ]

    def save(self, filepath: str = None):
        filepath = filepath if filepath else price_model_preprocessor_file_path
        # Save the preprocessor instance to a pickle file
        with open(filepath, "wb") as f:
            pickle.dump(self, f)

    @staticmethod
    def load(filepath: str = None) -> "Preprocessor":
        filepath = filepath if filepath else price_model_preprocessor_file_path
        # Load the preprocessor instance from a pickle file
        with open(filepath, "rb") as f:
            return pickle.load(f)


def get_model_architecture():
    # def get_positional_encoding(sequence_length, embedding_dim):
    #     # Create a matrix of positions [0, 1, 2, ..., sequence_length-1]
    #     position = tf.range(sequence_length, dtype=tf.float32)[:, tf.newaxis]
    #
    #     # Compute the division term correctly
    #     div_term = tf.exp(tf.multiply(tf.range(0, embedding_dim, 2, dtype=tf.float32),
    #                                   -tf.divide(tf.math.log(10000.0), embedding_dim)))
    #
    #     # Calculate angle_rads as position * div_term
    #     angle_rads = tf.multiply(position, div_term)
    #
    #     # Assign sine to even indices (2i) and cosine to odd indices (2i+1)
    #     pos_encoding = tf.concat([tf.sin(angle_rads), tf.cos(angle_rads)], axis=-1)
    #
    #     # If embedding_dim is odd, truncate the pos_encoding to the required dimensions
    #     pos_encoding = pos_encoding[:, :embedding_dim]
    #
    #     return pos_encoding

    # Structure sizes
    weapon_name_embedding_size = 32
    attributes_embedding_size = 32

    # Load vocabularies
    data_handler = DataHandler()
    weapon_url_names = data_handler.get_url_names()
    # group_names = data_handler.get_groups()
    # group_input_size = len(group_names)
    attributes = data_handler.get_attribute_names()

    # -- Inputs --
    weapon_url_name_input = layers.Input(shape=(1,), dtype=tf.string, name="weapon_url_name_input")
    # group_input = layers.Input(shape=(group_input_size,), dtype=tf.float32, name="group_input")
    # has_incarnon_input = layers.Input(shape=(1,), dtype=tf.float32, name="has_incarnon_input")
    # avg_trade_price_input = layers.Input(shape=(1,), dtype=tf.float32, name="avg_trade_price_input")
    re_rolled_input = layers.Input(shape=(1,), dtype=tf.float32, name="re_rolled_input")
    # disposition_input = layers.Input(shape=(1,), dtype=tf.float32, name="disposition_input")
    attributes_input = layers.Input(shape=(4,), dtype=tf.string, name="attributes_input")

    # -- Weapon Path --
    # String Lookups
    weapon_url_name_lookup = layers.StringLookup(
        vocabulary=weapon_url_names,
        mask_token="<NONE>",
        name="weapon_url_name_lookup"
    )

    # Convert string inputs to integer indices
    weapon_url_name_indices = weapon_url_name_lookup(weapon_url_name_input)

    # Embedding layers for Weapon Data
    weapon_url_name_embedding_layer = layers.Embedding(
        input_dim=len(weapon_url_names) + 2,  # +1 for mask, +1 for OOV
        output_dim=weapon_name_embedding_size,
        name="weapon_url_name_embedding"
    )

    # Generate embeddings and flatten
    weapon_url_name_embedding_output = layers.Flatten()(weapon_url_name_embedding_layer(weapon_url_name_indices))

    # -- Attributes Path --
    # String Lookups
    attributes_lookup = layers.StringLookup(
        vocabulary=attributes,
        mask_token="<NONE>",
        name="attributes_lookup"
    )

    # Convert string inputs to integer indices
    attributes_indices = attributes_lookup(attributes_input)

    # Embedding layers for Weapon Data
    attributes_embedding_layer = layers.Embedding(
        input_dim=len(attributes) + 2,  # +1 for mask, +1 for OOV
        output_dim=attributes_embedding_size,
        name="attributes_embedding"
    )

    # Generate embeddings for attribute indices
    attributes_embedding_output = attributes_embedding_layer(attributes_indices)
    flattened_attributes_embedding = layers.Flatten()(attributes_embedding_output)

    # Positional Encoding
    # sequence_length = 4  # Fixed shape of (4,) for attributes input

    # # Generate positional encoding tensor and add to embeddings
    # positional_encoding_matrix = get_positional_encoding(sequence_length, attributes_embedding_size)
    # attributes_embeddings = tf.add(attributes_embedding_output, positional_encoding_matrix)
    #
    # # Attributes Self Attention Layer
    # attributes_attention = layers.Attention()(
    #     [attributes_embeddings, attributes_embeddings]
    # )
    # attributes_attention = layers.Dense(units=32, activation="relu")(attributes_attention)
    # attributes_attention = layers.Flatten()(attributes_attention)

    # -- Concatenate with Other Features --
    combined_embedding = layers.Concatenate(name="combined_embedding")(
        # [weapon_url_name_embedding_output, group_input, has_incarnon_input, avg_trade_price_input,
        #  re_rolled_input,
        #  disposition_input, flattened_attributes_embedding]
        [weapon_url_name_embedding_output, re_rolled_input, flattened_attributes_embedding]
    )

    # -- Dense Layers for Final Prediction --
    x = combined_embedding
    x = layers.Dense(units=128, activation="relu")(x)
    x = layers.Dense(units=32, activation="relu")(x)

    output = layers.Dense(units=1, activation="linear", name="output")(x)

    # Define the model with all inputs and the output
    # model = Model(inputs=[
    #     weapon_url_name_input, group_input, has_incarnon_input, avg_trade_price_input,
    #     re_rolled_input,
    #     disposition_input, attributes_input
    # ], outputs=output, name="riven_model")
    model = Model(inputs=[weapon_url_name_input, re_rolled_input, attributes_input], outputs=output, name="riven_model")

    return model
