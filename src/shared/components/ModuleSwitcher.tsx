import { Check, ChevronDown, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { moduleForPath, workspaceModules } from "../navigation/modules";
import { LanguageMenu } from "./LanguageMenu";
import { useTheme } from "../theme/ThemeContext";

export function ModuleSwitcher() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = moduleForPath(location.pathname);
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLElement>('[role="menuitemradio"]')
        ?.focus({ preventScroll: true });
    });
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("mousedown", closeOutside);
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("mousedown", closeOutside);
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [open]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []);
    if (!items.length) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1 + items.length) % items.length
          : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex h-10 items-center gap-2 rounded-xl px-2.5 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t(current.label)}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <CurrentIcon size={16} strokeWidth={1.7} />
        </span>
        <span className="hidden min-[480px]:inline">{t(current.label)}</span>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open ? (
        <div ref={menuRef} role="menu" aria-label={t("navigation.primary")} onKeyDown={handleMenuKeyDown} className="ws-module-menu-enter fixed left-2 right-2 top-[4.25rem] z-50 grid grid-cols-2 gap-1 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-solid)] p-2 shadow-2xl sm:absolute sm:left-0 sm:right-auto sm:top-[calc(100%+.55rem)] sm:w-[min(31rem,calc(100vw-2rem))] sm:grid-cols-3">
          {workspaceModules.map((item) => {
            const Icon = item.icon;
            const active = item.path === current.path;
            return (
              <button
                key={item.path}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  navigate(item.path);
                  setOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-[var(--surface-muted)]"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center"><Icon size={17} className={active ? "text-[var(--accent)]" : "text-[var(--text-faint)]"} /></span>
                <span className="min-w-0 flex-1 truncate font-semibold">{t(item.label)}</span>
                {active ? <Check size={14} className="text-[var(--accent)]" /> : null}
              </button>
            );
          })}
          <div role="none" onKeyDown={(event) => event.stopPropagation()} className="col-span-2 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2 sm:hidden">
            <LanguageMenu compact />
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs font-semibold text-[var(--text-muted)]"
              aria-label={theme === "dark" ? t("theme.switchToLight") : t("theme.switchToDark")}
              aria-pressed={theme === "dark"}
            >
              {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
              {theme === "dark" ? t("theme.switchToLight") : t("theme.switchToDark")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
