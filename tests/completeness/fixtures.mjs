import { makeHarness } from '../../scripts/lib/real-data-harness.mjs'

export const frame = '/Lotus/Powersuits/TestFrame/TestFrame'
export const chassis = '/Lotus/Types/Recipes/WarframeRecipes/TestFrameChassisComponent'

export function goldenHarness({ broken = false } = {}) {
  const exportsBundle = {
    dict: {
      '/Lotus/Language/TestFrame': 'Test Frame',
      '/Lotus/Language/TestFrameChassis': 'Test Frame Chassis',
      '/Lotus/Language/TestFrameBlueprint': 'Test Frame Blueprint',
      '/Lotus/Language/Ferrite': 'Ferrite',
    },
    ExportImages: {
      '/Lotus/Art/TestFrame.png': { contentHash: 'frame' },
      '/Lotus/Art/Chassis.png': { contentHash: 'chassis' },
      '/Lotus/Art/Ferrite.png': { contentHash: 'ferrite' },
    },
    ExportWarframes: {
      [frame]: { name: '/Lotus/Language/TestFrame', icon: broken ? null : '/Lotus/Art/TestFrame.png', productCategory: 'Suits', category: 'Warframes' },
    },
    ExportResources: {
      '/Lotus/Types/Items/Resources/Ferrite': { name: '/Lotus/Language/Ferrite', icon: '/Lotus/Art/Ferrite.png' },
    },
    ExportRecipes: broken ? {} : {
      '/Lotus/Types/Recipes/WarframeRecipes/TestFrameBlueprint': {
        resultType: frame,
        ingredients: [{ ItemType: chassis, ItemCount: 1 }],
      },
    },
    WI_Warframes: {},
    WI_Resources: {},
  }
  exportsBundle.ExportRecipes['/Lotus/Types/Recipes/WarframeRecipes/TestFrameChassisBlueprint'] = {
    resultType: chassis,
    ingredients: [{ ItemType: '/Lotus/Types/Items/Resources/Ferrite', ItemCount: 10 }],
  }
  exportsBundle.AcquisitionItems = []
  exportsBundle.ExportWarframes[chassis] = { name: '/Lotus/Language/TestFrameChassis', icon: broken ? null : '/Lotus/Art/Chassis.png', productCategory: 'Suits', category: 'Warframes' }
  return makeHarness(exportsBundle)
}
