# Updated Wiki Audit Methodology (Item-by-Item)

The `FOLDER_OVERRIDES` bug has been fixed in `inventoryParser.js`.

Per your instructions, the list-scrape-and-matcher approach has been completely discarded. We are now pivoting to a strict, item-by-item verification methodology for the Warframes category.

## Proposed Changes: Step-by-Step Item Verification

Instead of doing set intersection on two bulk lists, I will write an audit script that performs the following logic **sequentially for every single item**:

1. **Get the App's Catalog Item**: Use a `vite-node` harness to pull the `Warframes` catalog list exactly as the app renders it.
2. **Open the Item's Individual Wiki Page**: For each item in the app catalog:
   - The script will query the local `wiki_pdf_archive.sqlite` for the specific base page (e.g. "Mesa", "Excalibur").
3. **Record and Check**:
   - The script will extract a snippet of the surrounding text/context from the wiki to confirm its status (e.g., Release Date, acquisition status, or missing page).
   - **For ALL items (matches AND mismatches), the script will log the exact extracted text.** This ensures there are no silent false-positives caused by blind spots in the extraction logic.
   - If the item is NOT found on its own wiki page, or its status contradicts the app, it is flagged as an **App-Only / Status Mismatch**.
4. **Discovering Missing Items**: To fulfill the goal of finding items the app is *missing*, I will run the inverse loop: iterate through the ground-truth DE export data (`ExportWarframes.json`), query each one's individual wiki page to extract evidence of its existence, and then check if the app's catalog successfully rendered it.

## Dry Run Phase

Before running this across all 110+ Warframes, I will perform a **Dry Run** on a small batch of 8-10 items to validate the evidence-extraction logic. The dry run will deliberately include:
- `Excalibur` (A standard base frame)
- `Mesa Prime` (A standard Prime frame)
- `Whisper` (To see how the script handles the Temple/1999 edge case we investigated earlier)
- A few other randomly selected items.

I will present the raw, per-item evidence logs from this dry run for your approval before proceeding to the rest of the category.
