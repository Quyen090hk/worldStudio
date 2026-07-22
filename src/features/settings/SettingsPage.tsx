import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  Globe2,
  ShieldCheck,
} from "lucide-react";

import { MotionPage } from "../../shared/components/MotionPage";
import { useSoftDialog } from "../../shared/components/softDialogContext";
import { useI18n } from "../../shared/i18n";
import { useAssetStore } from "../assets/stores/useAssetStore";
import { useCanvasStore } from "../canvas/stores/useCanvasStore";
import { useEntryStore } from "../entries/stores/useEntryStore";
import { useRelationshipStore } from "../graph/stores/useRelationshipStore";
import { useMapStore } from "../map/stores/useMapStore";
import { useTimelineStore } from "../timeline/stores/useTimelineStore";
import { useWorldStore } from "../world/stores/useWorldStore";
import { WorldManagementPanel } from "../world/components/WorldManagementPanel";
import { useWorldRegistryStore } from "../world/stores/useWorldRegistryStore";
import type { WorldProfile } from "../world/types";
import {
  MAX_WORLD_DESCRIPTION_LENGTH,
  MAX_WORLD_NAME_LENGTH,
} from "../world/worldModel";
import {
  MAX_BACKUP_FILE_BYTES,
  WorkspaceBackupError,
  createWorkspaceBackup,
  parseWorkspaceBackup,
  restoreWorkspaceBackup,
  serializeWorkspaceBackup,
} from "./workspaceBackup";
import { DataHealthPanel } from "./components/DataHealthPanel";
import { ContentImportWizard } from "./components/ContentImportWizard";
import { DataTransferCenter } from "./components/DataTransferCenter";

type BusyAction = "export" | "import" | null;
type Notice = { tone: "success" | "error"; message: string };

function WorldProfileForm({
  profile,
  onDirty,
  onSaved,
}: {
  profile: WorldProfile;
  onDirty: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const updateProfile = useWorldStore((state) => state.updateProfile);
  const activeWorldId = useWorldRegistryStore((state) => state.activeWorldId);
  const upsertWorld = useWorldRegistryStore((state) => state.upsert);
  const [name, setName] = useState(profile.name);
  const [description, setDescription] = useState(profile.description);

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    updateProfile(name, description);
    const current = useWorldStore.getState().profile;
    upsertWorld({ id: activeWorldId, ...current, name: name.trim(), description: description.trim(), updatedAt: new Date().toISOString() });
    onSaved();
  }

  return (
    <form onSubmit={saveProfile} className="mt-5 grid gap-4">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[.14em] text-[var(--text-faint)]">
          {t("settings.worldName")}
        </span>
        <input
          value={name}
          maxLength={MAX_WORLD_NAME_LENGTH}
          onChange={(event) => {
            setName(event.target.value);
            onDirty();
          }}
          required
          className="ws-input mt-2 h-11 w-full rounded-xl px-4 text-sm"
          placeholder={t("settings.worldNamePlaceholder")}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[.14em] text-[var(--text-faint)]">
          {t("settings.worldDescription")}
        </span>
        <textarea
          value={description}
          maxLength={MAX_WORLD_DESCRIPTION_LENGTH}
          onChange={(event) => {
            setDescription(event.target.value);
            onDirty();
          }}
          rows={3}
          className="ws-input mt-2 w-full resize-none rounded-xl px-4 py-3 text-sm leading-6"
          placeholder={t("settings.worldDescriptionPlaceholder")}
        />
        <span className="mt-1 block text-right text-[0.68rem] text-[var(--text-faint)]">
          {description.length}/{MAX_WORLD_DESCRIPTION_LENGTH}
        </span>
      </label>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!name.trim()}
          className="ws-button-primary h-11 rounded-full px-5 text-sm font-semibold"
        >
          {t("settings.saveWorldProfile")}
        </button>
      </div>
    </form>
  );
}

