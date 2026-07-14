export const MAP_IMAGE_STORE = "map-images";
export const ASSET_FILE_STORE = "asset-files";

const DATABASE_NAME = "world-studio-assets";
const DATABASE_VERSION = 2;

export function openAssetDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(MAP_IMAGE_STORE)) {
        request.result.createObjectStore(MAP_IMAGE_STORE);
      }
      if (!request.result.objectStoreNames.contains(ASSET_FILE_STORE)) {
        request.result.createObjectStore(ASSET_FILE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
