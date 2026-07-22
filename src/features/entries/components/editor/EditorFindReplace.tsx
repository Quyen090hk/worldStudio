import type { Editor } from "@tiptap/react";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "../../../../shared/i18n";
import { findDocumentTextMatches, type DocumentTextMatch } from "../../utils/documentSearch";

export function EditorFindReplace({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
    const update = () => setRevision((value) => value + 1);
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor]);

  const matches = useMemo<DocumentTextMatch[]>(() => {
    void revision;
    return findDocumentTextMatches(editor.state.doc, query);
  }, [editor, query, revision]);

  const selectMatch = useCallback((index: number) => {
    if (!matches.length) return;
    const nextIndex = (index + matches.length) % matches.length;
    editor.chain().focus().setTextSelection(matches[nextIndex]).scrollIntoView().run();
    setActiveIndex(nextIndex);
  }, [editor, matches]);

  const safeActiveIndex = matches.length
    ? Math.min(Math.max(activeIndex, 0), matches.length - 1)
    : 0;

  useEffect(() => {
    editor.commands.setSearchHighlights(matches, activeIndex);
    return () => {
      editor.commands.setSearchHighlights([], -1);
    };
  }, [activeIndex, editor, matches]);

  function replaceCurrent() {
    const match = matches[safeActiveIndex];
    if (!match) return;
    editor.chain().focus().setTextSelection(match).insertContent(replacement).run();
  }

  function replaceAll() {
    if (!matches.length) return;
    const transaction = editor.state.tr;
    [...matches].reverse().forEach((match) => {
      transaction.insertText(replacement, match.from, match.to);
    });
    editor.view.dispatch(transaction);
    editor.commands.focus();
  }

  return (
    <section aria-label={t("editor.findInDocument")} className="ws-popover-enter mx-auto mb-5 flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 shadow-lg">
      <Search size={16} className="ml-1 shrink-0 text-[var(--text-faint)]" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            selectMatch(activeIndex < 0 ? (event.shiftKey ? -1 : 0) : activeIndex + (event.shiftKey ? -1 : 1));
          } else if (event.key === "Escape") onClose();
        }}
        placeholder={t("editor.findPlaceholder")}
        className="h-9 min-w-40 flex-1 rounded-xl bg-[var(--surface-muted)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
      />
      <span className="min-w-16 text-center text-xs tabular-nums text-[var(--text-faint)]">
        {matches.length ? `${activeIndex < 0 ? 0 : safeActiveIndex + 1} / ${matches.length}` : t("editor.noMatches")}
      </span>
      <button type="button" onClick={() => selectMatch(activeIndex < 0 ? -1 : activeIndex - 1)} disabled={!matches.length} className="h-9 rounded-xl px-3 text-xs font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-35">{t("editor.previousMatch")}</button>
      <button type="button" onClick={() => selectMatch(activeIndex + 1)} disabled={!matches.length} className="h-9 rounded-xl px-3 text-xs font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-35">{t("editor.nextMatch")}</button>
      <input value={replacement} onChange={(event) => setReplacement(event.target.value)} placeholder={t("editor.replacePlaceholder")} className="h-9 min-w-40 flex-1 rounded-xl bg-[var(--surface-muted)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)]" />
      <button type="button" onClick={replaceCurrent} disabled={!matches.length} className="h-9 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-35">{t("editor.replace")}</button>
      <button type="button" onClick={replaceAll} disabled={!matches.length} className="h-9 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-35">{t("editor.replaceAll")}</button>
      <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-[var(--surface-muted)]" aria-label={t("common.close")}><X size={16} /></button>
    </section>
  );
}
