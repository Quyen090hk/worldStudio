import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Bold, Code, Highlighter, Italic, Link2, Strikethrough, Underline, Unlink } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../../../shared/i18n";
import { EditorToolbarButton } from "./EditorToolbarButton";

export function EditorBubbleMenu({ editor }: { editor: Editor }) {
  const { t } = useI18n();
  const [editingLink, setEditingLink] = useState(false);
  const [href, setHref] = useState("");
  function applyLink() {
    const value = href.trim();
    if (!value) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: /^(https?:\/\/|mailto:|\/)/i.test(value) ? value : `https://${value}` }).run();
    setEditingLink(false);
  }
  const button = (title: string, active: boolean, action: () => void, icon: React.ReactNode) => (
    <EditorToolbarButton title={title} active={active} onClick={action}>{icon}</EditorToolbarButton>
  );
  return <BubbleMenu editor={editor} updateDelay={120} options={{ placement: "top", offset: 8 }} className="ws-popover-enter flex items-center gap-0.5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-1 shadow-2xl">
    {editingLink ? <form className="flex items-center gap-1 p-0.5" onSubmit={(event) => { event.preventDefault(); applyLink(); }}>
      <Link2 size={15} className="ml-2 text-[var(--text-faint)]" />
      <input autoFocus value={href} onChange={(event) => setHref(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { setEditingLink(false); editor.commands.focus(); } }} placeholder={t("editor.linkPlaceholder")} aria-label={t("editor.linkAddress")} className="h-8 w-56 bg-transparent px-2 text-xs outline-none" />
      <button type="submit" className="h-8 rounded-lg bg-[var(--accent-soft)] px-3 text-xs font-semibold text-[var(--accent-strong)]">{t("common.apply")}</button>
    </form> : <>
      {button(t("editor.bold"), editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold size={16} />)}
      {button(t("editor.italic"), editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic size={16} />)}
      {button(t("editor.underline"), editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), <Underline size={16} />)}
      {button(t("editor.highlight"), editor.isActive("textHighlight"), () => editor.chain().focus().toggleTextHighlight().run(), <Highlighter size={16} />)}
      {button(t("editor.strike"), editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), <Strikethrough size={16} />)}
      {button(t("editor.inlineCode"), editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), <Code size={16} />)}
      {button(t("editor.editLink"), editor.isActive("link"), () => { setHref(String(editor.getAttributes("link").href ?? "")); setEditingLink(true); }, <Link2 size={16} />)}
      {editor.isActive("link") ? button(t("editor.removeLink"), false, () => editor.chain().focus().extendMarkRange("link").unsetLink().run(), <Unlink size={16} />) : null}
    </>}
  </BubbleMenu>;
}
