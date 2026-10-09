// Cloud saves when the game runs as a claude.ai page: each player's save is
// a private document under data/users/<id>/. Anywhere else (or when the
// viewer cannot write) this resolves null and the game keeps using the
// browser's own storage.

export async function connectCloud() {
  const claude = typeof window !== 'undefined' ? window.claude : null;
  if (!claude?.use) return null;
  let db;
  let user;
  try {
    [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
  } catch {
    return null;
  }
  if (!db || !user) return null;
  const uid = await user.id();
  if (!uid) return null;

  const saveRef = db.doc(`data/users/${uid}/save`);
  const metaRef = db.doc(`data/users/${uid}/meta`);
  let disabled = false;
  let writing = false;
  let queued = null;
  let timer = 0;

  async function flush() {
    if (writing || !queued || disabled) return;
    writing = true;
    const { ref, body } = queued;
    queued = null;
    try {
      await ref.set(body);
    } catch (e) {
      // A viewer who may not write here keeps playing on browser storage.
      if (e?.code !== 'unavailable' && e?.code !== 'resource_exhausted') disabled = true;
      else if (!queued) queued = { ref, body };
    } finally {
      writing = false;
      if (queued) timer = setTimeout(flush, 2000);
    }
  }

  function queue(ref, body, delay) {
    queued = { ref, body };
    clearTimeout(timer);
    timer = setTimeout(flush, delay);
  }

  return {
    async load() {
      try {
        const snap = await saveRef.get();
        if (!snap.exists) return null;
        const d = snap.data();
        return typeof d?.data === 'string' ? { savedAt: d.savedAt || 0, json: d.data } : null;
      } catch {
        return null;
      }
    },
    /** Queue a write; bursts of saves collapse into one. */
    save(json, savedAt, { now = false } = {}) {
      if (disabled) return;
      queue(saveRef, { v: 1, savedAt, data: json }, now ? 0 : 1500);
    },
    async clear() {
      if (disabled) return;
      clearTimeout(timer);
      queued = null;
      try {
        await saveRef.delete();
      } catch {
        /* nothing to clear */
      }
    },
    async loadMeta() {
      try {
        const snap = await metaRef.get();
        return snap.exists ? snap.data() : null;
      } catch {
        return null;
      }
    },
    saveMeta(meta) {
      if (disabled) return;
      metaRef.set(meta).catch(() => {});
    },
  };
}
