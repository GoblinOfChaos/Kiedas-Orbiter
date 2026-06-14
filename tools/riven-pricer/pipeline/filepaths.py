import os

# Get the absolute path to the directory containing this file
base_dir = os.path.dirname(os.path.abspath(__file__))

# Define the folder names
data_folder_name = "data_files"
training_folder_name = "training"
model_data_folder_name = "model_data"
sub_models_folder_name = "sub_models"

# Downloaded data
items_data_file_path = os.path.join(base_dir, data_folder_name, "items_data.json")
attributes_data_file_path = os.path.join(base_dir, data_folder_name, "attributes_data.json")
attribute_name_shortcuts_file_path = os.path.join(base_dir, data_folder_name, "attribute_name_shortcuts.json")
raw_marketplace_data_file_path = os.path.join(base_dir, data_folder_name, "raw_marketplace_data.json")
developer_summary_stats_file_path = os.path.join(base_dir, data_folder_name, "developer_summary_stats.json")
ig_weapon_stats_file_path = os.path.join(base_dir, data_folder_name, "ig_weapon_stats.json")

# Generated data
marketplace_dataframe_file_path = os.path.join(base_dir, training_folder_name, model_data_folder_name,
                                               "marketplace_dataframe.csv")

# -- Regular Model Paths --
price_model_model_file_path = os.path.join(base_dir, training_folder_name, model_data_folder_name,
                                           "price_model.h5")
price_model_preprocessor_file_path = os.path.join(base_dir, training_folder_name, model_data_folder_name,
                                                  "price_preprocessor.pkl")
price_model_kmeans_file_path = os.path.join(base_dir, training_folder_name, model_data_folder_name, "price_kmeans.pkl")

# -- Mixture of Experts Model Paths --
# moe_price_sub_models_model_directory = os.path.join(base_dir, training_folder_name, sub_models_folder_name)
# moe_price_sub_models_preprocessor_directory = os.path.join(base_dir, training_folder_name, sub_models_folder_name)
# moe_price_model_model_file_path = os.path.join(base_dir, training_folder_name, model_data_folder_name,
#                                                "moe_price_model.h5")
# moe_price_model_preprocessor_file_path = os.path.join(base_dir, training_folder_name, model_data_folder_name,
#                                                       "moe_price_preprocessor.pkl")

# -- Liquidity Model Paths --
liquidity_model_model_file_path = os.path.join(base_dir, training_folder_name, model_data_folder_name,
                                               "liquidity_model.h5")
liquidity_model_preprocessor_file_path = os.path.join(base_dir, training_folder_name, model_data_folder_name,
                                                      "liquidity_preprocessor.pkl")

# -- Weapon Information Paths --
weapon_ranking_information_file_path = os.path.join(base_dir, data_folder_name,
                                                    "weapon_ranking_information.json")
global_price_freq_file_path = os.path.join(base_dir, data_folder_name,
                                           "global_price_freq.json")

public_spreadsheet_file_path = os.path.join(base_dir, data_folder_name,
                                            "public_spreadsheet.csv")


def create_files_if_not_exist(paths):
    for path in paths:
        # Ensure the directory exists
        dir_name = os.path.dirname(path)
        if not os.path.exists(dir_name):
            os.makedirs(dir_name)
            print(f"Created directory: {dir_name}")

        # Check if the file already exists
        if not os.path.isfile(path):
            # Create the file if it doesn't exist
            with open(path, "w"):
                pass
            print(f"Created empty file: {path}")
        else:
            print(f"File already exists: {path}")


def create_directories(directories):
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f"Created directory: {directory}")
        else:
            print(f"Directory already exists: {directory}")


def main():
    # List of file paths to check and create if they don't exist
    file_paths = [
        items_data_file_path,
        attributes_data_file_path,
        attribute_name_shortcuts_file_path,
        raw_marketplace_data_file_path,
        developer_summary_stats_file_path,
        ig_weapon_stats_file_path,

        marketplace_dataframe_file_path,

        price_model_model_file_path,  # genius naming scheme
        price_model_preprocessor_file_path,
        price_model_kmeans_file_path,

        # moe_price_model_model_file_path,
        # moe_price_model_preprocessor_file_path,

        weapon_ranking_information_file_path,
        global_price_freq_file_path,

        public_spreadsheet_file_path
    ]

    # List of directories to ensure exist
    directories = [
        # moe_price_sub_models_model_directory,
        # moe_price_sub_models_preprocessor_directory
    ]

    # Create directories first
    create_directories(directories)

    # Call the function to create files
    create_files_if_not_exist(file_paths)


if __name__ == "__main__":
    main()
