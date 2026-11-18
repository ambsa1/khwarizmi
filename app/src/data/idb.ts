// Minimal IndexedDB key-value layer for learner data. Falls back to memory when IndexedDB is unavailable
// (some private-browsing modes), so the app never crashes; parents see that saving is temporary in that case.
const DB = 'khawarizmi', VERSION = 1;
export const STORES = ['learners', 'meta', 'legacy'] as const;
export type StoreName = (typeof STORES)[number];

let dbp: Promise<IDBDatabase | null> | null = null;
const memory = new Map<StoreName, Map<string, unknown>>(STORES.map(s => [s, new Map()]));

function open(): Promise<IDBDatabase | null> {
  if (!dbp) dbp = new Promise(resolve => {
    try {
      const req = indexedDB.open(DB, VERSION);
      req.onupgradeneeded = () => { for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}

/** True when data really lives on the device (not the in-memory fallback). */
export const durable = async () => (await open()) !== null;

function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(db => new Promise<T>((resolve, reject) => {
    if (!db) { reject(new Error('no-idb')); return; }
    const tx = db.transaction(store, mode), req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('tx'));
  }));
}

export async function get<T>(store: StoreName, key: string): Promise<T | undefined> {
  try { return await run<T>(store, 'readonly', s => s.get(key) as IDBRequest<T>); } catch { return memory.get(store)!.get(key) as T | undefined; }
}
export async function put(store: StoreName, key: string, value: unknown): Promise<void> {
  try { await run(store, 'readwrite', s => s.put(value, key)); } catch { memory.get(store)!.set(key, value); }
}
export async function del(store: StoreName, key: string): Promise<void> {
  try { await run(store, 'readwrite', s => s.delete(key)); } catch { memory.get(store)!.delete(key); }
}
export async function all<T>(store: StoreName): Promise<[string, T][]> {
  try {
    const [keys, values] = await Promise.all([
      run<IDBValidKey[]>(store, 'readonly', s => s.getAllKeys()),
      run<T[]>(store, 'readonly', s => s.getAll() as IDBRequest<T[]>),
    ]);
    return keys.map((k, i) => [String(k), values[i]]);
  } catch { return [...memory.get(store)!.entries()] as [string, T][]; }
}
