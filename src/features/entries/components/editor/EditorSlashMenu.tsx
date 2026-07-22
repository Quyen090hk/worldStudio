import type { Editor } from "@tiptap/react";
import { Code, Heading1, Heading2, Heading3, Highlighter, List, ListChecks, ListOrdered, Pilcrow, Quote, SeparatorHorizontal, ShieldAlert, Table2, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useI18n } from "../../../../shared/i18n";

type SlashMatch = { from: number; to: number; query: string; top: number; left: number };
type SlashItem = { id: string; label: string; description: string; icon: LucideIcon; run: (editor: Editor) => void };

export function EditorSlashMenu({ editor }: { editor: Editor }) {
  const { t } = useI18n();
  const [match, setMatch] = useState<SlashMatch | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const previousQueryRef = useRef<string | null>(null);
  const items = useMemo<SlashItem[]>(() => [
    { id: "paragraph", label: t("editor.commandParagraph"), description: t("editor.commandParagraphHelp"), icon: Pilcrow, run: (instance) => { instance.chain().focus().setParagraph().run(); } },
    { id: "heading1", label: t("editor.heading1"), description: t("editor.commandHeading1Help"), icon: Heading1, run: (instance) => { instance.chain().focus().setHeading({ level: 1 }).run(); } },
    { id: "heading2", label: t("editor.heading2"), description: t("editor.commandHeading2Help"), icon: Heading2, run: (instance) => { instance.chain().focus().setHeading({ level: 2 }).run(); } },
    { id: "heading3", label: t("editor.heading3"), description: t("editor.commandHeading3Help"), icon: Heading3, run: (instance) => { instance.chain().focus().setHeading({ level: 3 }).run(); } },
    { id: "bulletList", label: t("editor.bulletList"), description: t("editor.commandBulletHelp"), icon: List, run: (instance) => { instance.chain().focus().toggleBulletList().run(); } },
    { id: "orderedList", label: t("editor.orderedList"), description: t("editor.commandOrderedHelp"), icon: ListOrdered, run: (instance) => { instance.chain().focus().toggleOrderedList().run(); } },
    { id: "taskList", label: t("editor.taskList"), description: t("editor.commandTaskListHelp"), icon: ListChecks, run: (instance) => { instance.chain().focus().toggleTaskList().run(); } },
    { id: "table", label: t("editor.table"), description: t("editor.commandTableHelp"), icon: Table2, run: (instance) => { instance.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); } },
    { id: "quote", label: t("editor.quote"), description: t("editor.commandQuoteHelp"), icon: Quote, run: (instance) => { instance.chain().focus().toggleBlockquote().run(); } },
    { id: "calloutNote", label: t("editor.calloutNote"), description: t("editor.calloutNoteHelp"), icon: Highlighter, run: (instance) => { instance.chain().focus().setBlockquote().updateAttributes("blockquote", { callout: "note" }).run(); } },
    { id: "calloutWarning", label: t("editor.calloutWarning"), description: t("editor.calloutWarningHelp"), icon: ShieldAlert, run: (instance) => { instance.chain().focus().setBlockquote().updateAttributes("blockquote", { callout: "warning" }).run(); } },
    { id: "codeBlock", label: t("editor.codeBlock"), description: t("editor.commandCodeHelp"), icon: Code, run: (instance) => { instance.chain().focus().toggleCodeBlock().run(); } },
    { id: "horizontalRule", label: t("editor.horizontalRule"), description: t("editor.commandRuleHelp"), icon: SeparatorHorizontal, run: (instance) => { instance.chain().focus().setHorizontalRule().run(); } },
  ], [t]);

  const filteredItems = useMemo(() => {
    const query = match?.query.trim().toLocaleLowerCase() ?? "";
    return query ? items.filter((item) => `${item.label} ${item.description}`.toLocaleLowerCase().includes(query)) : items;
  }, [items, match?.query]);

  const updateMatch = useCallback(() => {
    const { selection } = editor.state;
    if (!selection.empty || !editor.isFocused) {
      previousQueryRef.current = null;
      setMatch(null);
      return;
    }
    const { $from } = selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
    const found = textBefore.match(/(?:^|\s)\/([^\s/]*)$/u);
    if (!found) {
      previousQueryRef.current = null;
      setMatch(null);
      return;
    }
    const slashOffset = found[0].lastIndexOf("/");
    const from = $from.pos - (found[0].length - slashOffset);
    const coords = editor.view.coordsAtPos(from);
    const bounds = editor.view.dom.getBoundingClientRect();
    const beside = window.innerWidth - bounds.right >= 304;
    const query = found[1] ?? "";
    if (previousQueryRef.current !== query) {
      previousQueryRef.current = query;
      setSelectedIndex(0);
    }
    setMatch({
      from,
      to: $from.pos,
      query,
      top: Math.max(12, Math.min(beside ? coords.top - 24 : coords.bottom + 8, window.innerHeight - 360)),
      left: beside ? bounds.right + 16 : Math.min(coords.left, window.innerWidth - 304),
    });
  }, [editor]);

  useEffect(() => {
    editor.on("update", updateMatch);
    editor.on("selectionUpdate", updateMatch);
    editor.on("focus", updateMatch);
    editor.on("blur", updateMatch);
    window.addEventListener("resize", updateMatch);
    window.addEventListener("scroll", updateMatch, true);
    return () => {
      editor.off("update", updateMatch);
      editor.off("selectionUpdate", updateMatch);
      editor.off("focus", updateMatch);
      editor.off("blur", updateMatch);
      window.removeEventListener("resize", updateMatch);
      window.removeEventListener("scroll", updateMatch, true);
    };
  }, [editor, updateMatch]);

  const choose = useCallback((item: SlashItem) => {
    if (!match) return;
    editor.chain().focus().deleteRange({ from: match.from, to: match.to }).run();
    item.run(editor);
    setMatch(null);
  }, [editor, match]);

  useEffect(() => {
    if (!match) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") { event.preventDefault(); setSelectedIndex((index) => filteredItems.length ? (index + 1) % filteredItems.length : 0); }
      else if (event.key === "ArrowUp") { event.preventDefault(); setSelectedIndex((index) => filteredItems.length ? (index - 1 + filteredItems.length) % filteredItems.length : 0); }
      else if (event.key === "Enter" && filteredItems[selectedIndex]) { event.preventDefault(); choose(filteredItems[selectedIndex]); }
      else if (event.key === "Escape") { event.preventDefault(); setMatch(null); }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [choose, filteredItems, match, selectedIndex]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector<HTMLElement>(`[data-command-index="${selectedIndex}"]`);
    if (!list || !selected) return;

    const listBounds = list.getBoundingClientRect();
    const itemBounds = selected.getBoundingClientRect();
    if (itemBounds.top < listBounds.top) list.scrollTop -= listBounds.top - itemBounds.top;
    else if (itemBounds.bottom > listBounds.bottom) list.scrollTop += itemBounds.bottom - listBounds.bottom;
  }, [filteredItems.length, selectedIndex]);

  if (!match) return null;
  return createPortal(
    <div role="listbox" aria-label={t("editor.commands")} aria-activedescendant={filteredItems[selectedIndex] ? `editor-command-${filteredItems[selectedIndex].id}` : undefined} className="ws-popover-enter fixed z-[100] w-72 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-1.5 shadow-2xl" style={{ top: match.top, left: Math.max(12, match.left) }}>
      <p className="px-3 py-2 text-[.68rem] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">{t("editor.commands")}</p>
      <div ref={listRef} className="max-h-64 overflow-y-auto">
        {filteredItems.length ? filteredItems.map((item, index) => {
          const Icon = item.icon;
          return <button id={`editor-command-${item.id}`} key={item.id} data-command-index={index} type="button" role="option" aria-selected={index === selectedIndex} onMouseDown={(event) => { event.preventDefault(); choose(item); }} onPointerMove={() => setSelectedIndex(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${index === selectedIndex ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-muted)]"}`}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--accent)]"><Icon size={16} /></span>
            <span className="min-w-0"><b className="block text-sm">{item.label}</b><span className="block truncate text-xs text-[var(--text-faint)]">{item.description}</span></span>
          </button>;
        }) : <p className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">{t("editor.noCommands")}</p>}
      </div>
      <p className="border-t border-[var(--border)] px-3 pt-2 text-[.65rem] text-[var(--text-faint)]">{t("editor.commandHint")}</p>
    </div>,
    document.body,
  );
}
