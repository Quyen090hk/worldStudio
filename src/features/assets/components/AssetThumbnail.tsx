import { Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { loadAssetFile, loadAssetThumbnail } from "../assetStorage";

export function AssetThumbnail({ assetId, alt = "", className = "" }: { assetId: string; alt?: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    loadAssetThumbnail(assetId)
      .then((thumbnail) => thumbnail ?? loadAssetFile(assetId))
      .then((file) => {
        if (!active || !file) return;
        objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);
  if (!url) return <span className={`flex items-center justify-center bg-[var(--surface-muted)] text-[var(--text-faint)] ${className}`}><ImageIcon size={22} /></span>;
  return <img src={url} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}
