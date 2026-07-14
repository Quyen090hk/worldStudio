import {
  MAP_IMAGE_STORE,
  openAssetDatabase,
} from "../../../shared/storage/assetDatabase";

export async function loadMapImage(mapId: string) {
  const database = await openAssetDatabase();
  return new Promise<Blob | null>((resolve, reject) => {
    const request = database
      .transaction(MAP_IMAGE_STORE, "readonly")
      .objectStore(MAP_IMAGE_STORE)
      .get(mapId);
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

export async function saveMapImage(mapId: string, image: Blob) {
  const database = await openAssetDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(MAP_IMAGE_STORE, "readwrite");
    transaction.objectStore(MAP_IMAGE_STORE).put(image, mapId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => database.close());
}

export async function removeMapImage(mapId: string) {
  const database = await openAssetDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(MAP_IMAGE_STORE, "readwrite");
    transaction.objectStore(MAP_IMAGE_STORE).delete(mapId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => database.close());
}
