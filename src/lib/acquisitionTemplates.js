/**
 * GitHub issue #111 Phase 3 plumbing: additive, render-time-only substitution.
 * Must NEVER be used anywhere upstream of acquisitionInfo.js's guard-regex chain (which matches raw English overrideText).
 * This function is only for the final display string, after the guards have already decided to show it.
 */

import { invoke } from './logging/tauri';

let textIndex = null;
let loadPromise = null;

export function loadAcquisitionTemplates() {
  if (textIndex) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = invoke('read_file_bytes', { relative: 'data/assets/data/acquisition_override_templates.json' })
    .then((bytes) => {
      const data = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)));
      const map = new Map();
      for (const template of data.templates || []) {
        for (const key of template.keys || []) {
          if (key.text) {
            map.set(key.text, { templateId: template.templateId, params: key.params || [] });
          }
        }
      }
      textIndex = map;
    })
    .catch(() => {
      textIndex = new Map();
    });
  return loadPromise;
}

export function localizeOverrideText(rawText, i18nData) {
  if (typeof rawText !== 'string' || !rawText) return rawText;
  if (!textIndex) return rawText;

  const entry = textIndex.get(rawText);
  if (!entry) return rawText;

  const translatedPattern = i18nData?.acquisitionTemplates?.[entry.templateId];
  if (typeof translatedPattern !== 'string' || !translatedPattern) return rawText;

  const parts = translatedPattern.split('<*>');
  if (parts.length - 1 !== entry.params.length) return rawText;

  let result = parts[0];
  for (let i = 0; i < entry.params.length; i++) {
    result += entry.params[i] + parts[i + 1];
  }
  return result;
}
