import { AlertCircle, AlertTriangle, CheckCircle2, Download, FileInput, FileText, Upload, X } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent } from "react";

import { useSoftDialog } from "../../../shared/components/softDialogContext";
import { useI18n } from "../../../shared/i18n";
import { useEntryStore } from "../../entries/stores/useEntryStore";
import type { EntryType } from "../../entries/types";
import { SelectMenu } from "../../../shared/components/SelectMenu";
import {
  ContentImportError,
  MAX_CONTENT_IMPORT_BYTES,
  MAX_CONTENT_IMPORT_ENTRIES,
  parseContentImport,
  type ContentImportDraft,
} from "../contentImport";

const entryTypes: EntryType[] = ["Character", "Location", "Organization", "Item", "Event"];

export function ContentImportWizard() {
  const { t } = useI18n();
  const dialog = useSoftDialog();
  const entries = useEntryStore((state) => state.entries);
  const importEntries = useEntryStore((state) => state.importEntries);
  const inputRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [drafts, setDrafts] = useState<ContentImportDraft[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const existing = useMemo(() => new Set(entries.map((entry) => `${entry.type}:${entry.title.trim().toLocaleLowerCase()}`)), [entries]);
  const duplicateKeys = useMemo(() => new Set(drafts.filter((draft) => existing.has(`${draft.type}:${draft.title.trim().toLocaleLowerCase()}`)).map((draft) => draft.key)), [drafts, existing]);
  const warningCount = useMemo(() => drafts.reduce((count, draft) => count + draft.warnings.length, 0), [drafts]);

  function errorMessage(error: unknown) {
    if (!(error instanceof ContentImportError)) return t("contentImport.readFailed");
    return t(`contentImport.error.${error.code}`);
  }

  function downloadTemplate() {
    const csv = "\uFEFFtitle,type,summary,tags,content\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "world-studio-content-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_CONTENT_IMPORT_BYTES) {
      setNotice({ tone: "error", message: t("contentImport.error.tooLarge") });
      return;
    }
    setNotice(null);
    try {
      const parsed = (await Promise.all(files.map(async (file) => parseContentImport(file.name, await file.text())))).flat();
      if (parsed.length > MAX_CONTENT_IMPORT_ENTRIES) throw new ContentImportError("too-many-entries");
      setDrafts(parsed);
      const seen = new Set<string>();
      setSelected(new Set(parsed.filter((item) => {
        const fingerprint = `${item.type}:${item.title.trim().toLocaleLowerCase()}`;
        if (existing.has(fingerprint) || seen.has(fingerprint)) return false;
        seen.add(fingerprint);
        return true;
      }).map((item) => item.key)));
      window.requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (error) {
      setDrafts([]);
      setSelected(new Set());
      setNotice({ tone: "error", message: errorMessage(error) });
    }
  }

  function patchType(key: string, type: EntryType) {
    setDrafts((current) => current.map((draft) => draft.key === key ? { ...draft, type } : draft));
  }

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function commit() {
    const inputs = drafts.filter((draft) => selected.has(draft.key)).map((draft) => ({
      title: draft.title,
      type: draft.type,
      summary: draft.summary,
      content: draft.content,
      tags: draft.tags,
    }));
    if (!inputs.length) return;
    const confirmed = await dialog.confirm({ message: t("contentImport.confirm", { count: inputs.length }) });
    if (!confirmed) return;
    const count = importEntries(inputs);
    setDrafts([]);
    setSelected(new Set());
    setNotice({ tone: "success", message: t("contentImport.success", { count }) });
  }

  return (
    <section ref={sectionRef} className="ws-compact-surface ws-panel-padding scroll-mt-24">
      <input id="ws-import-content" ref={inputRef} type="file" multiple accept=".csv,.json,.md,.markdown,.txt,text/plain,text/csv,application/json,text/markdown" onChange={(event) => void chooseFiles(event)} className="hidden" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="ws-section-icon"><FileInput size={20} /></span>
          <div><h3 className="ws-display text-2xl font-semibold">{t("contentImport.title")}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{t("contentImport.description")}</p></div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2"><button type="button" onClick={() => inputRef.current?.click()} className="ws-button-primary flex h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold"><Upload size={15} />{t("contentImport.chooseFiles")}</button><button type="button" onClick={downloadTemplate} className="ws-button-secondary flex h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold"><Download size={15} />{t("contentImport.downloadTemplate")}</button></div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-[var(--border)] py-3 text-xs text-[var(--text-faint)]">
        {["CSV", "Markdown", "JSON", t("contentImport.plainText")].map((format, index) => <span key={format} className="flex items-center gap-3">{index ? <i className="h-1 w-1 rounded-full bg-[var(--border-strong)]" /> : null}{format}</span>)}
      </div>

      {notice ? <div role="status" className={`ws-status mt-4 ${notice.tone === "success" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300"}`}>{notice.tone === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}<span>{notice.message}</span></div> : null}

      {drafts.length ? <div className="ws-subtle-state mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4"><div><h4 className="text-sm font-semibold">{t("contentImport.previewTitle")}</h4><p className="mt-1 text-xs text-[var(--text-faint)]">{t("contentImport.previewSummary", { total: drafts.length, selected: selected.size, duplicates: duplicateKeys.size })}</p>{warningCount ? <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300"><AlertTriangle size={13} />{t("contentImport.warningSummary", { count: warningCount })}</p> : null}</div><button type="button" onClick={() => { setDrafts([]); setSelected(new Set()); }} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]" aria-label={t("common.cancel")}><X size={15} /></button></div>
        <div className="max-h-[26rem] divide-y divide-[var(--border)] overflow-y-auto">
          {drafts.map((draft) => {
            const duplicate = duplicateKeys.has(draft.key);
            return <div key={draft.key} className={`grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_10rem] sm:items-center ${selected.has(draft.key) ? "" : "opacity-55"}`}>
              <input type="checkbox" checked={selected.has(draft.key)} onChange={() => toggle(draft.key)} className="h-4 w-4 accent-[var(--accent)]" aria-label={t("contentImport.selectEntry", { title: draft.title })} />
              <div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><FileText size={14} className="shrink-0 text-[var(--accent)]" /><b className="truncate text-sm">{draft.title}</b>{duplicate ? <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">{t("contentImport.duplicate")}</span> : null}</div><p className="mt-1 truncate text-xs text-[var(--text-faint)]">{draft.summary || t("common.noSummary")} · {draft.sourceName}</p>{draft.warnings.length ? <div className="mt-2 flex flex-wrap gap-1.5">{draft.warnings.map((warning) => <span key={warning} className="rounded-full border border-amber-500/20 bg-amber-500/8 px-2 py-0.5 text-[10px] text-amber-800 dark:text-amber-200">{t(`contentImport.warning.${warning}`)}</span>)}</div> : null}</div>
              <SelectMenu value={draft.type} onChange={(value) => patchType(draft.key, value as EntryType)} ariaLabel={t("entries.allTypes")} className="h-9" buttonClassName="px-3 text-xs" options={entryTypes.map((type) => ({ value: type, label: t(`type.${type}`) }))} />
            </div>;
          })}
        </div>
        <div className="flex flex-col gap-3 border-t border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[var(--text-faint)]">{t("contentImport.duplicateHint")}</p><button type="button" disabled={!selected.size} onClick={() => void commit()} className="ws-button-primary min-h-11 shrink-0 rounded-full px-5 text-sm font-semibold disabled:opacity-40">{t("contentImport.importSelected", { count: selected.size })}</button></div>
      </div> : null}
    </section>
  );
}
