import warnings

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from matplotlib.ticker import ScalarFormatter
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error
from sklearn.model_selection import train_test_split
from tensorflow.keras.callbacks import EarlyStopping

from warframe_marketplace_predictor.filepaths import *
from warframe_marketplace_predictor.training.preprocessors.price_model_preprocessor import Preprocessor, get_model_architecture

warnings.filterwarnings("ignore", category=RuntimeWarning)
warnings.filterwarnings("ignore", category=FutureWarning)


def plot_performance(y_test, y_test_pred, history=None):
    """
    Plots performance metrics and a scatter plot of Actual vs Predicted values with improved scaling and aesthetics using Seaborn.
    Additionally, plots training and validation loss over epochs if history is provided.

    Parameters:
    - y_test: array-like of true target values.
    - y_test_pred: array-like of predicted target values.
    - history: Keras History object containing training history (optional).
    """
    # Calculate performance metrics
    r2 = r2_score(y_test, y_test_pred)
    mse = mean_squared_error(y_test, y_test_pred)
    mae = mean_absolute_error(y_test, y_test_pred)

    # Print the metrics
    print(f"R² Score: {r2:.4f}")
    print(f"Mean Squared Error (MSE): {mse:.4f}")
    print(f"Mean Absolute Error (MAE): {mae:.4f}")

    # Transform the data
    y_test_transformed = np.expm1(y_test)
    y_pred_transformed = np.expm1(y_test_pred)

    # Flatten the arrays to ensure they are 1D
    y_test_flat = y_test_transformed.ravel()
    y_pred_flat = y_pred_transformed.ravel()

    # Initialize the Seaborn style
    sns.set(style="whitegrid", palette="pastel", font_scale=1.2)

    # Create subplots: 1 row, 2 columns
    fig, axes = plt.subplots(1, 2, figsize=(16, 8))

    # --- Left Plot: Actual vs Predicted Scatter Plot ---
    ax1 = axes[0]

    sns.scatterplot(
        x=y_test_flat,
        y=y_pred_flat,
        color="skyblue",
        edgecolor="w",
        s=60,
        alpha=0.6,
        label="Predicted vs Actual",
        ax=ax1
    )

    # Plot the Perfect Prediction line (y = x)
    min_val = min(y_test_flat.min(), y_pred_flat.min())
    max_val = max(y_test_flat.max(), y_pred_flat.max())

    ax1.plot(
        [min_val, max_val],
        [min_val, max_val],
        color="red",
        linestyle="--",
        linewidth=2,
        label="Perfect Prediction"
    )

    # Sort the data for a smooth best fit line
    sorted_indices = np.argsort(y_test_flat)
    y_test_sorted = y_test_flat[sorted_indices]
    y_pred_sorted = y_pred_flat[sorted_indices]

    # Plot the Best Fit line using Seaborn"s regplot without scatter
    sns.regplot(
        x=y_test_sorted,
        y=y_pred_sorted,
        scatter=False,
        color="darkblue",
        line_kws={"linewidth": 2, "label": "Best Fit"},
        ax=ax1
    )

    # Customize the first plot
    ax1.set_title("Actual vs Predicted Values", fontsize=16, weight="bold")
    ax1.set_xlabel("Actual Values", fontsize=14)
    ax1.set_ylabel("Predicted Values", fontsize=14)

    # Set log scales
    ax1.set_xscale("log")
    ax1.set_yscale("log")

    # Format the tick labels to avoid scientific notation
    formatter = ScalarFormatter()
    formatter.set_scientific(False)
    ax1.xaxis.set_major_formatter(formatter)
    ax1.yaxis.set_major_formatter(formatter)

    # Handle the legend to avoid duplicate labels
    handles, labels = ax1.get_legend_handles_labels()
    by_label = dict(zip(labels, handles))
    ax1.legend(by_label.values(), by_label.keys(), loc="upper left", fontsize=12)

    # --- Right Plot: Training vs Validation Loss ---
    if history is not None:
        ax2 = axes[1]

        # Extract loss and validation loss from history
        loss = history.history.get("loss")
        val_loss = history.history.get("val_loss")
        epochs = range(1, len(loss) + 1)

        # Plot training loss
        sns.lineplot(
            x=epochs,
            y=loss,
            label="Training Loss",
            ax=ax2,
            color="blue",
            linewidth=2
        )

        # Plot validation loss if available
        if val_loss:
            sns.lineplot(
                x=epochs,
                y=val_loss,
                label="Validation Loss",
                ax=ax2,
                color="orange",
                linewidth=2
            )

        ax2.set_title("Training vs Validation Loss", fontsize=16, weight="bold")
        ax2.set_xlabel("Epoch", fontsize=14)
        ax2.set_ylabel("Loss", fontsize=14)
        ax2.legend(loc="upper right", fontsize=12)

    plt.tight_layout()
    plt.show()


