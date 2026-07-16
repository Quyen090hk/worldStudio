import {
  MAP_IMAGE_STORE,
} from "../../../shared/storage/assetDatabase";
import { deleteRecord, readRecord, writeRecord } from "../../../shared/storage/database";

export async function loadMapImage(mapId: string) {
  return (await readRecord<Blob>(MAP_IMAGE_STORE, mapId)) ?? null;
}

export async function saveMapImage(mapId: string, image: Blob) {
  return writeRecord(MAP_IMAGE_STORE, mapId, image);
}

export async function removeMapImage(mapId: string) {
  return deleteRecord(MAP_IMAGE_STORE, mapId);
}
