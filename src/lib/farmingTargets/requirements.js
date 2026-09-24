/**
 * Pure recipe expansion for Farming Targets.
 *
 * Recipes are the plain objects emitted by the inventory pipeline, with
 * `ingredients[].need` representing one craft. The parser projects DE's
 * ExportRecipes.num as `outputQty`; callers may also provide one of the
 * equivalent explicit fields when using prepared recipe data.
 */

const positiveInteger = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
};

function recipeKey(value) {
  return typeof value === 'string' ? value.replace('/StoreItems/', '/') : value;
}

function makeRecipeLookup(recipes) {
  const lookup = new Map();
  if (!recipes) return lookup;
  const entries = recipes instanceof Map ? recipes.entries() : Object.entries(recipes);
  for (const [key, recipe] of entries) {
    if (!recipe || typeof recipe !== 'object') continue;
    lookup.set(recipeKey(key), recipe);
    for (const candidate of [recipe.resultType, recipe.itemType, recipe.uniqueName, recipe.bpName, recipe.baseName]) {
      if (candidate) lookup.set(recipeKey(candidate), recipe);
    }
  }
  return lookup;
}

function outputQuantity(recipe) {
  for (const key of ['outputQty', 'outputQuantity', 'resultCount', 'resultQuantity']) {
    const value = positiveInteger(recipe?.[key]);
    if (value) return value;
  }
  return 1;
}

function ownedQuantity(owned, itemType) {
  const value = typeof owned === 'function' ? owned(itemType) : owned?.[itemType];
  return Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);
}

function hasAcquisitionData(target) {
  return target?.isAcquirable === true || target?.acquisition != null || target?.acquisitionData != null || target?.sources != null;
}

function targetQuantity(target) {
  return positiveInteger(target?.quantity ?? target?.required, 1) || 1;
}

function addContribution(working, item, targetId, quantity) {
  if (!quantity) return;
  const existing = working.get(item.itemType);
  if (existing) {
    existing.required += quantity;
    const contribution = existing.contributions.find((entry) => entry.targetId === targetId);
    if (contribution) contribution.quantity += quantity;
    else existing.contributions.push({ targetId, quantity });
    return;
  }
  working.set(item.itemType, {
    itemType: item.itemType,
    name: item.name || item.itemType,
    required: quantity,
    contributions: [{ targetId, quantity }],
  });
}

/**
 * Expand targets into raw leaf requirements. Crafted intermediates consume
 * owned stock before their recipe is expanded; raw leaves remain unshortened
 * so the ledger can apply the combined inventory exactly once.
 */
export function expandTargets(targets = [], ctx = {}) {
  const lookup = makeRecipeLookup(ctx.recipes);
  const remainingOwned = new Map();
  const getOwned = (itemType) => {
    if (!remainingOwned.has(itemType)) remainingOwned.set(itemType, ownedQuantity(ctx.owned, itemType));
    return remainingOwned.get(itemType);
  };
  const leaves = new Map();
  const unresolved = [];
  const errors = [];

  const orderedTargets = [...targets].sort((a, b) =>
    String(a?.id ?? '').localeCompare(String(b?.id ?? '')) ||
    String(a?.itemType ?? a?.uniqueName ?? '').localeCompare(String(b?.itemType ?? b?.uniqueName ?? ''))
  );

  for (const target of orderedTargets) {
    const targetId = String(target?.id ?? target?.itemType ?? target?.uniqueName ?? '');
    const itemType = target?.itemType ?? target?.uniqueName;
    const localLeaves = new Map();
    const localOwnedUse = new Map();
    let cyclePath = null;
    let invalidReason = null;

    const consumeOwned = (key, amount) => {
      const available = getOwned(key) - (localOwnedUse.get(key) ?? 0);
      const used = Math.min(Math.max(0, available), amount);
      if (used) localOwnedUse.set(key, (localOwnedUse.get(key) ?? 0) + used);
      return used;
    };

    const expand = (key, name, amount, path) => {
      if (!key || !Number.isFinite(amount) || amount < 0) {
        invalidReason = 'missing or invalid item requirement';
        return;
      }
      const normalizedKey = recipeKey(key);
      const recipe = lookup.get(normalizedKey);
      if (!recipe) {
        addContribution(localLeaves, { itemType: normalizedKey, name: name || normalizedKey }, targetId, amount);
        return;
      }
      if (path.includes(normalizedKey)) {
        cyclePath = [...path, normalizedKey];
        return;
      }
      const remaining = amount - consumeOwned(normalizedKey, amount);
      if (!remaining) return;
      const batches = Math.ceil(remaining / outputQuantity(recipe));
      for (const rawIngredient of recipe.ingredients ?? []) {
        const ingredientType = rawIngredient?.itemType ?? rawIngredient?.ItemType;
        const need = Number(rawIngredient?.need ?? rawIngredient?.ItemCount);
        if (!ingredientType || !Number.isFinite(need) || need < 0) {
          invalidReason = 'recipe contains an unverifiable ingredient';
          return;
        }
        expand(ingredientType, rawIngredient.name, batches * need, [...path, normalizedKey]);
        if (cyclePath || invalidReason) return;
      }
    };

    if (!itemType) {
      unresolved.push({ targetId, reason: 'missing item identity' });
      continue;
    }
    const targetRecipe = lookup.get(recipeKey(itemType));
    if (!targetRecipe && !hasAcquisitionData(target)) {
      unresolved.push({ targetId, reason: 'no recipe or acquisition data' });
      continue;
    }
    expand(itemType, target.name, targetQuantity(target), []);

    if (cyclePath) {
      errors.push({ targetId, kind: 'cycle', path: cyclePath });
      continue;
    }
    if (invalidReason) {
      unresolved.push({ targetId, reason: invalidReason });
      continue;
    }
    for (const [key, value] of localLeaves) {
      addContribution(leaves, value, targetId, value.required);
    }
    for (const [key, used] of localOwnedUse) remainingOwned.set(key, getOwned(key) - used);
  }

  for (const value of leaves.values()) {
    value.contributions.sort((a, b) => String(a.targetId).localeCompare(String(b.targetId)));
  }
  return { leaves, unresolved, errors };
}
