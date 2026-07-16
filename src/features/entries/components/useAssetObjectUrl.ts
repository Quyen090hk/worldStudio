import { useEffect, useState } from "react";
import { loadAssetFile } from "../../assets/assetStorage";

export function useAssetObjectUrl(assetId: string) {
  const [result, setResult] = useState({ assetId, url: null as string | null, loaded: false });

  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    loadAssetFile(assetId)
      .then((file) => {
        if (!active || !file) return;
        objectUrl = URL.createObjectURL(file);
        setResult({ assetId, url: objectUrl, loaded: true });
      })
      .catch(() => null)
      .finally(() => {
        if (active && !objectUrl) setResult({ assetId, url: null, loaded: true });
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);

  return result.assetId === assetId
    ? { url: result.url, loaded: result.loaded }
    : { url: null, loaded: false };
}
