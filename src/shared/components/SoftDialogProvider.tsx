import { AlertTriangle, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useI18n } from "../i18n";
import { SoftDialogContext, type DialogOptions } from "./softDialogContext";

type DialogRequest = DialogOptions & {
  kind: "confirm" | "prompt";
  resolve: (value: boolean | string | null) => void;
};

export function SoftDialogProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [value, setValue] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback((result: boolean | string | null) => {
    setRequest((current) => {
      current?.resolve(result);
      return null;
    });
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!request) return;
    const frame = requestAnimationFrame(() => request.kind === "prompt" ? promptRef.current?.focus() : confirmRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(request.kind === "confirm" ? false : null);
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, request]);

  const confirm = useCallback((options: DialogOptions) => new Promise<boolean>((resolve) => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setValue(options.defaultValue ?? "");
    setRequest({ ...options, kind: "confirm", resolve: (result) => resolve(result === true) });
  }), []);
  const prompt = useCallback((options: DialogOptions) => new Promise<string | null>((resolve) => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setValue(options.defaultValue ?? "");
    setRequest({ ...options, kind: "prompt", resolve: (result) => resolve(typeof result === "string" ? result : null) });
  }), []);

  return <SoftDialogContext.Provider value={{ confirm, prompt }}>
    {children}
    {request ? createPortal(
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[color-mix(in_srgb,#211a12_34%,transparent)] p-4 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget) close(request.kind === "confirm" ? false : null); }}>
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="soft-dialog-title" aria-describedby="soft-dialog-description" className="ws-popover-enter w-full max-w-md rounded-[1.75rem] border border-[var(--border-strong)] bg-[var(--surface-solid)] p-5 shadow-[0_28px_90px_rgba(35,27,17,.24)] sm:p-6">
          <div className="flex items-start gap-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${request.danger ? "bg-red-500/10 text-red-500" : "bg-[var(--accent-soft)] text-[var(--accent)]"}`}>
              {request.danger ? <AlertTriangle size={18} /> : <MessageCircle size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="soft-dialog-title" className="ws-display text-xl font-semibold text-[var(--text)]">{request.title ?? t(request.danger ? "dialog.caution" : "dialog.confirmTitle")}</h2>
              <p id="soft-dialog-description" className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{request.message}</p>
              {request.kind === "prompt" ? <input ref={promptRef} value={value} onChange={(event) => setValue(event.target.value)} placeholder={request.placeholder} onKeyDown={(event) => { if (event.key === "Enter" && (request.allowEmpty || value.trim())) close(value.trim()); }} className="ws-input ws-field mt-4 w-full text-sm" /> : null}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => close(request.kind === "confirm" ? false : null)} className="ws-button-secondary h-10 rounded-full px-4 text-sm font-semibold">{t("common.cancel")}</button>
            <button ref={confirmRef} type="button" disabled={request.kind === "prompt" && !request.allowEmpty && !value.trim()} onClick={() => close(request.kind === "prompt" ? value.trim() : true)} className={`h-10 rounded-full px-5 text-sm font-semibold transition disabled:opacity-40 ${request.danger ? "bg-red-500 text-white hover:bg-red-600" : "ws-button-primary"}`}>{request.confirmLabel ?? t("common.confirm")}</button>
          </div>
        </section>
      </div>, document.body) : null}
  </SoftDialogContext.Provider>;
}
