import { RotateCcw, X } from "lucide-react";
import { useEffect } from "react";
import { useI18n } from "../i18n";
import { useUndoStore } from "../undo/useUndoStore";

export function UndoToast() {
  const { t } = useI18n();
  const offer = useUndoStore((state) => state.offer);
  const undo = useUndoStore((state) => state.undo);
  const dismiss = useUndoStore((state) => state.dismiss);

  useEffect(() => {
    if (!offer) return;
    const timer = window.setTimeout(() => dismiss(offer.id), Math.max(0, offer.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [dismiss, offer]);

  if (!offer) return null;
  return (
    <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-[90] flex w-[min(92vw,34rem)] -translate-x-1/2 items-center gap-3 rounded-[1.2rem] border border-[var(--border-strong)] bg-[var(--surface-solid)] p-3 pl-4 shadow-2xl">
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-muted)]">{t("undo.deleted", { title: offer.label })}</span>
      <button type="button" onClick={undo} className="ws-button-primary flex h-9 items-center gap-2 rounded-full px-4 text-xs font-semibold"><RotateCcw size={14} />{t("undo.action")}</button>
      <button type="button" onClick={() => dismiss(offer.id)} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-faint)] hover:bg-[var(--surface-muted)]" aria-label={t("undo.dismiss")}><X size={15} /></button>
    </div>
  );
}
