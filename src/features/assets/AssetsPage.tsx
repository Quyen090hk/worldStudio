import {
  Archive,
  Download,
  File,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { MotionPage } from "../../shared/components/MotionPage";
import { useI18n } from "../../shared/i18n";
import { addAssetFile, deleteAssetFile } from "./actions/assetActions";
import {
  ASSET_KINDS,
  filterAssets,
  formatAssetSize,
} from "./assetModel";
import { loadAssetFile } from "./assetStorage";
import { useAssetStore } from "./stores/useAssetStore";
import type { AssetKind, AssetRecord } from "./types";

const KIND_ICONS: Record<AssetKind, LucideIcon> = {
  image: FileImage,
  audio: FileAudio,
  video: FileVideo,
  document: FileText,
  other: File,
};

type Notice = { tone: "success" | "error"; message: string };

function AssetPreview({ asset }: { asset: AssetRecord }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const Icon = KIND_ICONS[asset.kind];

  useEffect(() => {
    if (asset.kind !== "image") return;
    let active = true;
    let url: string | null = null;

    loadAssetFile(asset.id)
      .then((file) => {
        if (!file || !active) return;
        url = URL.createObjectURL(file);
        setObjectUrl(url);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [asset.id, asset.kind]);

  if (objectUrl) {
    return (
      <img
        src={objectUrl}
        alt=""
        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-[var(--surface-muted)] text-[var(--text-faint)]">
      <Icon size={36} strokeWidth={1.35} aria-hidden="true" />
    </div>
  );
}

function AssetEditor({
  asset,
  onClose,
}: {
  asset: AssetRecord;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const updateAsset = useAssetStore((state) => state.updateAsset);
  const [name, setName] = useState(asset.name);
  const [tags, setTags] = useState(asset.tags.join(", "));
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function save() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    updateAsset(asset.id, {
      name: trimmedName,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });
    onClose();
  }

  function trapFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-editor-title"
        onKeyDown={trapFocus}
        className="ws-surface-raised w-full max-w-lg rounded-[2rem] p-6 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="ws-eyebrow">{t("assets.metadata")}</p>
            <h2
              id="asset-editor-title"
              className="ws-display mt-2 text-3xl font-semibold text-[var(--text)]"
            >
              {t("assets.edit")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            aria-label={t("common.close")}
          >
            <X size={17} />
          </button>
        </div>

        <label className="mt-6 block">
          <span className="text-xs font-semibold uppercase tracking-[.14em] text-[var(--text-faint)]">
            {t("assets.name")}
          </span>
          <input
            ref={inputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="ws-input mt-2 w-full rounded-[1rem] px-4 py-3 text-sm"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-semibold uppercase tracking-[.14em] text-[var(--text-faint)]">
            {t("common.tags")}
          </span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder={t("assets.tagsPlaceholder")}
            className="ws-input mt-2 w-full rounded-[1rem] px-4 py-3 text-sm"
          />
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="ws-button-secondary rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!name.trim()}
            className="ws-button-primary rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            {t("common.saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AssetsPage() {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assets = useAssetStore((state) => state.assets);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<AssetKind | "all">("all");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const visibleAssets = useMemo(
    () => filterAssets(assets, query, kind),
    [assets, kind, query],
  );
  const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
  const editingAsset = assets.find((asset) => asset.id === editingId) ?? null;

  async function importFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length) return;

    setBusy(true);
    setNotice(null);
    let imported = 0;
    let rejected = 0;
    for (const file of files) {
      try {
        await addAssetFile(file);
        imported += 1;
      } catch {
        rejected += 1;
      }
    }
    setBusy(false);

    if (imported) {
      setNotice({
        tone: rejected ? "error" : "success",
        message: rejected
          ? t("assets.partialImport", { imported, rejected })
          : t("assets.importSuccess", { count: imported }),
      });
    } else {
      setNotice({ tone: "error", message: t("assets.importFailed") });
    }
  }

  async function downloadAsset(asset: AssetRecord) {
    setNotice(null);
    try {
      const file = await loadAssetFile(asset.id);
      if (!file) throw new Error("missing-file");
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = asset.name;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setNotice({ tone: "error", message: t("assets.fileMissing") });
    }
  }

  async function removeAsset(asset: AssetRecord) {
    if (!window.confirm(t("assets.deleteConfirm", { name: asset.name }))) return;
    setDeletingId(asset.id);
    setNotice(null);
    try {
      await deleteAssetFile(asset.id);
      setNotice({ tone: "success", message: t("assets.deleteSuccess") });
    } catch {
      setNotice({ tone: "error", message: t("assets.deleteFailed") });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <MotionPage className="space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="ws-page-title">
            {t("nav.assets")}
          </h2>
          <p className="ws-page-status">
            {t("assets.headerStatus", {
              count: assets.length,
              size: formatAssetSize(totalSize),
            })}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={importFiles}
          className="hidden"
        />
        {assets.length > 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="ws-button-primary flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
          >
            {busy ? <Upload size={17} /> : <Plus size={17} />}
            {busy ? t("assets.importing") : t("assets.add")}
          </button>
        ) : null}
      </header>

      <section className="grid border-y border-[var(--border)] sm:grid-cols-3">
        {[
          [t("assets.totalFiles"), assets.length],
          [t("assets.images"), assets.filter((asset) => asset.kind === "image").length],
          [t("assets.storageUsed"), formatAssetSize(totalSize)],
        ].map(([label, value], index) => (
          <div key={label} className={`px-2 py-4 sm:px-5 ${index ? "border-t border-[var(--border)] sm:border-l sm:border-t-0" : ""}`}>
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--text-faint)]">
              {label}
            </p>
            <p className="ws-display mt-2 text-2xl font-semibold text-[var(--text)]">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="ws-compact-surface p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <label className="ws-input flex h-10 flex-1 items-center gap-3 rounded-xl px-3 xl:max-w-md">
            <Search size={16} className="text-[var(--text-faint)]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("assets.search")}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
            {(["all", ...ASSET_KINDS] as const).map((filterKind) => (
              <button
                key={filterKind}
                type="button"
                onClick={() => setKind(filterKind)}
                aria-pressed={kind === filterKind}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  kind === filterKind
                    ? "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                    : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text)]"
                }`}
              >
                {t(`assets.kind.${filterKind}`)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {notice ? (
        <div
          role="status"
          className={`rounded-[1rem] px-4 py-3 text-sm ${
            notice.tone === "success"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-red-500/10 text-red-700 dark:text-red-300"
          }`}
        >
          {notice.message}
        </div>
      ) : null}

      {visibleAssets.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleAssets.map((asset) => {
            const KindIcon = KIND_ICONS[asset.kind];
            return (
              <article
                key={asset.id}
                className="group ws-compact-surface overflow-hidden"
              >
                <div className="aspect-[16/10] overflow-hidden border-b border-[var(--border)]">
                  <AssetPreview asset={asset} />
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[.8rem] bg-[var(--accent-soft)] text-[var(--accent)]">
                      <KindIcon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-[var(--text)]">
                        {asset.name}
                      </h3>
                      <p className="mt-1 truncate text-xs text-[var(--text-faint)]">
                        {formatAssetSize(asset.size)} · {asset.mediaType}
                      </p>
                    </div>
                  </div>

                  {asset.tags.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {asset.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[0.65rem] text-[var(--text-muted)]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center justify-end gap-1 border-t border-[var(--border)] pt-3">
                    <button
                      type="button"
                      onClick={() => setEditingId(asset.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                      aria-label={t("assets.editNamed", { name: asset.name })}
                      title={t("assets.editNamed", { name: asset.name })}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadAsset(asset)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                      aria-label={t("assets.downloadNamed", { name: asset.name })}
                      title={t("assets.downloadNamed", { name: asset.name })}
                    >
                      <Download size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAsset(asset)}
                      disabled={deletingId === asset.id}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-red-500 hover:bg-red-500/10"
                      aria-label={t("assets.deleteNamed", { name: asset.name })}
                      title={t("assets.deleteNamed", { name: asset.name })}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="ws-surface rounded-[2rem] px-6 py-16 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
            <Archive size={24} />
          </span>
          <h3 className="ws-display mt-5 text-3xl font-semibold text-[var(--text)]">
            {assets.length ? t("assets.noMatches") : t("assets.empty")}
          </h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-muted)]">
            {assets.length ? t("assets.noMatchesHelp") : t("assets.emptyHelp")}
          </p>
          {!assets.length ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ws-button-primary mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold"
            >
              <Upload size={16} />
              {t("assets.chooseFiles")}
            </button>
          ) : null}
        </section>
      )}

      {editingAsset ? (
        <AssetEditor
          key={editingAsset.id}
          asset={editingAsset}
          onClose={() => setEditingId(null)}
        />
      ) : null}
    </MotionPage>
  );
}
