import {
  ASSET_FILE_STORE,
} from "../../shared/storage/assetDatabase";
import { deleteRecord, readRecord, STORE_ASSET_THUMBNAILS, writeRecord } from "../../shared/storage/database";

export async function loadAssetFile(assetId: string) {
  return (await readRecord<Blob>(ASSET_FILE_STORE, assetId)) ?? null;
}

export async function saveAssetFile(assetId: string, file: Blob) {
  return writeRecord(ASSET_FILE_STORE, assetId, file);
}

export async function removeAssetFile(assetId: string) {
  await Promise.all([
    deleteRecord(ASSET_FILE_STORE, assetId),
    deleteRecord(STORE_ASSET_THUMBNAILS, assetId),
  ]);
}

export function loadAssetThumbnail(assetId: string) {
  return readRecord<Blob>(STORE_ASSET_THUMBNAILS, assetId);
}

export function saveAssetThumbnail(assetId: string, thumbnail: Blob) {
  return writeRecord(STORE_ASSET_THUMBNAILS, assetId, thumbnail);
}
