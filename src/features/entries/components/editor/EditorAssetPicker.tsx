import type { Editor } from "@tiptap/react";
import { Image as ImageIcon, X } from "lucide-react";

import type { AssetRecord } from "../../../assets/types";
import { useI18n } from "../../../../shared/i18n";

export function EditorAssetPicker({
  editor,
  assets,
  onClose,
}: {
  editor: Editor;
  assets: AssetRecord[];
  onClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <section className="ws-overlay-surface ws-popover-enter mx-auto mb-5 w-full max-w-3xl p-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">{t("editor.insertImage")}</p>
          <p className="mt-1 text-xs text-[var(--text-faint)]">{t("editor.insertImageHelp")}</p>
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-[var(--surface-muted)]" aria-label={t("common.close")}>
          <X size={16} />
        </button>
      </div>
      {assets.length ? (
        <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => {
                editor.chain().focus().insertContent({
                  type: "assetImage",
                  attrs: { assetId: asset.id, title: asset.name, alt: asset.name },
                }).run();
                onClose();
              }}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-solid)] text-[var(--accent)]"><ImageIcon size={18} /></span>
              <span className="min-w-0"><b className="block truncate text-sm">{asset.name}</b><span className="text-xs text-[var(--text-faint)]">{Math.max(1, Math.round(asset.size / 1024))} KB</span></span>
            </button>
          ))}
        </div>
      ) : (
        <p className="ws-subtle-state mt-3 border-dashed p-5 text-center text-sm text-[var(--text-faint)]">{t("editor.noImages")}</p>
      )}
    </section>
  );
}
