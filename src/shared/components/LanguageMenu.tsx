import { Check, ChevronDown, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n, type Locale } from "../i18n";

const options: Array<{ value: Locale; label: string; short: string }> = [
  { value: "en-US", label: "English", short: "EN" },
  { value: "zh-CN", label: "中文", short: "中文" },
];

export function LanguageMenu() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const current = options.find((option) => option.value === locale) ?? options[0];
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Languages size={18} strokeWidth={1.65} />
        <span className="flex-1 text-left">{t("topbar.language")}</span>
        <span className="text-xs">{current.short}</span>
        <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div role="menu" className="ws-popover-enter absolute bottom-[calc(100%+.5rem)] left-0 z-50 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-1.5 shadow-2xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={locale === option.value}
              onClick={() => {
                setLocale(option.value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-[var(--surface-muted)]"
            >
              <span className="flex-1 font-semibold">{option.label}</span>
              {locale === option.value ? <Check size={15} className="text-[var(--accent)]" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
