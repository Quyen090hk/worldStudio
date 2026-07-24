import { ArrowDown, ArrowUp, BookOpenText, ChevronRight, Download, FileText, FolderOpen, GripVertical, Pencil, Plus, RotateCcw, ScrollText, Settings2, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

import { MotionPage } from "../../shared/components/MotionPage";
import { useSoftDialog } from "../../shared/components/softDialogContext";
import { useI18n } from "../../shared/i18n";
import { useEntryStore } from "../entries/stores/useEntryStore";
import { RichTextEditor } from "../entries/components/RichTextEditor";
import { useTimelineStore } from "../timeline/stores/useTimelineStore";
import { useWorldRegistryStore } from "../world/stores/useWorldRegistryStore";
import { ManuscriptInspector } from "./components/ManuscriptInspector";
import { ManuscriptEpigraph } from "./components/ManuscriptEpigraph";
import { SelectMenu } from "../../shared/components/SelectMenu";
import { downloadManuscriptMarkdown } from "./manuscriptExport";
import { useManuscriptStore } from "./stores/useManuscriptStore";
import type { ManuscriptNode, ManuscriptNodeKind, ManuscriptStatus } from "./types";

function NodeIcon({ kind }: { kind: ManuscriptNodeKind }) {
  if (kind === "volume") return <FolderOpen size={15} />;
  if (kind === "chapter") return <FileText size={15} />;
  return <ScrollText size={14} />;
}

function countTextWords(value: string) {
  const text = value.replace(/<[^>]*>/gu, " ").replace(/[{}"':,]/gu, " ").replaceAll("[", " ").replaceAll("]", " ").trim();
  const latin = text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  const cjk = text.match(/[\p{Script=Han}]/gu)?.length ?? 0;
  return Math.max(latin, cjk);
}

export function ManuscriptPage() {
  const { t } = useI18n();
  const dialog = useSoftDialog();
  const worldId = useWorldRegistryStore((state) => state.activeWorldId);
  // Workspace switching restores this store as a unit; worldId remains provenance
  // for portable imports and does not hide an imported manuscript in its new world.
  const manuscripts = useManuscriptStore((state) => state.manuscripts);
  const nodes = useManuscriptStore((state) => state.nodes);
  const activeManuscriptByWorld = useManuscriptStore((state) => state.activeManuscriptByWorld);
  const activeNodeByManuscript = useManuscriptStore((state) => state.activeNodeByManuscript);
  const createManuscript = useManuscriptStore((state) => state.createManuscript);
  const updateManuscript = useManuscriptStore((state) => state.updateManuscript);
  const deleteManuscript = useManuscriptStore((state) => state.deleteManuscript);
  const createNode = useManuscriptStore((state) => state.createNode);
  const setActiveManuscript = useManuscriptStore((state) => state.setActiveManuscript);
  const setActiveNode = useManuscriptStore((state) => state.setActiveNode);
  const updateNode = useManuscriptStore((state) => state.updateNode);
  const moveNode = useManuscriptStore((state) => state.moveNode);
  const reorderNode = useManuscriptStore((state) => state.reorderNode);
  const deleteNode = useManuscriptStore((state) => state.deleteNode);
  const restoreNodes = useManuscriptStore((state) => state.restoreNodes);
  const entries = useEntryStore((state) => state.entries);
  const timelineItems = useTimelineStore((state) => state.items);
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [adding, setAdding] = useState<{ parentId: string | null; kind: ManuscriptNodeKind } | null>(null);
  const [nodeTitle, setNodeTitle] = useState("");
  const [deletedBranch, setDeletedBranch] = useState<ManuscriptNode[] | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  const activeManuscript = manuscripts.find((item) => item.id === activeManuscriptByWorld[worldId]) ?? manuscripts[0] ?? null;
  const manuscriptNodes = useMemo(() => activeManuscript ? nodes.filter((node) => node.manuscriptId === activeManuscript.id).sort((a, b) => a.order - b.order) : [], [activeManuscript, nodes]);
  const activeNode = manuscriptNodes.find((node) => node.id === (activeManuscript ? activeNodeByManuscript[activeManuscript.id] : "")) ?? manuscriptNodes.find((node) => node.kind !== "volume") ?? null;
  const referenceEntries = useMemo(() => entries.map((entry) => ({ id: entry.id, title: entry.title, type: entry.type })), [entries]);
  const totalWords = useMemo(() => manuscriptNodes.reduce((sum, node) => sum + countTextWords(node.content), 0), [manuscriptNodes]);

  function submitManuscript(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const manuscriptId = createManuscript(worldId, title, synopsis);
    createNode(manuscriptId, null, "chapter", t("manuscript.firstChapter"));
    setTitle(""); setSynopsis("");
  }

  function submitNode(event: FormEvent) {
    event.preventDefault();
    if (!activeManuscript || !adding || !nodeTitle.trim()) return;
    createNode(activeManuscript.id, adding.parentId, adding.kind, nodeTitle);
    setAdding(null); setNodeTitle("");
  }

  function childrenOf(parentId: string | null) { return manuscriptNodes.filter((node) => node.parentId === parentId); }
  function branchOf(nodeId: string) {
    const ids = new Set([nodeId]);
    for (let changed = true; changed;) {
      changed = false;
      for (const node of manuscriptNodes) if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) { ids.add(node.id); changed = true; }
    }
    return manuscriptNodes.filter((node) => ids.has(node.id));
  }
  async function removeActiveNode() {
    if (!activeNode) return;
    const branch = branchOf(activeNode.id);
    const confirmed = await dialog.confirm({ message: t("manuscript.deleteConfirm", { title: activeNode.title, count: Math.max(0, branch.length - 1) }), danger: true, confirmLabel: t("common.delete") });
    if (!confirmed) return;
    setDeletedBranch(branch);
    deleteNode(activeNode.id);
  }
  async function addManuscript() {
    const name = await dialog.prompt({ title: t("manuscript.newWork"), message: t("manuscript.newWorkPrompt"), placeholder: t("manuscript.titleLabel") });
    if (!name) return;
    const manuscriptId = createManuscript(worldId, name);
    createNode(manuscriptId, null, "chapter", t("manuscript.firstChapter"));
  }
  async function renameManuscript() {
    const name = await dialog.prompt({ title: t("manuscript.renameWork"), message: t("manuscript.renameWorkPrompt"), defaultValue: activeManuscript.title, placeholder: t("manuscript.titleLabel") });
    if (!name?.trim()) return;
    updateManuscript(activeManuscript.id, { title: name.trim() });
  }
  async function removeManuscript() {
    if (!await dialog.confirm({ message: t("manuscript.deleteWorkConfirm", { title: activeManuscript.title }), danger: true, confirmLabel: t("common.delete") })) return;
    deleteManuscript(activeManuscript.id);
  }
  function renderNode(node: ManuscriptNode, depth = 0): ReactNode {
    const children = childrenOf(node.id);
    const siblings = childrenOf(node.parentId);
    const siblingIndex = siblings.findIndex((item) => item.id === node.id);
    return <div key={node.id}>
      <div onDragOver={(event) => { if (draggedNodeId) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (draggedNodeId) reorderNode(draggedNodeId, node.id); setDraggedNodeId(null); }} className={`group flex min-h-10 w-full items-center rounded-xl text-sm transition ${draggedNodeId === node.id ? "opacity-45" : ""} ${activeNode?.id === node.id ? "bg-[var(--accent-soft)] text-[var(--text)]" : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"}`} style={{ paddingLeft: `${4 + depth * 18}px` }}>
        <span draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDraggedNodeId(node.id); }} onDragEnd={() => setDraggedNodeId(null)} title={t("manuscript.dragToReorder")} className="cursor-grab p-1 text-[var(--text-faint)] opacity-0 group-hover:opacity-100"><GripVertical size={13} /></span><button type="button" onClick={() => activeManuscript && setActiveNode(activeManuscript.id, node.id)} className="flex min-w-0 flex-1 items-center gap-2 self-stretch text-left"><span className="text-[var(--text-faint)]"><NodeIcon kind={node.kind} /></span><span className="min-w-0 flex-1 truncate font-medium">{node.title}</span></button>
        <span className="hidden items-center pr-1 group-hover:flex group-focus-within:flex"><button type="button" aria-label={t("manuscript.moveUp")} disabled={siblingIndex === 0} onClick={() => moveNode(node.id, -1)} className="rounded p-1 hover:bg-[var(--surface-solid)] disabled:opacity-25"><ArrowUp size={12} /></button><button type="button" aria-label={t("manuscript.moveDown")} disabled={siblingIndex === siblings.length - 1} onClick={() => moveNode(node.id, 1)} className="rounded p-1 hover:bg-[var(--surface-solid)] disabled:opacity-25"><ArrowDown size={12} /></button></span>{node.kind !== "scene" ? <ChevronRight size={13} className="mr-2 text-[var(--text-faint)]" /> : null}
      </div>
      {children.map((child) => renderNode(child, depth + 1))}
    </div>;
  }

  if (!activeManuscript) return <MotionPage className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-8"><section className="grid w-full max-w-5xl overflow-hidden rounded-[1.8rem] border border-[var(--border-strong)] bg-[var(--surface-solid)] shadow-[0_28px_80px_rgba(65,49,28,.12)] lg:grid-cols-[1.05fr_.95fr]">
    <div className="flex min-h-[30rem] flex-col justify-between border-b border-[var(--border)] p-8 lg:border-b-0 lg:border-r lg:p-10"><div><p className="ws-eyebrow">{t("manuscript.emptyEyebrow")}</p><h1 className="ws-display mt-4 max-w-md text-4xl font-semibold leading-tight">{t("manuscript.emptyTitle")}</h1><p className="mt-5 max-w-md text-sm leading-7 text-[var(--text-muted)]">{t("manuscript.emptyDescription")}</p></div><button type="button" onClick={() => window.location.assign("/entries")} className="w-fit text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">{t("manuscript.continueWorldbuilding")} →</button></div>
    <form onSubmit={submitManuscript} className="flex flex-col justify-center p-8 lg:p-10"><BookOpenText size={24} className="text-[var(--accent)]" /><h2 className="ws-display mt-5 text-2xl font-semibold">{t("manuscript.createTitle")}</h2><label className="mt-7 text-xs font-semibold text-[var(--text-faint)]">{t("manuscript.titleLabel")}<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className="ws-input mt-2 h-12 w-full rounded-xl px-4 text-sm" /></label><label className="mt-4 text-xs font-semibold text-[var(--text-faint)]">{t("manuscript.synopsisLabel")}<textarea value={synopsis} onChange={(event) => setSynopsis(event.target.value)} rows={4} className="ws-input mt-2 w-full resize-none rounded-xl px-4 py-3 text-sm" /></label><button type="submit" disabled={!title.trim()} className="ws-button-primary mt-6 h-12 rounded-full px-6 text-sm font-semibold disabled:opacity-40">{t("manuscript.createAction")}</button></form>
  </section></MotionPage>;

  return <MotionPage className="pb-6 pt-1"><ManuscriptEpigraph /><div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] pb-4"><div><p className="ws-eyebrow">{t("manuscript.eyebrow")}</p><div className="mt-1 flex items-center gap-1"><SelectMenu value={activeManuscript.id} onChange={(manuscriptId) => setActiveManuscript(worldId, manuscriptId)} ariaLabel={t("manuscript.eyebrow")} options={manuscripts.map((item) => ({ value: item.id, label: item.title }))} className="min-w-44 max-w-sm" buttonClassName="border-0 bg-transparent px-1 ws-display text-2xl font-semibold shadow-none" /><button type="button" onClick={() => void renameManuscript()} aria-label={t("manuscript.renameWork")} className="rounded-full p-1.5 text-[var(--text-faint)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"><Pencil size={14} /></button><button type="button" onClick={() => void addManuscript()} aria-label={t("manuscript.newWork")} className="rounded-full p-1.5 text-[var(--text-faint)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"><Plus size={15} /></button></div>{activeManuscript.targetWordCount ? <div className="mt-2 flex items-center gap-2"><span className="h-1 w-36 overflow-hidden rounded-full bg-[var(--surface-muted)]"><span className="block h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${Math.min(100, totalWords / activeManuscript.targetWordCount * 100)}%` }} /></span><span className="text-[10px] text-[var(--text-faint)]">{Math.round(totalWords / activeManuscript.targetWordCount * 100)}%</span></div> : null}</div><div className="relative flex items-center gap-3"><p className="text-xs text-[var(--text-faint)]">{t("manuscript.totalWords", { count: totalWords })}</p><details className="group"><summary aria-label={t("manuscript.workSettings")} className="ws-button-secondary flex h-9 cursor-pointer list-none items-center justify-center rounded-full px-3"><Settings2 size={14} /></summary><div className="ws-dropdown-surface ws-popover-enter absolute right-0 top-11 z-30 w-80 p-4"><p className="text-xs font-semibold text-[var(--text-faint)]">{t("manuscript.workTitle")}</p><div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2"><span className="min-w-0 truncate text-sm font-medium">{activeManuscript.title}</span><button type="button" onClick={() => void renameManuscript()} className="shrink-0 text-xs font-semibold text-[var(--accent)]">{t("common.rename")}</button></div><label className="mt-3 block text-xs font-semibold text-[var(--text-faint)]">{t("manuscript.synopsisLabel")}<textarea value={activeManuscript.synopsis} onChange={(event) => updateManuscript(activeManuscript.id, { synopsis: event.target.value })} rows={3} className="ws-input mt-2 w-full resize-none rounded-xl px-3 py-2 text-sm" /></label><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs font-semibold text-[var(--text-faint)]">{t("manuscript.workStatus")}<SelectMenu value={activeManuscript.status} onChange={(status) => updateManuscript(activeManuscript.id, { status: status as ManuscriptStatus })} ariaLabel={t("manuscript.workStatus")} options={(["planning", "drafting", "revising", "complete"] as ManuscriptStatus[]).map((status) => ({ value: status, label: t(`manuscript.workStatus.${status}`) }))} className="mt-2 h-10 w-full" /></label><label className="text-xs font-semibold text-[var(--text-faint)]">{t("manuscript.targetWords")}<input type="number" min="0" step="1000" value={activeManuscript.targetWordCount ?? ""} onChange={(event) => updateManuscript(activeManuscript.id, { targetWordCount: event.target.value ? Math.max(0, Number(event.target.value)) : null })} className="ws-input mt-2 h-10 w-full rounded-xl px-3 text-sm" /></label></div><button type="button" onClick={() => void removeManuscript()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10"><Trash2 size={13} />{t("manuscript.deleteWork")}</button></div></details><button type="button" onClick={() => downloadManuscriptMarkdown(activeManuscript, manuscriptNodes)} className="ws-button-secondary flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold"><Download size={14} />{t("manuscript.export")}</button></div></div>
    <div className="grid min-h-[calc(100vh-11rem)] overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_68%,transparent)] xl:grid-cols-[17rem_minmax(0,1fr)_15rem]">
      <aside className="border-b border-[var(--border)] p-3 xl:border-b-0 xl:border-r"><div className="flex items-center justify-between px-2 py-2"><span className="text-xs font-semibold uppercase tracking-[.12em] text-[var(--text-faint)]">{t("manuscript.structure")}</span><button type="button" onClick={() => { setAdding({ parentId: null, kind: "volume" }); setNodeTitle(""); }} className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--surface-muted)]" aria-label={t("manuscript.addVolume")}><Plus size={15} /></button></div><div className="max-h-[40vh] overflow-y-auto xl:max-h-[calc(100vh-18rem)]">{childrenOf(null).map((node) => renderNode(node))}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3"><button type="button" onClick={() => { setAdding({ parentId: activeNode?.kind === "volume" ? activeNode.id : null, kind: "chapter" }); setNodeTitle(""); }} className="ws-button-secondary h-9 rounded-full px-3 text-xs font-semibold"><Plus size={13} className="mr-1 inline" />{t("manuscript.chapter")}</button><button type="button" disabled={!activeNode || activeNode.kind === "volume"} onClick={() => activeNode && setAdding({ parentId: activeNode.kind === "scene" ? activeNode.parentId : activeNode.id, kind: "scene" })} className="ws-button-secondary h-9 rounded-full px-3 text-xs font-semibold disabled:opacity-35"><Plus size={13} className="mr-1 inline" />{t("manuscript.scene")}</button></div>
        {adding ? <form onSubmit={submitNode} className="mt-3 rounded-xl bg-[var(--surface-muted)] p-3"><p className="text-xs font-semibold">{t(`manuscript.add.${adding.kind}`)}</p><input autoFocus value={nodeTitle} onChange={(event) => setNodeTitle(event.target.value)} className="ws-input mt-2 h-9 w-full rounded-lg px-3 text-xs" /><div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setAdding(null)} className="px-2 text-xs text-[var(--text-muted)]">{t("common.cancel")}</button><button type="submit" className="ws-button-primary h-8 rounded-full px-3 text-xs">{t("manuscript.addAction")}</button></div></form> : null}
        {activeNode ? <button type="button" onClick={() => void removeActiveNode()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10"><Trash2 size={13} />{t("manuscript.deleteSection")}</button> : null}
        {deletedBranch ? <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] p-3 text-xs text-[var(--text-muted)]"><p>{t("manuscript.deleted", { title: deletedBranch[0]?.title ?? "" })}</p><button type="button" onClick={() => { restoreNodes(deletedBranch); setDeletedBranch(null); }} className="mt-2 flex items-center gap-1 font-semibold text-[var(--text)]"><RotateCcw size={13} />{t("common.undo")}</button></div> : null}
      </aside>
      <main className="min-w-0 px-4 py-5 sm:px-7 lg:px-10">{activeNode ? <><header className="mx-auto mb-5 max-w-4xl"><div className="flex flex-wrap items-end justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-xs text-[var(--text-faint)]">{t(`manuscript.kind.${activeNode.kind}`)}</p><input value={activeNode.title} onChange={(event) => updateNode(activeNode.id, { title: event.target.value })} className="ws-display mt-1 w-full border-0 bg-transparent text-3xl font-semibold outline-none" /></div><span className="rounded-full bg-[var(--surface-muted)] px-3 py-1.5 text-xs text-[var(--text-faint)]">{t("manuscript.nodeWords", { count: countTextWords(activeNode.content) })}</span></div><input value={activeNode.synopsis} onChange={(event) => updateNode(activeNode.id, { synopsis: event.target.value })} placeholder={t("manuscript.synopsisPlaceholder")} className="mt-3 w-full border-0 bg-transparent text-sm text-[var(--text-muted)] outline-none placeholder:text-[var(--text-faint)]" /></header>{activeNode.kind === "volume" ? <div className="mx-auto max-w-4xl border-y border-[var(--border)] py-16 text-center text-sm text-[var(--text-faint)]">{t("manuscript.volumeHint")}</div> : <RichTextEditor value={activeNode.content} onChange={(content) => updateNode(activeNode.id, { content })} referenceEntries={referenceEntries} placeholder={t("manuscript.editorPlaceholder")} />}</> : <div className="flex min-h-[30rem] items-center justify-center text-sm text-[var(--text-faint)]">{t("manuscript.chooseSection")}</div>}</main>
      {activeNode ? <ManuscriptInspector node={activeNode} entries={entries} timelineItems={timelineItems} onChange={(patch) => updateNode(activeNode.id, patch)} /> : <div className="hidden xl:block" />}
    </div>
  </MotionPage>;
}
