import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "../../../shared/i18n";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeContent(value: string) {
  const trimmed = value.trim();
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
}: {
  value: string;
  onChange: (value: string) => void;
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
        <span><b className="block text-[var(--text)]">{t("editor.recoveryTitle")}</b>{t("editor.recoveryHelp")}</span>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        className="min-h-[36rem] rounded-[.75rem] border border-[var(--border)] bg-[var(--surface-solid)] px-6 py-8 text-base leading-8 shadow-[var(--shadow-soft)] outline-none focus:border-[var(--border-strong)] sm:px-10 sm:py-12 lg:px-14"
        dangerouslySetInnerHTML={{ __html: normalizeContent(value) }}
        aria-label={t("entry.mainText")}
      />
    </div>
  );
}
