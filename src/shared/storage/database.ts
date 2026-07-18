import type { StateStorage } from "zustand/middleware";

export const DATABASE_NAME = "world-studio";
export const DATABASE_VERSION = 4;

export const STORE_STATE = "state";
export const STORE_WORKSPACES = "workspaces";
export const STORE_MAP_IMAGES = "map-images";
export const STORE_ASSET_FILES = "asset-files";
export const STORE_ASSET_THUMBNAILS = "asset-thumbnails";
export const STORE_ENTRY_DRAFTS = "entry-drafts";
export const STORE_ENTRIES = "entries";
export const STORE_ENTRY_REVISIONS = "entry-revisions";

type StoreName =
  | typeof STORE_STATE
  | typeof STORE_WORKSPACES
  | typeof STORE_MAP_IMAGES
  | typeof STORE_ASSET_FILES
  | typeof STORE_ASSET_THUMBNAILS
  | typeof STORE_ENTRY_DRAFTS
  | typeof STORE_ENTRIES
  | typeof STORE_ENTRY_REVISIONS;

let databasePromise: Promise<IDBDatabase> | null = null;
const memoryFallback = new Map<string, unknown>();
const writeQueues = new Map<string, Promise<void>>();

function memoryKey(storeName: StoreName, key: IDBValidKey) {
  return `${storeName}:${String(key)}`;
}

export function openDatabase() {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable"));
  }

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      for (const storeName of [
        STORE_STATE,
        STORE_WORKSPACES,
        STORE_MAP_IMAGES,
        STORE_ASSET_FILES,
        STORE_ASSET_THUMBNAILS,
        STORE_ENTRY_DRAFTS,
        STORE_ENTRIES,
        STORE_ENTRY_REVISIONS,
      ]) {
        if (!request.result.objectStoreNames.contains(storeName)) {
          request.result.createObjectStore(storeName);
        }
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error ?? new Error("Unable to open IndexedDB"));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("IndexedDB upgrade was blocked"));
    };
  });

  return databasePromise;
}

export async function readRecord<T>(storeName: StoreName, key: IDBValidKey) {
  if (typeof indexedDB === "undefined") {
    return memoryFallback.get(memoryKey(storeName, key)) as T | undefined;
  }
  const database = await openDatabase();
  return new Promise<T | undefined>((resolve, reject) => {
    const request = database
      .transaction(storeName, "readonly")
      .objectStore(storeName)
      .get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function readAllRecords<T>(storeName: StoreName) {
  if (typeof indexedDB === "undefined") {
    const prefix = `${storeName}:`;
    return [...memoryFallback.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value as T);
  }
  const database = await openDatabase();
  return new Promise<T[]>((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function writeRecord<T>(
  storeName: StoreName,
  key: IDBValidKey,
  value: T,
) {
  if (typeof indexedDB === "undefined") {
    memoryFallback.set(memoryKey(storeName, key), value);
    return;
  }
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function deleteRecord(storeName: StoreName, key: IDBValidKey) {
  if (typeof indexedDB === "undefined") {
    memoryFallback.delete(memoryKey(storeName, key));
    return;
  }
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export const indexedDbStateStorage: StateStorage = {
  getItem: async (name) => (await readRecord<string>(STORE_STATE, name)) ?? null,
  setItem: async (name, value) => {
    const previous = writeQueues.get(name) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(() =>
      writeRecord(STORE_STATE, name, value),
    );
    writeQueues.set(name, next);
    try {
      await next;
    } finally {
      if (writeQueues.get(name) === next) writeQueues.delete(name);
    }
  },
  removeItem: async (name) => deleteRecord(STORE_STATE, name),
};

const LEGACY_BUSINESS_KEYS = [
  "world-studio.entries.v1",
  "world-studio.relationships.v1",
  "world-studio.timeline.v1",
  "world-studio.map.v2",
  "world-studio.canvas.v1",
  "world-studio.assets.v1",
  "world-studio.graph-settings.v2",
  "world-studio.profile.v1",
  "world-studio.world-registry.v1",
];

/** Business data belongs in IndexedDB; localStorage is reserved for UI preferences. */
export function clearLegacyBusinessStorage() {
  if (typeof localStorage === "undefined") return;
  for (const key of LEGACY_BUSINESS_KEYS) localStorage.removeItem(key);
}
