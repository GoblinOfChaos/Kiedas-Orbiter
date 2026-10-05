import { resolveAnyImage } from './warframeUtils.js'

export function resolveRelicImage(item, imageMaps = {}) {
  return resolveAnyImage(
    item,
    imageMaps.EI || {},
    imageMaps.nameToImage || {},
    imageMaps.uniqueNameToName || {},
  )
}

export function attachRelicRewardImages(rewards = [], imageMaps = {}) {
  return rewards.map((reward) => ({
    ...reward,
    icon: resolveRelicImage(reward, imageMaps),
  }))
}

export function attachRelicSubcomponentImages(inventory = {}, imageMaps = {}) {
  return {
    ...inventory,
    subcomponents: (inventory.subcomponents || []).map((component) => ({
      ...component,
      image: resolveRelicImage(component, imageMaps),
    })),
  }
}
