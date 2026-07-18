import { useEffect, useState } from "react";
import { ListTree } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useI18n } from "../../../shared/i18n";

type OutlineHeading = {
  id: string;
  level: number;
  position: number;
  text: string;
};

function collectHeadings(editor: Editor): OutlineHeading[] {
  const headings: OutlineHeading[] = [];
  editor.state.doc.descendants((node, position) => {
    if (node.type.name !== "heading") return;
    headings.push({
      id: `${position}-${node.attrs.level}`,
      level: Number(node.attrs.level) || 2,
      position,
      text: node.textContent.trim(),
    });
  });
  return headings;
}

export function DocumentOutline({ editor }: { editor: Editor }) {
  const { t } = useI18n();
  const [headings, setHeadings] = useState(() => collectHeadings(editor));

  useEffect(() => {
    const refresh = () => setHeadings(collectHeadings(editor));
    editor.on("update", refresh);
    return () => {
      editor.off("update", refresh);
    };
  }, [editor]);

  function jumpToHeading(position: number) {
    editor.commands.setTextSelection(position + 1);
    editor.view.dom.focus({ preventScroll: true });
    const domPosition = editor.view.domAtPos(position + 1);
    const element =
      domPosition.node instanceof HTMLElement
        ? domPosition.node
        : domPosition.node.parentElement;
    const heading = element?.closest("h1, h2, h3") ?? element;
    heading?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }

  // A one-item outline adds chrome without helping navigation. Reveal it only
  // once the document has enough structure to navigate.
  if (headings.length < 2) return null;

  return (
    <aside className="sticky top-20 hidden max-h-[calc(100vh-7rem)] self-start overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 xl:block">
      <div className="flex items-center gap-2 px-2 py-1 text-[.68rem] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">
        <ListTree size={14} />
        {t("editor.outline")}
      </div>
      <nav className="mt-2 space-y-0.5" aria-label={t("editor.outline")}>
          {headings.map((heading) => (
            <button
              key={heading.id}
              type="button"
              onClick={() => jumpToHeading(heading.position)}
              className="block w-full truncate rounded-lg py-1.5 pr-2 text-left text-xs text-[var(--text-muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
              style={{ paddingLeft: `${0.5 + (heading.level - 1) * 0.55}rem` }}
              title={heading.text || t("editor.untitledHeading")}
            >
              {heading.text || t("editor.untitledHeading")}
            </button>
          ))}
      </nav>
    </aside>
  );
}
