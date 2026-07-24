import { EditorContent } from "@tiptap/react";
import { Highlighter, Image as ImageIcon, List, ListChecks, ListOrdered, Pilcrow, Quote, SeparatorHorizontal, ShieldAlert, Table2 } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import { useI18n } from "../../../shared/i18n";
import { useAssetStore } from "../../assets/stores/useAssetStore";
import type { EntryType } from "../types";
import { EntryReferenceMenu, type ReferenceEntry } from "./EntryReferenceMenu";
import { EditorBubbleMenu } from "./editor/EditorBubbleMenu";
import { EditorInsertPanel, type EditorInsertAction } from "./editor/EditorInsertPanel";
import { EditorMainToolbar } from "./editor/EditorMainToolbar";
import { EditorSlashMenu } from "./editor/EditorSlashMenu";
import { EditorTableMenu } from "./editor/EditorTableMenu";
import { useRichTextEditor } from "./editor/useRichTextEditor";
import { insertWorldBlock } from "./editor/insertWorldBlock";

const EditorAssetPicker = lazy(() => import("./editor/EditorAssetPicker").then((module) => ({
  default: module.EditorAssetPicker,
})));
const EditorFindReplace = lazy(() => import("./editor/EditorFindReplace").then((module) => ({
  default: module.EditorFindReplace,
})));
const EditorWorldBlockMenu = lazy(() => import("./editor/EditorWorldBlockMenu").then((module) => ({
  default: module.EditorWorldBlockMenu,
})));
const DocumentOutline = lazy(() => import("./DocumentOutline").then((module) => ({
  default: module.DocumentOutline,
})));

type RichTextEditorProps = { value: string; onChange?: (value: string) => void; editable?: boolean; placeholder?: string; referenceEntries?: ReferenceEntry[]; entryType?: EntryType };

