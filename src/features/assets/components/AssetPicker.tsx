import { ImagePlus, Search, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../../shared/i18n";
import { addAssetFile } from "../actions/assetActions";
import { useAssetStore } from "../stores/useAssetStore";
import { AssetThumbnail } from "./AssetThumbnail";

type AssetPickerProps = {
  open: boolean;
  multiple?: boolean;
  selectedIds?: string[];
  onSelect: (ids: string[]) => void;
  onClose: () => void;
};

export function AssetPicker({
  open,
  multiple = false,
  selectedIds = [],
  onSelect,
  onClose,
}: AssetPickerProps) {
  const { t } = useI18n();
  const assets = useAssetStore((state) => state.assets);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<string[]>(selectedIds);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const images = useMemo(
    () => assets.filter((asset) =>
      asset.kind === "image" &&
      `${asset.name} ${asset.tags.join(" ")}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())),
    [assets, query],
  );

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
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
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => previousFocusRef.current?.focus({ preventScroll: true }));
    };
  }, [open]);

  if (!open) return null;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    const created: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        created.push((await addAssetFile(file)).id);
      }
      if (!created.length) {
        setError(t("assets.importFailed"));
        return;
      }
      if (multiple) setSelection((current) => [...new Set([...current, ...created])]);
      else {
        onSelect([created[0]]);
        onClose();
      }
    } catch {
      setError(t("assets.importFailed"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function choose(id: string) {
    if (!multiple) {
      onSelect([id]);
      onClose();
      return;
    }
    setSelection((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  return (
    <div
      className="ws-backdrop-enter fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-2 backdrop-blur-sm sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-picker-title"
        aria-describedby="asset-picker-help"
        className="ws-dialog-surface ws-popover-enter flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden sm:max-h-[82vh]"
      >
        <header className="flex items-center gap-3 border-b border-[var(--border)] p-4">
          <ImagePlus size={18} className="shrink-0 text-[var(--accent)]" />
          <div className="min-w-0 flex-1">
            <h2 id="asset-picker-title" className="font-semibold">{t("assetPicker.title")}</h2>
            <p id="asset-picker-help" className="text-xs text-[var(--text-faint)]">{t("assetPicker.help")}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]" aria-label={t("common.close")}>
            <X size={17} />
          </button>
        </header>

        <div className="flex gap-2 border-b border-[var(--border)] p-3 sm:p-4">
          <label className="ws-input flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl px-3">
            <Search size={15} />
            <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder={t("common.search")} />
          </label>
          <input ref={inputRef} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={(event) => void upload(event.target.files)} />
          <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="ws-button-secondary flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold disabled:opacity-50">
            <Upload size={15} />
            <span className="hidden sm:inline">{t("assetPicker.upload")}</span>
          </button>
        </div>

        {error ? <p role="alert" className="ws-status mx-4 mt-3 bg-red-500/10 text-red-600 dark:text-red-300">{error}</p> : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {images.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((asset) => {
                const selected = selection.includes(asset.id);
                return (
                  <button
                    type="button"
                    key={asset.id}
                    aria-pressed={selected}
                    onClick={() => choose(asset.id)}
                    className={`overflow-hidden rounded-xl border text-left transition ${selected ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"}`}
                  >
                    <AssetThumbnail assetId={asset.id} alt={asset.name} className="aspect-[4/3] w-full" />
                    <span className="block truncate px-2.5 py-2 text-xs font-medium">{asset.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-48 w-full flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)]">
              <ImagePlus size={28} className="mb-3" />
              {t("assetPicker.empty")}
            </button>
          )}
        </div>

        {multiple ? (
          <footer className="flex items-center justify-between gap-3 border-t border-[var(--border)] p-3 sm:p-4">
            <span className="text-xs text-[var(--text-faint)]">{t("assetPicker.selected", { count: selection.length })}</span>
            <button type="button" onClick={() => { onSelect(selection); onClose(); }} className="ws-button-primary h-10 rounded-full px-4 text-sm font-semibold">{t("common.confirm")}</button>
          </footer>
        ) : null}
      </section>
    </div>
  );
}
