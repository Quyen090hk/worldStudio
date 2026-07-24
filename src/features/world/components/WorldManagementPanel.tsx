import { AlertCircle, Archive, ArchiveRestore, CheckCircle2, Copy, LibraryBig, Search, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useI18n } from "../../../shared/i18n";
import { useSoftDialog } from "../../../shared/components/softDialogContext";
import { MAX_BACKUP_FILE_BYTES } from "../../settings/workspaceBackup";
import { createMultiWorldBackup, parseMultiWorldBackup, restoreMultiWorldBackup, type MultiWorldBackup, type MultiWorldImportMode } from "../multiWorldBackup";
import { useWorldRegistryStore } from "../stores/useWorldRegistryStore";
import { deleteWorld, duplicateWorld, setWorldArchived, switchWorld } from "../worldWorkspace";

export function WorldManagementPanel() {
  const { t } = useI18n();
  const dialog = useSoftDialog();
  const worlds = useWorldRegistryStore((state) => state.worlds);
  const activeId = useWorldRegistryStore((state) => state.activeWorldId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [pendingImport, setPendingImport] = useState<MultiWorldBackup | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const visibleWorlds = useMemo(() => worlds
    .filter((world) => showArchived || !world.archived)
    .filter((world) => `${world.name} ${world.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId) || b.updatedAt.localeCompare(a.updatedAt)), [activeId, query, showArchived, worlds]);

  async function run(action: () => Promise<unknown>, successMessage?: string) {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      if (successMessage) setNotice({ tone: "success", message: successMessage });
    } catch {
      setNotice({ tone: "error", message: t("worlds.actionFailed") });
    } finally { setBusy(false); }
  }
  async function remove(id: string, name: string) {
    if (await dialog.confirm({ message: t("worlds.deleteConfirm", { name }), danger: true, confirmLabel: t("common.delete") })) await run(() => deleteWorld(id));
  }
  async function exportAll() {
    await run(async () => {
      const backup = await createMultiWorldBackup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `world-studio-all-worlds-${backup.exportedAt.slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    }, t("worlds.exportSuccess"));
  }
  async function importAll(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      setNotice({ tone: "error", message: t("settings.backupTooLarge") });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      setPendingImport(parseMultiWorldBackup(await file.text()));
    } catch {
      setNotice({ tone: "error", message: t("settings.invalidBackup") });
    } finally {
      setBusy(false);
    }
  }
  async function commitImport(mode: MultiWorldImportMode) {
    if (!pendingImport) return;
    if (mode === "replace" && !await dialog.confirm({ message: t("worlds.importConfirm", { count: pendingImport.worlds.length }), danger: true })) return;
    const count = pendingImport.worlds.length;
    await run(async () => {
      await restoreMultiWorldBackup(pendingImport, mode);
      setPendingImport(null);
    }, t("worlds.importSuccess", { count }));
  }

  return (
    <section className="ws-compact-surface ws-panel-padding">
      <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importAll(event)} />
      <button id="ws-import-all-worlds" type="button" onClick={() => inputRef.current?.click()} className="hidden">{t("worlds.importAll")}</button>
      <button id="ws-export-all-worlds" type="button" onClick={() => void exportAll()} className="hidden">{t("worlds.exportAll")}</button>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3"><span className="ws-section-icon"><LibraryBig size={18} /></span><div><h3 className="ws-display text-2xl font-semibold">{t("worlds.title")}</h3><p className="mt-1 text-xs leading-5 text-[var(--text-faint)]">{t("worlds.description")}</p></div></div>
      </div>
      {notice ? <div role="status" className={`ws-status mt-4 border ${notice.tone === "success" ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300" : "border-red-500/25 bg-red-500/8 text-red-700 dark:text-red-300"}`}>{notice.tone === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}<span>{notice.message}</span></div> : null}
      {pendingImport ? <div className="ws-subtle-state mt-4 p-4">
        <div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-semibold">{t("worlds.importPreviewTitle")}</h4><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{t("worlds.importPreviewSummary", { worlds: pendingImport.worlds.length, entries: pendingImport.worlds.reduce((sum, item) => sum + item.workspace.data.entries.length, 0), assets: pendingImport.worlds.reduce((sum, item) => sum + item.workspace.data.assetLibrary.items.length, 0) })}</p></div><button type="button" onClick={() => setPendingImport(null)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]" aria-label={t("common.cancel")}><X size={15} /></button></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" disabled={busy} onClick={() => void commitImport("merge")} className="ws-button-secondary min-h-11 rounded-xl px-4 text-sm font-semibold"><span className="block">{t("worlds.mergeImport")}</span><small className="mt-1 block font-normal text-[var(--text-faint)]">{t("worlds.mergeImportHint")}</small></button><button type="button" disabled={busy} onClick={() => void commitImport("replace")} className="min-h-11 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-300"><span className="block">{t("worlds.replaceImport")}</span><small className="mt-1 block font-normal opacity-75">{t("worlds.replaceImportHint")}</small></button></div>
      </div> : null}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <label className="ws-input flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl px-3"><Search size={15} className="text-[var(--text-faint)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("worlds.search")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        <button type="button" aria-pressed={showArchived} onClick={() => setShowArchived((value) => !value)} className={`h-10 rounded-xl px-4 text-xs font-semibold ${showArchived ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "border border-[var(--border)] text-[var(--text-muted)]"}`}>{t("worlds.showArchived")}</button>
      </div>
      <div className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">{visibleWorlds.map((world) => (
        <div key={world.id} className={`flex flex-wrap items-center gap-2 px-2 py-3 transition-colors hover:bg-[var(--surface-muted)] ${world.archived ? "opacity-60" : ""}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]">{world.name.trim().slice(0, 1).toLocaleUpperCase() || "·"}</span>
          <button type="button" disabled={busy || world.id === activeId || world.archived} onClick={() => void run(() => switchWorld(world.id))} className="min-w-0 basis-48 flex-1 text-left disabled:cursor-default"><b className="block truncate text-sm">{world.name}</b><span className="mt-1 block truncate text-xs text-[var(--text-faint)]">{world.archived ? t("worlds.archived") : world.description || t("worlds.noDescription")}</span></button>
          {world.id === activeId ? <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[10px] font-semibold text-[var(--accent)]">{t("worlds.current")}</span> : null}
          <button type="button" disabled={busy} onClick={() => void run(() => duplicateWorld(world.id, t("worlds.copySuffix")))} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--surface-solid)]" aria-label={t("worlds.duplicateWorld", { name: world.name })}><Copy size={14} /></button>
          <button type="button" disabled={busy || world.id === activeId} onClick={() => setWorldArchived(world.id, !world.archived)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--surface-solid)] disabled:opacity-30" aria-label={world.archived ? t("worlds.restoreWorld", { name: world.name }) : t("worlds.archiveWorld", { name: world.name })}>{world.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}</button>
          <button type="button" disabled={busy} onClick={() => void remove(world.id, world.name)} className="ws-danger-button flex h-9 w-9 items-center justify-center rounded-full border-0 disabled:opacity-30" aria-label={t("worlds.deleteWorld", { name: world.name })}><Trash2 size={15} /></button>
        </div>
      ))}{!visibleWorlds.length ? <p className="py-8 text-center text-sm text-[var(--text-faint)]">{t("worlds.noMatches")}</p> : null}</div>
    </section>
  );
}