export function RichTextEditor({ value, onChange, editable = true, placeholder = "Write your lore notes...", referenceEntries = [], entryType }: RichTextEditorProps) {
  const { t } = useI18n();
  const [findOpen, setFindOpen] = useState(false);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const assets = useAssetStore((state) => state.assets);
  const imageAssets = useMemo(() => assets.filter((asset) => asset.kind === "image"), [assets]);
  const { editor, limitBlocked } = useRichTextEditor({
    value,
    onChange,
    editable,
    placeholder: placeholder === "Write your lore notes..." ? t("editor.placeholder") : placeholder,
    taskCompletedLabel: t("editor.taskCompleted"),
    taskPendingLabel: t("editor.taskPending"),
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed || !editable) return;
    const openFind = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "f" && editor.isFocused) { event.preventDefault(); setFindOpen(true); }
    };
    window.addEventListener("keydown", openFind, true);
    return () => window.removeEventListener("keydown", openFind, true);
  }, [editable, editor]);

  if (!editor || editor.isDestroyed) return <div aria-busy="true" className="min-h-[36rem] w-full rounded-[1.35rem] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_72%,transparent)]" />;

  const recommendations: Partial<Record<EntryType, string[]>> = {
    Character: ["worldVoice", "worldMystery", "worldCanon"],
    Location: ["worldSensory", "worldCulture", "worldCanon"],
    Organization: ["worldFaction", "worldCulture", "worldCausality"],
    Item: ["worldArtifact", "worldCanon", "worldMystery"],
    Event: ["worldCausality", "worldFaction", "worldMystery"],
  };
  const recommended = new Set(entryType ? recommendations[entryType] : []);
  const baseInsertActions: EditorInsertAction[] = [
    { id: "worldCanon", group: "world", label: t("editor.worldCanon"), description: t("editor.worldCanonHelp"), icon: Highlighter, run: () => insertWorldBlock(editor, "canon", t("editor.worldCanon"), t("editor.worldCanonPrompt")) },
    { id: "worldVoice", group: "world", label: t("editor.worldVoice"), description: t("editor.worldVoiceHelp"), icon: Quote, run: () => insertWorldBlock(editor, "voice", t("editor.worldVoice"), t("editor.worldVoicePrompt")) },
    { id: "worldSensory", group: "world", label: t("editor.worldSensory"), description: t("editor.worldSensoryHelp"), icon: Pilcrow, run: () => insertWorldBlock(editor, "sensory", t("editor.worldSensory"), t("editor.worldSensoryPrompt")) },
    { id: "worldCausality", group: "world", label: t("editor.worldCausality"), description: t("editor.worldCausalityHelp"), icon: SeparatorHorizontal, run: () => insertWorldBlock(editor, "causality", t("editor.worldCausality"), t("editor.worldCausalityPrompt")) },
    { id: "worldMystery", group: "world", label: t("editor.worldMystery"), description: t("editor.worldMysteryHelp"), icon: ShieldAlert, run: () => insertWorldBlock(editor, "mystery", t("editor.worldMystery"), t("editor.worldMysteryPrompt")) },
    { id: "worldFaction", group: "world", label: t("editor.worldFaction"), description: t("editor.worldFactionHelp"), icon: List, run: () => insertWorldBlock(editor, "faction", t("editor.worldFaction"), t("editor.worldFactionPrompt")) },
    { id: "worldArtifact", group: "world", label: t("editor.worldArtifact"), description: t("editor.worldArtifactHelp"), icon: Table2, run: () => insertWorldBlock(editor, "artifact", t("editor.worldArtifact"), t("editor.worldArtifactPrompt")) },
    { id: "worldCulture", group: "world", label: t("editor.worldCulture"), description: t("editor.worldCultureHelp"), icon: ListOrdered, run: () => insertWorldBlock(editor, "culture", t("editor.worldCulture"), t("editor.worldCulturePrompt")) },
    { id: "bullet", label: t("editor.bulletList"), icon: List, run: () => { editor.chain().focus().toggleBulletList().run(); } },
    { id: "ordered", label: t("editor.orderedList"), icon: ListOrdered, run: () => { editor.chain().focus().toggleOrderedList().run(); } },
    { id: "tasks", label: t("editor.taskList"), icon: ListChecks, run: () => { editor.chain().focus().toggleTaskList().run(); } },
    { id: "quote", label: t("editor.quote"), icon: Quote, run: () => { editor.chain().focus().toggleBlockquote().run(); } },
    { id: "note", label: t("editor.calloutNote"), icon: Highlighter, run: () => { editor.chain().focus().setBlockquote().updateAttributes("blockquote", { callout: "note" }).run(); } },
    { id: "rule", label: t("editor.horizontalRule"), icon: SeparatorHorizontal, run: () => { editor.chain().focus().setHorizontalRule().run(); } },
    { id: "table", label: t("editor.table"), icon: Table2, run: () => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); } },
    { id: "image", label: t("editor.insertImage"), icon: ImageIcon, run: () => { setAssetPickerOpen(true); } },
  ];
  const insertActions = baseInsertActions.map((action) => ({
    ...action,
    recommended: recommended.has(action.id),
  }));

  return <div className="rich-text-editor">
    {editable ? <EditorSlashMenu editor={editor} /> : null}
    {editable && referenceEntries.length ? <EntryReferenceMenu editor={editor} entries={referenceEntries} /> : null}
    <EditorBubbleMenu editor={editor} />
    {editable ? <Suspense fallback={null}><EditorWorldBlockMenu editor={editor} /></Suspense> : null}
    {editable ? <EditorMainToolbar editor={editor} insertOpen={insertOpen} findOpen={findOpen} onToggleInsert={() => { setInsertOpen((open) => !open); setFindOpen(false); }} onToggleFind={() => { setFindOpen((open) => !open); setInsertOpen(false); }} /> : null}
    {editable && insertOpen ? <EditorInsertPanel actions={insertActions} onClose={() => setInsertOpen(false)} /> : null}
    {limitBlocked ? <div role="alert" className="ws-popover-enter mx-auto mb-5 flex w-full max-w-3xl items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-[var(--text-muted)]"><ShieldAlert size={17} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" /><span><b className="block text-[var(--text)]">{t("editor.documentLimitTitle")}</b>{t("editor.documentLimitHelp")}</span></div> : null}
    {editable && findOpen ? <Suspense fallback={null}><EditorFindReplace editor={editor} onClose={() => setFindOpen(false)} /></Suspense> : null}
    {editable ? <EditorTableMenu editor={editor} /> : null}
    {editable && assetPickerOpen ? <Suspense fallback={null}><EditorAssetPicker editor={editor} assets={imageAssets} onClose={() => setAssetPickerOpen(false)} /></Suspense> : null}
    <div className="rich-text-editor-layout mx-auto grid w-full max-w-6xl gap-5"><EditorContent editor={editor} className={["min-h-[36rem] w-full rounded-[1.35rem] border border-transparent bg-[color-mix(in_srgb,var(--surface-solid)_76%,transparent)] px-5 pb-32 pt-7 sm:px-8 sm:pt-8 lg:px-10", editable ? "focus-within:bg-[color-mix(in_srgb,var(--surface-solid)_90%,transparent)]" : ""].join(" ")} /><Suspense fallback={null}><DocumentOutline editor={editor} /></Suspense></div>
  </div>;
}
