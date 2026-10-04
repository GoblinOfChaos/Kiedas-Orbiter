const CATALOG_TABLES = [
  'ExportWarframes', 'ExportWeapons', 'ExportResources', 'ExportSentinels',
  'ExportPets', 'ExportVehicles', 'ExportArchwing', 'ExportMechs', 'ExportAmps',
]

function entriesOf(table) {
  if (Array.isArray(table)) return table.map((entry) => [entry?.uniqueName, entry]).filter(([key]) => key)
  return Object.entries(table ?? {})
}

function displayName(uniqueName, entry, uniqueNameToName) {
  const candidates = [entry?.name, uniqueNameToName?.[uniqueName], uniqueNameToName?.[uniqueName?.replace('/StoreItems/', '/')]]
  return candidates.find((value) => typeof value === 'string' && value && !value.startsWith('/'))
}

export function findCatalogEntryByName(exportsBundle, uniqueNameToName, name) {
  for (const tableName of CATALOG_TABLES) {
    for (const [uniqueName, entry] of entriesOf(exportsBundle?.[tableName])) {
      if (uniqueName && !/Blueprint$/i.test(uniqueName) && displayName(uniqueName, entry, uniqueNameToName) === name) {
        return { uniqueName, name }
      }
    }
  }
  const mapped = Object.entries(uniqueNameToName ?? {})
    .find(([uniqueName, displayNameValue]) => displayNameValue === name && !/Blueprint$/i.test(uniqueName))
  return mapped ? { uniqueName: mapped[0], name } : null
}

export function catalogTarget(exportsBundle, uniqueNameToName, name, id = name.toLocaleLowerCase().replaceAll(/[^a-z0-9]+/g, '-')) {
  const entry = findCatalogEntryByName(exportsBundle, uniqueNameToName, name)
  if (!entry) throw new Error(`catalog item not found: ${name}`)
  return { id, ...entry, quantity: 1 }
}

export function cloneWithoutInventoryKeys(inventory, keys) {
  const fixture = structuredClone(inventory)
  for (const key of keys) delete fixture[key]
  return fixture
}
