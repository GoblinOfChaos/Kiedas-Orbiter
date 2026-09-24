const DAY_MS = 24 * 60 * 60 * 1000;

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
    if (!indexPromise) {
      const promise = Promise.resolve().then(() => invoke('wiki_store_index'));
      const retryable = promise.catch((error) => {
        if (indexPromise === retryable) indexPromise = undefined;
        throw error;
      });
      indexPromise = retryable;
    }
    return indexPromise;
  };

  const getModule = async (title) => {
    if (!modulePromises.has(title)) {
      const promise = (async () => {
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
      })();
      const retryable = promise.catch((error) => {
        if (modulePromises.get(title) === retryable) modulePromises.delete(title);
        throw error;
      });
      modulePromises.set(title, retryable);
    }
    return modulePromises.get(title);
  };

  const ageDays = async (now = new Date()) => {
    const index = await getIndex();
    const snapshotAt = Date.parse(index.snapshotDate ?? '');
    const nowAt = now instanceof Date ? now.getTime() : new Date(now).getTime();
    if (!Number.isFinite(snapshotAt) || !Number.isFinite(nowAt)) return null;
    return Math.floor(Math.max(0, nowAt - snapshotAt) / DAY_MS);
  };

  return { getIndex, getModule, ageDays };
}
