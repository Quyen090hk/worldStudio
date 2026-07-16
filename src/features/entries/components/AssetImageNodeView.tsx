import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { ImageOff } from "lucide-react";
import { useI18n } from "../../../shared/i18n";
import { useAssetObjectUrl } from "./useAssetObjectUrl";

export function AssetImageNodeView({ node, selected }: NodeViewProps) {
  const { t } = useI18n();
  const assetId = String(node.attrs.assetId ?? "");
  const title = String(node.attrs.title ?? "");
  const alt = String(node.attrs.alt ?? title);
  const { url, loaded } = useAssetObjectUrl(assetId);

  return (
    <NodeViewWrapper
      as="figure"
      className={`asset-image-block ${selected ? "asset-image-block-selected" : ""}`}
      data-asset-image="true"
    >
      {url ? (
        <img src={url} alt={alt} draggable={false} />
      ) : (
        <div className="asset-image-placeholder">
          <ImageOff size={24} />
          <span>{loaded ? t("editor.missingImage") : t("common.loading")}</span>
        </div>
      )}
      {title ? <figcaption>{title}</figcaption> : null}
    </NodeViewWrapper>
  );
}
