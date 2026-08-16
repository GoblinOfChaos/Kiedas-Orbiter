const API = 'https://wiki.warframe.com/api.php';

/** Fetch a maintained wiki Lua data module as server-serialized JSON. */
export async function fetchScribuntoModule(moduleName) {
  const tokenResponse = await fetch(`${API}?action=query&meta=tokens&type=csrf&format=json`);
  if (!tokenResponse.ok) throw new Error(`Wiki token request failed: ${tokenResponse.status}`);
  const tokenPayload = await tokenResponse.json();
  const token = tokenPayload.query?.tokens?.csrftoken;
  if (!token) throw new Error('Wiki token response did not contain a CSRF token');

  const form = new URLSearchParams({
    action: 'scribunto-console', format: 'json', title: "Kieda's Orbiter data import",
    content: '', question: `=require("Module:JSON").stringify(mw.loadData("Module:${moduleName}"))`,
    clear: '1', utf8: '1', token,
  });
  const response = await fetch(API, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form,
  });
  if (!response.ok) throw new Error(`Wiki Scribunto request failed: ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`Wiki Scribunto error: ${payload.error.info || payload.error.code}`);
  if (typeof payload.return !== 'string') throw new Error(`Wiki Scribunto returned no JSON for Module:${moduleName}`);
  return JSON.parse(payload.return);
}
