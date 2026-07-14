import { getAssetKind, MAX_ASSET_BYTES } from "../assetModel";
import { removeAssetFile, saveAssetFile } from "../assetStorage";
import { useAssetStore } from "../stores/useAssetStore";
import type { AssetRecord } from "../types";

function createAssetId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `asset-${crypto.randomUUID()}`
    : `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function addAssetFile(file: File) {
  if (file.size > MAX_ASSET_BYTES) {
    throw new Error("asset-too-large");
  }

  const now = new Date().toISOString();
  const asset: AssetRecord = {
    id: createAssetId(),
    name: file.name,
    mediaType: file.type || "application/octet-stream",
    kind: getAssetKind(file.type),
    size: file.size,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };

  await saveAssetFile(asset.id, file);
  useAssetStore.getState().addAsset(asset);
  return asset;
}

export async function deleteAssetFile(assetId: string) {
  await removeAssetFile(assetId);
  useAssetStore.getState().deleteAsset(assetId);
}
