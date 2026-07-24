import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen } from "lucide-react";
import type { Editor } from "@tiptap/react";
import type { EntryType } from "../types";
import { useI18n } from "../../../shared/i18n";

export type ReferenceEntry = {
  id: string;
  title: string;
  type: EntryType;
};

type ReferenceMatch = {
  from: number;
  to: number;
  query: string;
  top: number;
  left: number;
};

export function EntryReferenceMenu({
  editor,
  entries,
}: {
  editor: Editor;
  entries: ReferenceEntry[];
}) {
  const { t } = useI18n();
  const [match, setMatch] = useState<ReferenceMatch | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const filteredEntries = useMemo(() => {
    const query = match?.query.trim().toLocaleLowerCase() ?? "";
    const candidates = query
      ? entries.filter((entry) =>
          `${entry.title} ${t(`type.${entry.type}`)}`
            .toLocaleLowerCase()
            .includes(query),
        )
      : entries;
    return candidates.slice(0, 12);
  }, [entries, match?.query, t]);

  const updateMatch = useCallback(() => {
    const { selection } = editor.state;
    if (!selection.empty || !editor.isFocused) {
      setMatch(null);
      return;
    }
    const { $from } = selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
    const found = textBefore.match(/\[\[([^\]\n]*)$/u);
    if (!found) {
      setMatch(null);
      return;
    }
    const from = $from.pos - found[0].length;
    const coords = editor.view.coordsAtPos(from);
    const editorBounds = editor.view.dom.getBoundingClientRect();
    const placeBesideEditor = window.innerWidth - editorBounds.right >= 304;
    setSelectedIndex(0);
    setMatch({
      from,
      to: $from.pos,
      query: found[1] ?? "",
      top: Math.max(
        12,
        Math.min(
          placeBesideEditor ? coords.top - 24 : coords.bottom + 8,
          window.innerHeight - 360,
        ),
      ),
      left: placeBesideEditor
        ? editorBounds.right + 16
        : Math.min(coords.left, window.innerWidth - 304),
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

  const choose = useCallback((entry: ReferenceEntry) => {
    if (!match) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: match.from, to: match.to })
      .insertContent({
        type: "text",
        text: entry.title,
        marks: [
          {
            type: "link",
            attrs: { href: `/entries/${encodeURIComponent(entry.id)}` },
          },
        ],
      })
      .insertContent(" ")
      .run();
    setMatch(null);
  }, [editor, match]);

  useEffect(() => {
    if (!match) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((index) =>
          filteredEntries.length ? (index + 1) % filteredEntries.length : 0,
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((index) =>
          filteredEntries.length
            ? (index - 1 + filteredEntries.length) % filteredEntries.length
            : 0,
        );
      } else if (event.key === "Enter" && filteredEntries[selectedIndex]) {
        event.preventDefault();
        choose(filteredEntries[selectedIndex]);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setMatch(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [choose, filteredEntries, match, selectedIndex]);

  if (!match) return null;

  return createPortal(
    <div
      role="listbox"
      aria-label={t("editor.referenceEntries")}
      className="ws-overlay-surface ws-popover-enter fixed z-[100] w-72 overflow-hidden p-1.5"
      style={{ top: match.top, left: Math.max(12, match.left) }}
    >
      <p className="px-3 py-2 text-[.68rem] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">
        {t("editor.referenceEntries")}
      </p>
      <div className="max-h-64 overflow-y-auto">
        {filteredEntries.length ? (
          filteredEntries.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(entry);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                index === selectedIndex
                  ? "bg-[var(--accent-soft)]"
                  : "hover:bg-[var(--surface-muted)]"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--accent)]">
                <BookOpen size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">{entry.title}</b>
                <span className="block text-xs text-[var(--text-faint)]">
                  {t(`type.${entry.type}`)}
                </span>
              </span>
            </button>
          ))
        ) : (
          <p className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
            {t("editor.noReferenceEntries")}
          </p>
        )}
      </div>
      <p className="border-t border-[var(--border)] px-3 pt-2 text-[.65rem] text-[var(--text-faint)]">
        {t("editor.referenceHint")}
      </p>
    </div>,
    document.body,
  );
}
