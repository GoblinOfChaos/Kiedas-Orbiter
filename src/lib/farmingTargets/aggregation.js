/**
 * Pure aggregation engine for Farming Targets (Stage 4C route 21, GitHub
 * board task #82eefb37). No Tauri invoke calls and no React imports here on
 * purpose - everything takes plain data in and returns plain data out, so
 * this can be unit-tested (and later reused by an Option-A proof script,
 * per COMMAND-CENTER-IMPLEMENTATION-PLAN.md §9.8) against a synthetic
 * `inventoryData` fixture with no running app at all.
 *
 * MVP ("Option B") scope: build a combined cross-target shopping list from
 * each target's already-computed crafting recipe (`inventoryData.craftable`,
 * the same have/need data Foundry.jsx already trusts and displays per-item).
 * This deliberately reuses that existing have/need computation instead of
 * re-deriving ownership counts, so this list can never disagree with what
 * Foundry shows for the same ingredient.
 */

// Trivial normalizers, matching Foundry.jsx's own local copies (kept local
// here too rather than extracted into a shared util for a one-liner each).
const canonicalPath = (value) => value?.replace('/StoreItems/', '/') || value;
const canonicalName = (value) => String(value || '')
  .replace(/\s+Blueprint$/i, '')
  .replace(/[^a-z0-9]/gi, '')
  .toLowerCase();

/**
 * Builds a resultType/name -> recipe lookup out of inventoryData.craftable,
 * exactly like Foundry.jsx's recipeByResult memo.
 */
export function buildRecipeIndex(inventoryData) {
  const map = new Map();
  for (const recipe of inventoryData?.craftable || []) {
    if (recipe.resultType) map.set(`path:${canonicalPath(recipe.resultType)}`, recipe);
    for (const name of [recipe.bpName, recipe.baseName]) {
      const key = canonicalName(name);
      if (key) map.set(`name:${key}`, recipe);
    }
  }
  return map;
}

export function findRecipeForTarget(target, recipeIndex) {
  return (
    recipeIndex.get(`path:${canonicalPath(target.uniqueName)}`) ||
    recipeIndex.get(`name:${canonicalName(target.name)}`) ||
    null
  );
}

/**
 * Looks up how many of the target's own item the player currently owns, by
 * scanning inventoryData.all - used for non-craftable targets (a target can
 * be any item with acquisition data, not just a buildable one) and for
 * showing "already own N" on craftable targets too.
 */
export function findOwnedQuantity(target, inventoryData) {
  const entry = (inventoryData?.all || []).find((i) => i.unique_name === target.uniqueName);
  if (!entry) return 0;
  return entry.quantity ?? (entry.owned ? 1 : 0);
}

/**
 * Combines every target's recipe ingredients into one shopping list.
 * `need` on each ingredient is per single craft - multiplied here by the
 * target's own `quantity` (how many copies of the end item the user wants).
 * `have` is only read from the FIRST occurrence of a given itemType: every
 * recipe reports `have` computed fresh against the same real inventory
 * counts (see inventoryParser.js), so re-reading it per occurrence would
 * only be wrong if a single recipe needs the same ingredient more than once
 * for one craft - an edge case (e.g. Twin weapons) inventoryParser.js
 * already allocates for internally, and out of scope for cross-target
 * pooling here.
 */
export function buildShoppingList(targets, inventoryData) {
  const recipeIndex = buildRecipeIndex(inventoryData);
  const merged = new Map();

  for (const target of targets) {
    const recipe = findRecipeForTarget(target, recipeIndex);
    if (!recipe) continue;
    const quantity = Math.max(1, target.quantity || 1);
    for (const ingredient of recipe.ingredients || []) {
      const key = ingredient.itemType;
      const existing = merged.get(key);
      const need = (ingredient.need ?? 0) * quantity;
      if (existing) {
        existing.totalNeed += need;
        existing.neededBy.push({ targetId: target.id, targetName: target.name, need });
      } else {
        merged.set(key, {
          itemType: key,
          name: ingredient.name,
          image: ingredient.image,
          have: ingredient.have ?? 0,
          totalNeed: need,
          neededBy: [{ targetId: target.id, targetName: target.name, need }],
        });
      }
    }
  }

  return [...merged.values()]
    .map((entry) => ({ ...entry, remaining: Math.max(0, entry.totalNeed - entry.have) }))
    .sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name));
}

/**
 * Top-level view model for the Farming Targets screen: per-target status
 * plus the combined shopping list. This is the one function the screen
 * component should call - everything above is exported mainly so it can be
 * unit-tested independently.
 */
export function computeFarmingTargetsView(targets, inventoryData) {
  const recipeIndex = buildRecipeIndex(inventoryData);
  const perTarget = targets.map((target) => {
    const recipe = findRecipeForTarget(target, recipeIndex);
    return {
      target,
      recipe,
      readyToCraft: recipe ? !!recipe.readyToCraft : null,
      ownedQuantity: findOwnedQuantity(target, inventoryData),
    };
  });
  return { perTarget, shoppingList: buildShoppingList(targets, inventoryData) };
}
