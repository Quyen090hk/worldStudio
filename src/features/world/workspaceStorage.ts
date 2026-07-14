import type { WorkspaceBackup } from "../settings/workspaceBackup";

const DB_NAME = "world-studio-worlds";
const STORE_NAME = "workspaces";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME))
        request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, mode);
    const request = run(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => database.close();
    tx.onerror = () => reject(tx.error);
  });
}

export function saveWorldWorkspace(id: string, backup: WorkspaceBackup) {
  return transaction("readwrite", (store) => store.put(backup, id));
}

export function loadWorldWorkspace(id: string) {
  return transaction<WorkspaceBackup | undefined>("readonly", (store) => store.get(id));
}

export function deleteWorldWorkspace(id: string) {
  return transaction("readwrite", (store) => store.delete(id));
}
