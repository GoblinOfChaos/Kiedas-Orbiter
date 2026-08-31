// Local offline codex supplement module (Zero 3rd-party network calls)
import { getItemDrops, getItemRecipe, resolveBlueprintOrigin } from "./acquisitionData";

function canonicalPath(value) {
  return typeof value === "string" ? value.replace("/StoreItems/", "/") : value;
}

export function fetchCodexDetail(uniqueName) {
  // Pure local resolution from local manifests and acquisition indices
  const key = canonicalPath(uniqueName);
  if (!key) return Promise.resolve(null);
  
  const drops = getItemDrops(key);
  const recipe = getItemRecipe(key);
  if (!drops && !recipe) return Promise.resolve(null);

  return Promise.resolve({
    uniqueName: key,
    drops: drops || [],
    components: recipe?.components || [],
    buildPrice: recipe?.buildCost || 0,
    buildTime: recipe?.buildTime || 0
  });
}

export function codexDetailToAcquisition(detail) {
  if (!detail) return null;
  return {
    sources: detail.drops || [],
    recipe: detail.components ? {
      blueprintCost: null,
      buildCost: detail.buildPrice,
      buildTime: detail.buildTime,
      ingredients: detail.components
    } : null
  };
}

export function isGenericAcquisition(info) {
  if (!info) return true;
  if (!Array.isArray(info.sources) || info.sources.length === 0) return true;
  return info.sources.length === 1 && /^(Built in the Foundry from a blueprint and its components|Built in the Foundry from a blueprint\.)/.test(info.sources[0]?.text || "");
}
