#!/bin/bash

# Navigate to the project directory
 cd /var/home/jedwards/wfinfo-ng/

# Activate the virtual environment
 source .venv/bin/activate

# Run the update scripts in the required order
python3 refresh_wfcd_cache.py && \
python3 synthesize_wfinfo_data.py && \
python3 enrich_prices_from_market.py && \
python3 populate_owned.py inventory.json owned_items.json && \
python3 populate_relics.py

# Deactivate the virtual environment
deactivate