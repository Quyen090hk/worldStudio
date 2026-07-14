import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  Globe2,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { MotionPage } from "../../shared/components/MotionPage";
import { useI18n } from "../../shared/i18n";
import { useAssetStore } from "../assets/stores/useAssetStore";
import { useCanvasStore } from "../canvas/stores/useCanvasStore";
import { useEntryStore } from "../entries/stores/useEntryStore";
import { useRelationshipStore } from "../graph/stores/useRelationshipStore";
import { useMapStore } from "../map/stores/useMapStore";
import { useTimelineStore } from "../timeline/stores/useTimelineStore";
import { useWorldStore } from "../world/stores/useWorldStore";
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
  const [name, setName] = useState(profile.name);
  const [description, setDescription] = useState(profile.description);

  function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    updateProfile(name, description);
    onSaved();
  }

  return (
    <form onSubmit={saveProfile} className="mt-6 grid gap-4">
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
          className="ws-input mt-2 w-full rounded-[1rem] px-4 py-3 text-sm"
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
          className="ws-input mt-2 w-full resize-none rounded-[1rem] px-4 py-3 text-sm leading-6"
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
          className="ws-button-primary min-h-11 rounded-full px-5 text-sm font-semibold"
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
      const confirmed = window.confirm(
        t("settings.importConfirm", {
          world: backup.data.world.name,
          entries: backup.data.entries.length,
          maps: backup.data.atlas.maps.length,
        }),
      );
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
    <MotionPage className="space-y-6">
      <header>
        <p className="ws-eyebrow">{t("settings.eyebrow")}</p>
        <h2 className="mt-2 text-5xl font-semibold tracking-[-.04em] text-[var(--text)]">
          {t("nav.settings")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
          {t("settings.description")}
        </p>
      </header>

      <section className="ws-surface rounded-[2rem] p-6 md:p-7">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-[var(--accent-soft)] text-[var(--accent)]">
            <Globe2 size={21} strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="ws-eyebrow">{t("settings.worldIdentity")}</p>
            <h3 className="ws-display mt-2 text-3xl font-semibold text-[var(--text)]">
              {t("settings.worldProfile")}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
              {t("settings.worldProfileHelp")}
            </p>
          </div>
        </div>

        <WorldProfileForm
          key={worldProfile.updatedAt}
          profile={worldProfile}
          onDirty={() => setProfileSaved(false)}
          onSaved={() => setProfileSaved(true)}
        />
        {profileSaved ? (
          <p role="status" className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">
            {t("settings.worldProfileSaved")}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {[
          [t("settings.entries"), entryCount],
          [t("settings.relationships"), relationshipCount],
          [t("settings.timelineRecords"), timelineCount],
          [t("settings.maps"), mapCount],
          [t("settings.assets"), assetCount],
          [t("settings.canvasCards"), canvasCardCount],
        ].map(([label, value]) => (
          <div key={label} className="ws-surface rounded-[1.5rem] p-5">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--text-faint)]">
              {label}
            </p>
            <p className="ws-display mt-3 text-3xl font-semibold text-[var(--text)]">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="ws-surface rounded-[2rem] p-6 md:p-7">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Database size={21} strokeWidth={1.7} />
            </span>
            <div>
              <p className="ws-eyebrow">{t("settings.dataSafety")}</p>
              <h3 className="ws-display mt-2 text-3xl font-semibold text-[var(--text)]">
                {t("settings.workspaceBackup")}
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-muted)]">
                {t("settings.backupDescription")}
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={importBackup}
            className="hidden"
          />

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={exportBackup}
              disabled={busy !== null}
              className="ws-button-primary flex min-h-12 items-center justify-center gap-2 rounded-[1.15rem] px-5 text-sm font-semibold disabled:opacity-50"
            >
              <Download size={17} />
              {busy === "export"
                ? t("settings.exporting")
                : t("settings.exportBackup")}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy !== null}
              className="ws-button-secondary flex min-h-12 items-center justify-center gap-2 rounded-[1.15rem] px-5 text-sm font-semibold disabled:opacity-50"
            >
              <Upload size={17} />
              {busy === "import"
                ? t("settings.importing")
                : t("settings.importBackup")}
            </button>
          </div>

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
        </div>

        <aside className="ws-surface rounded-[2rem] p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[var(--surface-muted)] text-[var(--text-muted)]">
            <ShieldCheck size={20} strokeWidth={1.7} />
          </div>
          <h3 className="ws-display mt-5 text-2xl font-semibold text-[var(--text)]">
            {t("settings.backupContents")}
          </h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--text-muted)]">
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
                  className="mt-1 shrink-0 text-[var(--accent)]"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-[var(--border)] pt-5 text-xs leading-6 text-[var(--text-faint)]">
            {t("settings.localReminder")}
          </p>
        </aside>
      </section>
    </MotionPage>
  );
}
