import type { Editor } from "@tiptap/react";

import { useI18n } from "../../../../shared/i18n";

export function EditorTableMenu({ editor }: { editor: Editor }) {
  const { t } = useI18n();

  if (!editor.isActive("table")) return null;

  return (
    <div className="ws-popover-enter mx-auto mb-5 flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-1.5 shadow-md">
      <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="h-9 rounded-xl px-3 text-xs font-semibold hover:bg-[var(--surface-muted)]">{t("editor.addRow")}</button>
      <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="h-9 rounded-xl px-3 text-xs font-semibold hover:bg-[var(--surface-muted)]">{t("editor.deleteRow")}</button>
      <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="h-9 rounded-xl px-3 text-xs font-semibold hover:bg-[var(--surface-muted)]">{t("editor.addColumn")}</button>
      <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="h-9 rounded-xl px-3 text-xs font-semibold hover:bg-[var(--surface-muted)]">{t("editor.deleteColumn")}</button>
      <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="h-9 rounded-xl px-3 text-xs font-semibold text-red-500 hover:bg-red-500/10">{t("editor.deleteTable")}</button>
    </div>
  );
}
