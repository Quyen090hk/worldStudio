import type { AssetKind, AssetRecord } from "./types";

export const MAX_ASSET_BYTES = 25 * 1024 * 1024;

export const ASSET_KINDS: AssetKind[] = [
  "image",
  "audio",
  "video",
  "document",
  "other",
];

export function getAssetKind(mediaType: string): AssetKind {
  if (mediaType.startsWith("image/")) return "image";
  if (mediaType.startsWith("audio/")) return "audio";
  if (mediaType.startsWith("video/")) return "video";
  if (
    mediaType.startsWith("text/") ||
    mediaType === "application/pdf" ||
    mediaType.includes("document") ||
    mediaType.includes("spreadsheet") ||
    mediaType.includes("presentation")
  ) {
    return "document";
  }
  return "other";
}

export function formatAssetSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function filterAssets(
  assets: AssetRecord[],
  query: string,
  kind: AssetKind | "all",
) {
  const tokens = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return assets
    .filter((asset) => kind === "all" || asset.kind === kind)
    .filter((asset) => {
      if (!tokens.length) return true;
      const searchable = `${asset.name} ${asset.mediaType} ${asset.tags.join(" ")}`
        .toLocaleLowerCase();
      return tokens.every((token) => searchable.includes(token));
    })
    .sort(
      (a, b) =>
        b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name),
    );
}
