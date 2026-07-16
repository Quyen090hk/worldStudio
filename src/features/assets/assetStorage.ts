import {
  ASSET_FILE_STORE,
} from "../../shared/storage/assetDatabase";
import { deleteRecord, readRecord, writeRecord } from "../../shared/storage/database";

export async function loadAssetFile(assetId: string) {
  return (await readRecord<Blob>(ASSET_FILE_STORE, assetId)) ?? null;
}

export async function saveAssetFile(assetId: string, file: Blob) {
  return writeRecord(ASSET_FILE_STORE, assetId, file);
}

export async function removeAssetFile(assetId: string) {
  return deleteRecord(ASSET_FILE_STORE, assetId);
}
