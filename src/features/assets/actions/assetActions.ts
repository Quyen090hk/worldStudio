import { getAssetKind, MAX_ASSET_BYTES } from "../assetModel";
import { removeAssetFile, saveAssetFile, saveAssetThumbnail } from "../assetStorage";
import { useAssetStore } from "../stores/useAssetStore";
import type { AssetRecord } from "../types";
import { useEntryStore } from "../../entries/stores/useEntryStore";
import { useWorldRegistryStore } from "../../world/stores/useWorldRegistryStore";
import { isAssetReferencedByStoredWorld } from "../../world/worldResourceReferences";

function createAssetId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `asset-${crypto.randomUUID()}`
    : `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function createImageThumbnail(file: File) {
  if (!file.type.startsWith("image/")) return null;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
}

export async function addAssetFile(file: File) {
  if (file.size > MAX_ASSET_BYTES) {
    throw new Error("asset-too-large");
  }

  const fingerprint = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer())),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  const duplicate = useAssetStore
    .getState()
    .assets.find((asset) => asset.fingerprint === fingerprint);
  if (duplicate) throw new Error(`asset-duplicate:${duplicate.name}`);

  const now = new Date().toISOString();
  const asset: AssetRecord = {
    id: createAssetId(),
    name: file.name,
    mediaType: file.type || "application/octet-stream",
    kind: getAssetKind(file.type),
    size: file.size,
    fingerprint,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };

  await saveAssetFile(asset.id, file);
  try {
    const thumbnail = await createImageThumbnail(file);
    if (thumbnail) await saveAssetThumbnail(asset.id, thumbnail);
  } catch {
    // Unsupported formats still keep their original file and remain usable.
  }
  useAssetStore.getState().addAsset(asset);
  return asset;
}

export async function deleteAssetFile(assetId: string) {
  const activeWorldId = useWorldRegistryStore.getState().activeWorldId;
  const sharedWithAnotherWorld = await isAssetReferencedByStoredWorld(assetId, activeWorldId);
  if (!sharedWithAnotherWorld) await removeAssetFile(assetId);
  useEntryStore.setState((state) => ({
    entries: state.entries.map((entry) => {
      const media = entry.media;
      const content = removeEmbeddedAsset(entry.content, assetId);
      if (!media) return content === entry.content ? entry : { ...entry, content };
      const nextMedia = {
        ...media,
        primaryAssetId: media.primaryAssetId === assetId ? undefined : media.primaryAssetId,
        bannerAssetId: media.bannerAssetId === assetId ? undefined : media.bannerAssetId,
        galleryAssetIds: media.galleryAssetIds?.filter((id) => id !== assetId),
      };
      return { ...entry, content, media: nextMedia };
    }),
  }));
  useAssetStore.getState().deleteAsset(assetId);
}

export function removeEmbeddedAsset(content: string, assetId: string) {
  const escaped = assetId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const figure = new RegExp(
    `<figure\\b(?=[^>]*\\bdata-asset-id=["']${escaped}["'])[^>]*>[\\s\\S]*?<\\/figure>`,
    "gi",
  );
  return content.replace(figure, "");
}
