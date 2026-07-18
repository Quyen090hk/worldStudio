import { ImagePlus, Images, Trash2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../../shared/i18n";
import { AssetPicker } from "../../assets/components/AssetPicker";
import { AssetThumbnail } from "../../assets/components/AssetThumbnail";
import type { EntryMedia, EntryType } from "../types";

type Slot = "primary" | "banner" | "gallery";

export function EntryMediaEditor({ type, media, onChange }: { type: EntryType; media: EntryMedia; onChange: (media: EntryMedia) => void }) {
  const { t } = useI18n();
  const [slot, setSlot] = useState<Slot | null>(null);
  const primaryLabel = type === "Character" ? t("media.portrait") : type === "Organization" ? t("media.emblem") : t("media.primary");
  return <section>
    <h3 className="text-sm font-semibold">{t("media.title")}</h3><p className="mt-1 text-xs text-[var(--text-faint)]">{t("media.help")}</p>
    <div className="mt-3 grid grid-cols-2 gap-3">
      <MediaSlot label={primaryLabel} assetId={media.primaryAssetId} aspect="aspect-[4/3]" onChoose={() => setSlot("primary")} onRemove={() => onChange({ ...media, primaryAssetId: undefined })} />
      <MediaSlot label={t("media.banner")} assetId={media.bannerAssetId} aspect="aspect-[4/3]" onChoose={() => setSlot("banner")} onRemove={() => onChange({ ...media, bannerAssetId: undefined })} />
    </div>
    <button type="button" onClick={() => setSlot("gallery")} className="mt-3 flex h-10 w-full items-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-muted)]"><Images size={15} />{t("media.gallery")}<span className="ml-auto">{media.galleryAssetIds?.length ?? 0}</span></button>
    {slot ? <AssetPicker open multiple={slot === "gallery"} selectedIds={slot === "gallery" ? media.galleryAssetIds : slot === "primary" && media.primaryAssetId ? [media.primaryAssetId] : slot === "banner" && media.bannerAssetId ? [media.bannerAssetId] : []} onClose={() => setSlot(null)} onSelect={(ids) => { if (slot === "primary") onChange({ ...media, primaryAssetId: ids[0] }); if (slot === "banner") onChange({ ...media, bannerAssetId: ids[0] }); if (slot === "gallery") onChange({ ...media, galleryAssetIds: ids }); }} /> : null}
  </section>;
}

function MediaSlot({ label, assetId, aspect, onChoose, onRemove }: { label: string; assetId?: string; aspect: string; onChoose: () => void; onRemove: () => void }) {
  return <div className="overflow-hidden rounded-xl border border-[var(--border)]"><button type="button" onClick={onChoose} className={`relative block w-full ${aspect}`}>{assetId ? <AssetThumbnail assetId={assetId} alt="" className="h-full w-full" /> : <span className="flex h-full flex-col items-center justify-center bg-[var(--surface-muted)] text-xs text-[var(--text-faint)]"><ImagePlus size={21} className="mb-2" />{label}</span>}</button><div className="flex items-center gap-2 px-2.5 py-2"><span className="min-w-0 flex-1 truncate text-[10px] font-semibold">{label}</span>{assetId ? <button type="button" onClick={onRemove} className="text-red-400"><Trash2 size={12} /></button> : null}</div></div>;
}
