import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "../../../shared/i18n";
import { entryContentToHtml, importedContentToDocument } from "../utils/entryDocument";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeContent(value: string) {
  const trimmed = entryContentToHtml(value).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("<")) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

export function RecoveryContentEditor({
  value,
  onChange,
  onRetry,
  failure,
}: {
  value: string;
  onChange: (value: string) => void;
  onRetry?: () => void;
  failure?: Error | null;
}) {
  const { t } = useI18n();
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = editorRef.current;
    if (!element || document.activeElement === element) return;
    const next = normalizeContent(value);
    if (element.innerHTML !== next) element.innerHTML = next;
  }, [value]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-[var(--text-muted)]">
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
        <span className="min-w-0 flex-1">
          <b className="block text-[var(--text)]">{t("editor.recoveryTitle")}</b>
          {t("editor.recoveryHelp")}
          {failure ? (
            <span className="mt-1 block text-xs text-[var(--text-faint)]">
              {failure.message.includes("dynamically imported module")
                ? t("editor.moduleLoadFailure")
                : t("editor.runtimeFailure")}
            </span>
          ) : null}
        </span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-full border border-amber-500/25 bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:border-amber-500/40 hover:bg-amber-500/10"
          >
            {t("editor.retryAdvanced")}
          </button>
        ) : null}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange(importedContentToDocument(event.currentTarget.innerHTML))}
        className="min-h-[36rem] rounded-[.75rem] border border-[var(--border)] bg-[var(--surface-solid)] px-6 py-8 text-base leading-8 shadow-[var(--shadow-soft)] outline-none focus:border-[var(--border-strong)] sm:px-10 sm:py-12 lg:px-14"
        dangerouslySetInnerHTML={{ __html: normalizeContent(value) }}
        aria-label={t("entry.mainText")}
      />
    </div>
  );
}
