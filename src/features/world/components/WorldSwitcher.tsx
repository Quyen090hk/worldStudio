import { Check, ChevronDown, Plus, Search, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/i18n";
import { useSoftDialog } from "../../../shared/components/softDialogContext";
import { useWorldRegistryStore } from "../stores/useWorldRegistryStore";
import { useWorldStore } from "../stores/useWorldStore";
import { createWorld, initializeWorldRegistry, switchWorld } from "../worldWorkspace";

export function WorldSwitcher() {
  const { t } = useI18n();
  const dialog = useSoftDialog();
  const navigate = useNavigate();
  const worlds = useWorldRegistryStore((state) => state.worlds);
  const activeWorldId = useWorldRegistryStore((state) => state.activeWorldId);
  const profile = useWorldStore((state) => state.profile);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void initializeWorldRegistry().catch(() => setError(t("worlds.switchFailed")));
  }, [t]);
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      const search = menuRef.current?.querySelector<HTMLInputElement>('input[type="search"]');
      (search ?? menuRef.current?.querySelector<HTMLElement>('[role="menuitemradio"]'))?.focus();
    });
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []);
    if (!items.length) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.key === "ArrowDown"
      ? (currentIndex + 1 + items.length) % items.length
      : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  async function change(id: string) {
    if (id === activeWorldId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await switchWorld(id);
      setOpen(false);
    } catch {
      setError(t("worlds.switchFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const name = await dialog.prompt({ message: t("worlds.namePrompt"), confirmLabel: t("common.create") });
    if (!name?.trim()) return;
    const description = await dialog.prompt({ message: t("worlds.descriptionPrompt"), confirmLabel: t("common.continue"), defaultValue: "", allowEmpty: true });
    if (description === null) return;
    setBusy(true);
    setError("");
    try {
      await createWorld(name, description);
      setOpen(false);
    } catch {
      setError(t("worlds.createFailed"));
    } finally {
      setBusy(false);
    }
  }

  const active = worlds.find((world) => world.id === activeWorldId);
  const activeName = active?.name ?? profile.name;
  const available = worlds
    .filter((world) => !world.archived)
    .filter((world) => `${world.name} ${world.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((a, b) => Number(b.id === activeWorldId) - Number(a.id === activeWorldId) || b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div ref={rootRef} className="relative min-w-0 shrink-0">
      <button
        ref={triggerRef}
        type="button"
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="group flex h-10 w-10 items-center justify-center gap-2 rounded-xl text-left transition hover:bg-[var(--surface-muted)] disabled:opacity-50 md:w-auto md:max-w-64 md:justify-start md:px-2.5"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("worlds.switchWorld")}: ${activeName}`}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-strong)] md:hidden" aria-hidden="true">{activeName.trim().slice(0, 1).toLocaleUpperCase() || "·"}</span>
        <span className="ws-display hidden min-w-0 flex-1 truncate text-base font-semibold text-[var(--text)] md:block">{activeName}</span>
        <ChevronDown size={15} className={`hidden shrink-0 text-[var(--text-faint)] transition md:block ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div ref={menuRef} role="menu" aria-label={t("worlds.switchWorld")} onKeyDown={handleMenuKeyDown} className="ws-popover-enter fixed left-2 right-2 top-[4.25rem] z-50 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-solid)] p-1.5 shadow-2xl md:absolute md:left-0 md:right-auto md:top-[calc(100%+.55rem)] md:w-80">
          <p className="px-3 py-2 text-[.65rem] font-bold uppercase tracking-[.18em] text-[var(--text-faint)]">{t("worlds.switchWorld")}</p>
          {worlds.filter((world) => !world.archived).length > 5 ? <label className="mx-2 mb-1 flex h-9 items-center gap-2 rounded-xl bg-[var(--surface-muted)] px-3"><Search size={14} className="text-[var(--text-faint)]" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("worlds.search")} className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label> : null}
          {error ? <p role="alert" className="mx-2 mb-1 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">{error}</p> : null}
          <div className="max-h-72 overflow-y-auto">
            {available.map((world) => (
              <button
                key={world.id}
                type="button"
                role="menuitemradio"
                aria-checked={world.id === activeWorldId}
                onClick={() => void change(world.id)}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--surface-muted)]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-strong)]">{world.name.trim().slice(0, 1).toLocaleUpperCase() || "·"}</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm text-[var(--text)]">{world.name}</b>
                  <span className="mt-0.5 block truncate text-xs text-[var(--text-faint)]">{world.description || t("worlds.noDescription")}</span>
                </span>
                {world.id === activeWorldId ? <Check size={16} className="mt-1 shrink-0 text-[var(--accent)]" /> : null}
              </button>
            ))}
            {!available.length ? <p className="px-3 py-6 text-center text-xs text-[var(--text-faint)]">{t("worlds.noMatches")}</p> : null}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1 border-t border-[var(--border)] pt-1.5">
            <button type="button" onClick={() => void add()} className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold hover:bg-[var(--surface-muted)]">
              <Plus size={14} /> {t("worlds.createWorld")}
            </button>
            <button type="button" onClick={() => { setOpen(false); navigate("/settings"); }} className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold hover:bg-[var(--surface-muted)]">
              <Settings2 size={14} /> {t("worlds.title")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
