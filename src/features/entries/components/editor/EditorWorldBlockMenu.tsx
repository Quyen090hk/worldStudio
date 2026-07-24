import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useEffect, useState } from "react";

import { useI18n } from "../../../../shared/i18n";
import { SelectMenu } from "../../../../shared/components/SelectMenu";
import type { WorldBlockKind } from "../WorldbuildingBlock";
import { duplicateActiveWorldBlock, findActiveWorldBlock, moveActiveWorldBlock, type ActiveWorldBlock } from "./worldBlockOperations";

const kinds: WorldBlockKind[] = ["canon", "voice", "sensory", "causality", "mystery", "faction", "artifact", "culture"];

const translationSuffix: Record<WorldBlockKind, string> = {
  canon: "Canon",
  voice: "Voice",
  sensory: "Sensory",
  causality: "Causality",
  mystery: "Mystery",
  faction: "Faction",
  artifact: "Artifact",
  culture: "Culture",
};

export function EditorWorldBlockMenu({ editor }: { editor: Editor }) {
  const { t } = useI18n();
  const [activeBlock, setActiveBlock] = useState<ActiveWorldBlock | null>(() => findActiveWorldBlock(editor));

  useEffect(() => {
    const refresh = () => setActiveBlock(findActiveWorldBlock(editor));
    refresh();
    editor.on("selectionUpdate", refresh);
    editor.on("transaction", refresh);
    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", refresh);
    };
  }, [editor]);

  const labelFor = (value: WorldBlockKind) => t(`editor.world${translationSuffix[value]}`);

  function changeKind(next: WorldBlockKind) {
    setActiveBlock((current) => current ? { ...current, kind: next } : current);
    editor.chain().focus().updateAttributes("worldBlock", { kind: next, label: labelFor(next) }).run();
  }

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: instance }) => instance.isActive("worldBlock")}
      updateDelay={80}
      options={{ placement: "left", offset: 10 }}
      className="ws-overlay-surface ws-popover-enter flex items-center gap-1 p-1"
    >
      <SelectMenu
        value={activeBlock?.kind ?? "canon"}
        ariaLabel={t("editor.worldBlockType")}
        onChange={(value) => changeKind(value as WorldBlockKind)}
        className="h-8 min-w-28"
        buttonClassName="min-h-8 rounded-lg border-0 bg-transparent px-2 text-xs font-semibold shadow-none hover:bg-[var(--surface-muted)]"
        options={kinds.map((value) => ({ value, label: labelFor(value) }))}
      />
      <span className="h-5 w-px bg-[var(--border)]" />
      <button type="button" disabled={activeBlock?.previousSize === null} onClick={() => moveActiveWorldBlock(editor, -1)} title={`${t("editor.moveBlockUp")} · Alt+Shift+↑`} className="h-8 rounded-lg px-2 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-30" aria-label={t("editor.moveBlockUp")}>↑</button>
      <button type="button" disabled={activeBlock?.nextSize === null} onClick={() => moveActiveWorldBlock(editor, 1)} title={`${t("editor.moveBlockDown")} · Alt+Shift+↓`} className="h-8 rounded-lg px-2 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-30" aria-label={t("editor.moveBlockDown")}>↓</button>
      <button type="button" onClick={() => duplicateActiveWorldBlock(editor)} title={`${t("common.duplicate")} · Alt+Shift+D`} className="h-8 rounded-lg px-2 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]">{t("common.duplicate")}</button>
      <button type="button" onClick={() => editor.chain().focus().deleteNode("worldBlock").run()} className="h-8 rounded-lg px-2 text-xs font-semibold text-red-500 hover:bg-red-500/10">{t("common.delete")}</button>
    </BubbleMenu>
  );
}
