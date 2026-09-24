const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

async function defaultGunzip(bytes) {
  const stream = new Response(bytes).body.pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function defaultSha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createWikiStore({ invoke, gunzip = defaultGunzip, sha256 = defaultSha256 }) {
  let indexPromise;
  const modulePromises = new Map();

  const getIndex = () => {
    indexPromise ??= Promise.resolve(invoke('wiki_store_index'));
    return indexPromise;
  };

  const getModule = async (title) => {
    if (!modulePromises.has(title)) {
      modulePromises.set(title, (async () => {
        const index = await getIndex();
        const record = index.modules?.find((module) => module.title === title);
        if (!record) {
          throw new Error(`Module ${title} is not present in wiki store`);
        }
        const compressed = new Uint8Array(await invoke('wiki_store_get_bytes', { file: record.file }));
        const actualHash = await sha256(compressed);
        if (actualHash !== record.sha256) {
          throw new Error(`Wiki module ${title} failed compressed-byte SHA-256 verification`);
        }
        let bytes;
        try {
          bytes = await gunzip(compressed);
        } catch (error) {
          throw new Error(`Wiki module ${title} has invalid gzip data: ${error.message}`, { cause: error });
        }
        const text = new TextDecoder().decode(bytes);
        return {
          title,
          kind: record.kind,
          revid: record.revid ?? null,
          data: record.kind === 'json' ? JSON.parse(text) : text,
        };
      })());
    }
    return modulePromises.get(title);
  };

  const stale = async () => {
    const index = await getIndex();
    // A store is stale once its generated snapshot is at least 24 hours old.
    const checkedAt = Date.parse(index.generatedAt ?? '');
    return !Number.isFinite(checkedAt) || Date.now() - checkedAt >= STALE_AFTER_MS;
  };

  return { getIndex, getModule, stale };
}
