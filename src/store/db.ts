// A small promise wrapper around IndexedDB, the browser's own database. Everything the signed-out
// rolodex keeps lives here, on this device only.

const DB_NAME = 'recipe-rolodex';
const DB_VERSION = 1;

/** recipes: cards by id · kv: settings and bookkeeping · photos: compressed photo files by id. */
export type StoreName = 'recipes' | 'kv' | 'photos';

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser can’t keep cards (it has no storage). Try a different browser, or leave private browsing.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('recipes')) db.createObjectStore('recipes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); opening = null; }; // another tab upgraded: let it
      resolve(db);
    };
    req.onerror = () => { opening = null; reject(req.error ?? new Error('Couldn’t open the card box.')); };
    req.onblocked = () => reject(new Error('Close the rolodex in your other tabs, then reload.'));
  });
  return opening;
}

const done = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

/** Runs `work` in one transaction and resolves once it has been written (all or nothing). */
export async function tx<T>(
  stores: StoreName | StoreName[],
  mode: IDBTransactionMode,
  work: (t: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await open();
  const t = db.transaction(stores, mode);
  const finished = new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onabort = () => reject(t.error ?? new Error('The change wasn’t saved.'));
    t.onerror = () => reject(t.error ?? new Error('The change wasn’t saved.'));
  });
  finished.catch(() => { /* reported below */ });
  let result: T;
  try {
    result = await work(t);
  } catch (err) {
    try { t.abort(); } catch { /* already finished */ }
    throw err;
  }
  await finished;
  return result;
}

export const get = <T>(t: IDBTransaction, store: StoreName, key: IDBValidKey) =>
  done(t.objectStore(store).get(key)) as Promise<T | undefined>;
export const getAll = <T>(t: IDBTransaction, store: StoreName) =>
  done(t.objectStore(store).getAll()) as Promise<T[]>;
export const getAllKeys = (t: IDBTransaction, store: StoreName) =>
  done(t.objectStore(store).getAllKeys());
export const put = (t: IDBTransaction, store: StoreName, value: unknown, key?: IDBValidKey) =>
  done(t.objectStore(store).put(value, key));
export const del = (t: IDBTransaction, store: StoreName, key: IDBValidKey) =>
  done(t.objectStore(store).delete(key));

/** Asks the browser not to clear this site's storage when space runs low (best effort). */
export async function askToPersist() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* not supported: the backup reminder covers it */ }
}
