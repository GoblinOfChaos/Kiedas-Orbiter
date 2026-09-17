/**
 * Offloads the two heaviest synchronous computations in the startup/refresh
 * path - buildDropIndex and parseInventory - off the main thread.
 *
 * GitHub issue #108 confirmed both ran synchronously inline in
 * MonitoringContext.jsx: dropIndex fully unyielded inside a useMemo,
 * parseInventory already wrapped in a setTimeout to yield one frame first
 * (a partial mitigation, not a real fix). Both functions are pure - verified
 * no window/document/localStorage references anywhere in their own code or
 * their two direct dependencies (baroRelics.js, warframeUtils.js) - so they
 * can run unchanged in a Worker's global scope.
 */
import * as Comlink from 'comlink'
import { buildDropIndex } from './dropsParser'
import { parseInventory } from './inventoryParser'

const api = {
  buildDropIndex(exportData) {
    return buildDropIndex(exportData)
  },
  parseInventory(raw, exportData, dict, locale, i18n) {
    return parseInventory(raw, exportData, dict, locale, i18n)
  },
}

Comlink.expose(api)
