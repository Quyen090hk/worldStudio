import { CheckCircle2, Folder, FolderCheck, RefreshCw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "../../../shared/i18n";
import { chooseLocalWorkspaceDirectory, getLocalDirectoryStatus, getLocalSyncMetadata, LOCAL_SYNC_EVENT, syncWorkspaceToLocalDirectory, type LocalDirectoryStatus, type LocalSyncMetadata } from "../localWorkspaceDirectory";

type Notice = { tone: "success" | "error"; message: string } | null;

export function LocalWorkspaceDirectoryPanel() {
  const { t } = useI18n();
  const [status, setStatus] = useState<LocalDirectoryStatus>({ state: "disconnected" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [metadata, setMetadata] = useState<LocalSyncMetadata>({ dirty: false, syncing: false, lastSyncedAt: null, lastError: false });

  useEffect(() => {
    let active = true;
    void getLocalDirectoryStatus().then((next) => { if (active) setStatus(next); }).catch(() => { if (active) setStatus({ state: "disconnected" }); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const refresh = () => { void getLocalSyncMetadata().then(setMetadata); };
    refresh();
    window.addEventListener(LOCAL_SYNC_EVENT, refresh);
    return () => window.removeEventListener(LOCAL_SYNC_EVENT, refresh);
  }, []);

  async function chooseDirectory() {
    setBusy(true);
    setNotice(null);
    try {
      const next = await chooseLocalWorkspaceDirectory();
      setStatus(next);
      setNotice({ tone: "success", message: t("localDirectory.connected") });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice({ tone: "error", message: t("localDirectory.connectFailed") });
    } finally {
      setBusy(false);
    }
  }

  async function syncDirectory() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await syncWorkspaceToLocalDirectory();
      setStatus({ state: "ready", name: result.name });
      setNotice({ tone: "success", message: t("localDirectory.synced", { time: new Date(result.syncedAt).toLocaleString() }) });
    } catch {
      setNotice({ tone: "error", message: t("localDirectory.syncFailed") });
      setStatus(await getLocalDirectoryStatus().catch(() => ({ state: "disconnected" as const })));
    } finally {
      setBusy(false);
    }
  }

  const ready = status.state === "ready";
  const folderName = status.state === "ready" || status.state === "permission-required" ? status.name : null;

  return (
    <section className="ws-compact-surface ws-panel-padding">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">{ready ? <FolderCheck size={18} /> : <Folder size={18} />}</span><div><p className="ws-eyebrow">{t("localDirectory.eyebrow")}</p><h2 className="ws-display mt-1 text-2xl font-semibold">{t("localDirectory.title")}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{t("localDirectory.description")}</p></div></div>
        <div className="flex shrink-0 flex-wrap gap-2"><button type="button" disabled={busy || status.state === "unsupported"} onClick={chooseDirectory} className="ws-button-secondary h-11 rounded-full px-5 text-sm font-semibold">{folderName ? t("localDirectory.change") : t("localDirectory.choose")}</button>{folderName ? <button type="button" disabled={busy} onClick={syncDirectory} className="ws-button-primary flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold"><RefreshCw size={15} className={busy ? "animate-spin" : ""} />{t("localDirectory.syncNow")}</button> : null}</div>
      </div>
      <div className="mt-5 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,.55fr)]"><div className="rounded-xl bg-[var(--surface-muted)] px-4 py-3"><p className="text-xs font-semibold text-[var(--text)]">{folderName ?? t(`localDirectory.status.${status.state}`)}</p><p className="mt-1 text-xs leading-5 text-[var(--text-faint)]">{folderName ? t(`localDirectory.status.${status.state}`) : t("localDirectory.noFolder")}</p>{folderName ? <p className={`mt-2 text-[0.68rem] ${metadata.lastError ? "text-red-500" : "text-[var(--text-faint)]"}`}>{metadata.syncing ? t("localDirectory.syncing") : metadata.dirty ? t("localDirectory.pending") : metadata.lastSyncedAt ? t("localDirectory.lastSynced", { time: new Date(metadata.lastSyncedAt).toLocaleString() }) : t("localDirectory.notSynced")}</p> : null}</div><div className="flex items-start gap-2 px-1 py-2 text-xs leading-5 text-[var(--text-faint)]">{status.state === "unsupported" ? <ShieldAlert size={15} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />}<span>{status.state === "unsupported" ? t("localDirectory.unsupportedHelp") : t("localDirectory.structure")}</span></div></div>
      {notice ? <p role="status" className={`mt-3 text-xs ${notice.tone === "success" ? "text-emerald-600 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}`}>{notice.message}</p> : null}
    </section>
  );
}