function backupErrorMessage(error: unknown, t: (key: string) => string) {
  if (error instanceof WorkspaceBackupError) {
    if (error.code === "unsupported-version")
      return t("settings.unsupportedBackup");
    if (error.code === "image-too-large")
      return t("settings.invalidMapImage");
    if (error.code === "asset-too-large")
      return t("settings.invalidAssetFile");
    return t("settings.invalidBackup");
  }
  return t("settings.backupOperationFailed");
}

export function SettingsPage() {
  const { t } = useI18n();
  const dialog = useSoftDialog();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const worldProfile = useWorldStore((state) => state.profile);
  const entryCount = useEntryStore((state) => state.entries.length);
  const relationshipCount = useRelationshipStore(
    (state) => state.relationships.length,
  );
  const timelineCount = useTimelineStore((state) => state.items.length);
  const mapCount = useMapStore((state) => state.maps.length);
  const assetCount = useAssetStore((state) => state.assets.length);
  const canvasCardCount = useCanvasStore((state) => state.cards.length);

  async function exportBackup() {
    setBusy("export");
    setNotice(null);
    try {
      const backup = await createWorkspaceBackup();
      const blob = new Blob([serializeWorkspaceBackup(backup)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const safeWorldName = backup.data.world.name
        .toLocaleLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
      anchor.download = `world-studio-${safeWorldName || "backup"}-${backup.exportedAt.slice(0, 10)}.json`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setNotice({ tone: "success", message: t("settings.exportSuccess") });
    } catch (error) {
      setNotice({
        tone: "error",
        message: backupErrorMessage(error, t),
      });
    } finally {
      setBusy(null);
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      setNotice({ tone: "error", message: t("settings.backupTooLarge") });
      return;
    }

    setBusy("import");
    setNotice(null);
    try {
      const backup = parseWorkspaceBackup(await file.text());
      const confirmed = await dialog.confirm({
        message: t("settings.importConfirm", {
          world: backup.data.world.name,
          entries: backup.data.entries.length,
          maps: backup.data.atlas.maps.length,
        }),
        danger: true,
      });
      if (!confirmed) return;

      await restoreWorkspaceBackup(backup);
      setNotice({ tone: "success", message: t("settings.importSuccess") });
    } catch (error) {
      setNotice({
        tone: "error",
        message: backupErrorMessage(error, t),
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <MotionPage className="space-y-10 pb-12 pt-2">
      <header className="border-b border-[var(--border)] pb-6">
        <p className="ws-eyebrow">{t("settings.eyebrow")}</p>
        <div className="mt-2 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="ws-display text-3xl font-semibold">{t("nav.settings")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{t("settings.pageDescription")}</p></div>
          <nav aria-label={t("settings.sectionNavigation")} className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[var(--text-muted)]">
            <a href="#workspace" className="border-b border-transparent py-1 transition hover:border-[var(--accent)] hover:text-[var(--text)]">{t("settings.worldProfile")}</a>
            <a href="#worlds" className="border-b border-transparent py-1 transition hover:border-[var(--accent)] hover:text-[var(--text)]">{t("worlds.title")}</a>
            <a href="#data-transfer" className="border-b border-transparent py-1 transition hover:border-[var(--accent)] hover:text-[var(--text)]">{t("transfer.title")}</a>
            <a href="#data-safety" className="border-b border-transparent py-1 transition hover:border-[var(--accent)] hover:text-[var(--text)]">{t("settings.dataSafety")}</a>
          </nav>
        </div>
      </header>

      <section id="workspace" className="grid scroll-mt-24 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,.8fr)]">
        <div className="ws-compact-surface ws-panel-padding">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><Globe2 size={18} /></span><div><h2 className="ws-display text-2xl font-semibold">{t("settings.worldProfile")}</h2><p className="mt-1 text-xs leading-5 text-[var(--text-faint)]">{t("settings.worldProfileHelp")}</p></div></div>
          <WorldProfileForm key={worldProfile.updatedAt} profile={worldProfile} onDirty={() => setProfileSaved(false)} onSaved={() => setProfileSaved(true)} />
          <p role="status" className={`mt-3 min-h-5 text-xs transition-opacity ${profileSaved ? "text-emerald-600 opacity-100 dark:text-emerald-300" : "opacity-0"}`}>{profileSaved ? t("settings.worldProfileSaved") : " "}</p>
        </div>

        <div className="ws-compact-surface ws-panel-padding">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)]"><Activity size={18} /></span><h2 className="ws-display text-2xl font-semibold">{t("settings.overviewTitle")}</h2></div>
          <div className="mt-5 grid grid-cols-2 border-y border-[var(--border)]">
            {[[t("settings.entries"), entryCount], [t("settings.relationships"), relationshipCount], [t("settings.timelineRecords"), timelineCount], [t("settings.maps"), mapCount], [t("settings.assets"), assetCount], [t("settings.canvasCards"), canvasCardCount]].map(([label, value], index) => <div key={label} className={`px-3 py-3.5 ${index > 1 ? "border-t border-[var(--border)]" : ""} ${index % 2 ? "border-l border-[var(--border)]" : ""}`}><p className="text-[0.68rem] text-[var(--text-faint)]">{label}</p><p className="ws-display mt-1 text-xl font-semibold">{value}</p></div>)}
          </div>
        </div>
      </section>

      <div id="data-transfer" className="scroll-mt-24"><DataTransferCenter /></div>

      <div id="worlds" className="scroll-mt-24"><WorldManagementPanel /></div>

      <div id="content-import" className="scroll-mt-24"><ContentImportWizard /></div>

      <section id="data-safety" className="grid scroll-mt-24 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(24rem,.85fr)]">
        <div className="ws-compact-surface ws-panel-padding">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Database size={18} strokeWidth={1.7} />
            </span>
            <div>
              <p className="ws-eyebrow">{t("settings.dataSafety")}</p>
              <h2 className="ws-display mt-1 text-2xl font-semibold text-[var(--text)]">
                {t("settings.workspaceBackup")}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
                {t("settings.backupDescription")}
              </p>
            </div>
          </div>

          <input
            id="ws-import-current-world"
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={importBackup}
            className="hidden"
          />
          <button id="ws-export-current-world" type="button" onClick={exportBackup} disabled={busy !== null} className="hidden"><Download size={17} />{t("settings.exportBackup")}</button>

          {notice ? (
            <div
              role="status"
              className={`mt-4 flex items-start gap-2 rounded-[1rem] px-4 py-3 text-sm ${
                notice.tone === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                  : "bg-red-500/10 text-red-600 dark:text-red-300"
              }`}
            >
              {notice.tone === "success" ? (
                <CheckCircle2 className="mt-0.5 shrink-0" size={16} />
              ) : (
                <AlertTriangle className="mt-0.5 shrink-0" size={16} />
              )}
              <span>{notice.message}</span>
            </div>
          ) : null}
          <details className="group mt-5 border-t border-[var(--border)] pt-4"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-[var(--text-muted)]"><ShieldCheck size={15} className="text-[var(--accent)]" />{t("settings.backupContents")}</summary><ul className="mt-4 grid gap-x-5 gap-y-2 text-xs leading-5 text-[var(--text-muted)] sm:grid-cols-2">
            {[
              t("settings.contentWorld"),
              t("settings.contentEntries"),
              t("settings.contentGraph"),
              t("settings.contentTimeline"),
              t("settings.contentMaps"),
              t("settings.contentAssets"),
              t("settings.contentCanvas"),
              t("settings.contentSettings"),
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <FileJson
                  size={15}
                  className="mt-0.5 shrink-0 text-[var(--accent)]"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul></details>
          <p className="mt-5 border-t border-[var(--border)] pt-4 text-xs leading-5 text-[var(--text-faint)]">
            {t("settings.localReminder")}
          </p>
        </div>
        <DataHealthPanel />
      </section>
    </MotionPage>
  );
}
