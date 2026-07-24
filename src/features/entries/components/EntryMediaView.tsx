import { AssetThumbnail } from "../../assets/components/AssetThumbnail";
import type { Entry } from "../types";

export function EntryCardVisual({ entry }: { entry: Entry }) {
  const assetId = entry.media?.primaryAssetId;
  if (!assetId) return null;
  const aspect = entry.type === "Character" ? "aspect-[3/4]" : entry.type === "Organization" ? "aspect-square" : "aspect-[4/3]";
  return <AssetThumbnail assetId={assetId} alt={entry.title} className={`w-16 rounded-xl ${aspect}`} />;
}

export function EntryHeroMedia({ entry }: { entry: Entry }) {
  const bannerId = entry.media?.bannerAssetId;
  const primaryId = entry.media?.primaryAssetId;
  if (!bannerId && !primaryId) return null;
  return <div className="mb-7 overflow-hidden rounded-[var(--radius-surface)] border border-[var(--border)]">
    {bannerId ? <AssetThumbnail assetId={bannerId} alt="" className="aspect-[21/7] w-full" /> : null}
    {primaryId ? <div className={`${bannerId ? "-mt-14 ml-6 mb-5" : "p-5"} relative w-fit`}><AssetThumbnail assetId={primaryId} alt={entry.title} className={`${entry.type === "Character" ? "h-32 w-24" : "h-24 w-24"} rounded-[var(--radius-control)] border-4 border-[var(--surface-solid)] shadow-[var(--shadow-soft)]`} /></div> : null}
  </div>;
}

export function EntryGallery({ entry }: { entry: Entry }) {
  const ids = entry.media?.galleryAssetIds?.filter(Boolean) ?? [];
  if (!ids.length) return null;
  return <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">{ids.map((id) => <AssetThumbnail key={id} assetId={id} alt="" className="aspect-[4/3] w-full rounded-xl border border-[var(--border)]" />)}</section>;
}
