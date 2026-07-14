import {
  ASSET_FILE_STORE,
  openAssetDatabase,
} from "../../shared/storage/assetDatabase";

export async function loadAssetFile(assetId: string) {
  const database = await openAssetDatabase();
  return new Promise<Blob | null>((resolve, reject) => {
    const request = database
      .transaction(ASSET_FILE_STORE, "readonly")
      .objectStore(ASSET_FILE_STORE)
      .get(assetId);
    request.onsuccess = () =>
      resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

export async function saveAssetFile(assetId: string, file: Blob) {
  const database = await openAssetDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(ASSET_FILE_STORE, "readwrite");
    transaction.objectStore(ASSET_FILE_STORE).put(file, assetId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => database.close());
}

export async function removeAssetFile(assetId: string) {
  const database = await openAssetDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(ASSET_FILE_STORE, "readwrite");
    transaction.objectStore(ASSET_FILE_STORE).delete(assetId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => database.close());
}