def train_model(show_graph: bool):
    # Read in data
    try:
        df = pd.read_csv(marketplace_dataframe_file_path)
    except FileNotFoundError as f:
        print("Original Error:", f)
        print("You need to run 'auto_setup' first.")
        exit()

    # Quick data examination
    pd.set_option("display.max_columns", None)  # Show all columns
    pd.set_option("display.width", None)  # No max width for display
    pd.set_option("display.max_colwidth", None)  # No limit on column width
    print(df.head())
    print(df.shape)
    print(df.isnull().sum())
    print(df.columns)
    print(df.describe())

    # Prepare your data
    features = ["weapon_url_name",
                "re_rolled",
                "positive1", "positive2", "positive3", "negative"]
    target = "listing_price"
    X = df[features]
    y = df[target]

    # Visual inspection of y's values justify this decision -- Trust me bro
    y_log = np.log1p(y)

    X_train, X_test, y_train_log, y_test_log = train_test_split(X, y_log, test_size=0.2, random_state=42)

    # Preprocessing data
    preprocessor = Preprocessor()
    X_train_preprocessed = preprocessor.fit_transform(X_train)
    X_test_preprocessed = preprocessor.transform(X_test)
    for v in X_test_preprocessed:
        print(v)
        print()

    # Compile the model
    model = get_model_architecture()
    model.compile(optimizer="adam", loss="logcosh")
    model.summary()

    # Define callbacks
    early_stopping = EarlyStopping(
        monitor="val_loss",
        patience=10,
        min_delta=0.0001,
        restore_best_weights=True
    )

    callbacks = [early_stopping]

    # Train the model
    history = model.fit(
        X_train_preprocessed,
        y_train_log,
        epochs=100,
        validation_split=0.2,
        batch_size=256,
        callbacks=callbacks,
        verbose=1
    )

    if show_graph:
        y_test_log_pred = model.predict(X_test_preprocessed)
        plot_performance(y_test_log, y_test_log_pred, history)

    # Preprocess the entire dataset
    preprocessor_final = Preprocessor()
    X_preprocessed_full = preprocessor_final.fit_transform(X)

    # Rebuild and recompile the model
    final_model = get_model_architecture()
    final_model.compile(optimizer="adam", loss="logcosh")

    # Retrain the model on the full dataset
    final_model.fit(
        X_preprocessed_full,
        y_log,
        epochs=early_stopping.best_epoch,
        batch_size=256,
        verbose=1
    )

    # Save the final model and preprocessor
    final_model.save(price_model_model_file_path)
    preprocessor_final.save(price_model_preprocessor_file_path)

    print("Training complete. Model and preprocessor saved.")


def _manual_save_preprocessor():
    # Read in data
    try:
        df = pd.read_csv(marketplace_dataframe_file_path)
    except FileNotFoundError as f:
        print("Original Error:", f)
        print("You need to run 'auto_setup' first.")
        exit()

    # Prepare your data
    features = ["weapon_url_name",  "positive1", "positive2", "positive3", "negative"]

    X = df[features]
    preprocessor = Preprocessor()
    preprocessor.fit_transform(X)
    preprocessor.save(price_model_preprocessor_file_path)


if __name__ == "__main__":
    # _manual_save_preprocessor()
    train_model(show_graph=False)
