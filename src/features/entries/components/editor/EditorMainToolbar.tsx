import type { Editor } from "@tiptap/react";
import { Pilcrow, Plus, Redo2, Search, Undo2 } from "lucide-react";
import { useI18n } from "../../../../shared/i18n";
import { EditorToolbarButton } from "./EditorToolbarButton";
import { SelectMenu } from "../../../../shared/components/SelectMenu";

export function EditorMainToolbar({ editor, insertOpen, findOpen, onToggleInsert, onToggleFind }: { editor: Editor; insertOpen: boolean; findOpen: boolean; onToggleInsert: () => void; onToggleFind: () => void }) {
  const { t } = useI18n();
  const block = editor.isActive("heading", { level: 1 }) ? "heading1" : editor.isActive("heading", { level: 2 }) ? "heading2" : editor.isActive("heading", { level: 3 }) ? "heading3" : "paragraph";
  function setBlock(type: string) {
    const chain = editor.chain().focus();
    if (type === "heading1") chain.setHeading({ level: 1 }).run(); else if (type === "heading2") chain.setHeading({ level: 2 }).run(); else if (type === "heading3") chain.setHeading({ level: 3 }).run(); else chain.setParagraph().run();
  }
  return <div className="rich-text-editor-toolbar ws-floating-control sticky top-3 z-10 mx-auto mb-4 flex w-full max-w-5xl items-center justify-between gap-2 p-1.5">
    <div className="flex min-w-0 items-center gap-1">
      <div className="flex h-9 items-center gap-1 text-[var(--text-muted)]"><Pilcrow size={16} className="ml-2 shrink-0" /><SelectMenu value={block} onChange={setBlock} ariaLabel={t("editor.blockStyle")} className="h-9 w-28" buttonClassName="min-h-9 border-0 bg-transparent px-2 text-xs font-semibold shadow-none hover:bg-[var(--surface-muted)]" options={[{ value: "paragraph", label: t("editor.commandParagraph") }, { value: "heading1", label: t("editor.heading1") }, { value: "heading2", label: t("editor.heading2") }, { value: "heading3", label: t("editor.heading3") }]} /></div>
      <button type="button" aria-expanded={insertOpen} onClick={onToggleInsert} className="flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"><Plus size={15} />{t("editor.commands")}</button>
    </div>
    <div className="flex items-center gap-1"><EditorToolbarButton title={t("editor.findInDocument")} active={findOpen} onClick={onToggleFind}><Search size={17} /></EditorToolbarButton><div className="mx-1 h-6 w-px bg-[var(--border)]" /><EditorToolbarButton title={t("editor.undo")} disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17} /></EditorToolbarButton><EditorToolbarButton title={t("editor.redo")} disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17} /></EditorToolbarButton></div>
  </div>;
}
