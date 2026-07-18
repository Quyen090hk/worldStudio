import { Archive, ArchiveRestore, Copy, Download, Search, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useI18n } from "../../../shared/i18n";
import { useSoftDialog } from "../../../shared/components/softDialogContext";
import { createMultiWorldBackup, parseMultiWorldBackup, restoreMultiWorldBackup } from "../multiWorldBackup";
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
  const visibleWorlds = useMemo(() => worlds
    .filter((world) => showArchived || !world.archived)
    .filter((world) => `${world.name} ${world.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId) || b.updatedAt.localeCompare(a.updatedAt)), [activeId, query, showArchived, worlds]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
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
    });
  }
  async function importAll(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await run(async () => {
      const backup = parseMultiWorldBackup(await file.text());
      if (await dialog.confirm({ message: t("worlds.importConfirm", { count: backup.worlds.length }), danger: true })) await restoreMultiWorldBackup(backup);
    });
  }

  return (
    <section className="ws-compact-surface p-5 md:p-6">
      <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importAll(event)} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div><h3 className="ws-display text-2xl font-semibold">{t("worlds.title")}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t("worlds.description")}</p></div>
        <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void exportAll()} className="ws-button-secondary flex h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold"><Download size={14} />{t("worlds.exportAll")}</button><button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="ws-button-secondary flex h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold"><Upload size={14} />{t("worlds.importAll")}</button></div>
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <label className="ws-input flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl px-3"><Search size={15} className="text-[var(--text-faint)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("worlds.search")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
        <button type="button" aria-pressed={showArchived} onClick={() => setShowArchived((value) => !value)} className={`h-10 rounded-xl px-4 text-xs font-semibold ${showArchived ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "border border-[var(--border)] text-[var(--text-muted)]"}`}>{t("worlds.showArchived")}</button>
      </div>
      <div className="mt-4 space-y-2">{visibleWorlds.map((world) => (
        <div key={world.id} className={`flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 ${world.archived ? "opacity-60" : ""}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]">{world.name.trim().slice(0, 1).toLocaleUpperCase() || "·"}</span>
          <button type="button" disabled={busy || world.id === activeId || world.archived} onClick={() => void run(() => switchWorld(world.id))} className="min-w-0 basis-48 flex-1 text-left disabled:cursor-default"><b className="block truncate text-sm">{world.name}</b><span className="mt-1 block truncate text-xs text-[var(--text-faint)]">{world.archived ? t("worlds.archived") : world.description || t("worlds.noDescription")}</span></button>
          {world.id === activeId ? <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[10px] font-semibold text-[var(--accent)]">{t("worlds.current")}</span> : null}
          <button type="button" disabled={busy} onClick={() => void run(() => duplicateWorld(world.id, t("worlds.copySuffix")))} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--surface-solid)]" aria-label={t("worlds.duplicateWorld", { name: world.name })}><Copy size={14} /></button>
          <button type="button" disabled={busy || world.id === activeId} onClick={() => setWorldArchived(world.id, !world.archived)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--surface-solid)] disabled:opacity-30" aria-label={world.archived ? t("worlds.restoreWorld", { name: world.name }) : t("worlds.archiveWorld", { name: world.name })}>{world.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}</button>
          <button type="button" disabled={busy} onClick={() => void remove(world.id, world.name)} className="flex h-9 w-9 items-center justify-center rounded-full text-red-500 hover:bg-red-500/10 disabled:opacity-30" aria-label={t("worlds.deleteWorld", { name: world.name })}><Trash2 size={15} /></button>
        </div>
      ))}{!visibleWorlds.length ? <p className="py-8 text-center text-sm text-[var(--text-faint)]">{t("worlds.noMatches")}</p> : null}</div>
    </section>
  );
}
