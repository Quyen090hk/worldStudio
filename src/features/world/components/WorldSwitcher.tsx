import { Check, ChevronDown, Plus, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/i18n";
import { useWorldRegistryStore } from "../stores/useWorldRegistryStore";
import { useWorldStore } from "../stores/useWorldStore";
import { createWorld, initializeWorldRegistry, switchWorld } from "../worldWorkspace";

export function WorldSwitcher() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const worlds = useWorldRegistryStore((state) => state.worlds);
  const activeWorldId = useWorldRegistryStore((state) => state.activeWorldId);
  const profile = useWorldStore((state) => state.profile);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => { void initializeWorldRegistry(); }, []);
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

  async function change(id: string) {
    if (id === activeWorldId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await switchWorld(id);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const name = window.prompt(t("worlds.namePrompt"));
    if (!name?.trim()) return;
    setBusy(true);
    try {
      await createWorld(name, "");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  const active = worlds.find((world) => world.id === activeWorldId);
  const available = worlds.filter((world) => !world.archived);
  return (
    <div ref={rootRef} className="relative hidden min-w-0 shrink-0 md:block">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
        className="group flex h-10 max-w-64 items-center gap-2 rounded-xl px-2.5 text-left transition hover:bg-[var(--surface-muted)] disabled:opacity-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="ws-display min-w-0 flex-1 truncate text-base font-semibold text-[var(--text)]">{active?.name ?? profile.name}</span>
        <ChevronDown size={15} className={`shrink-0 text-[var(--text-faint)] transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div role="menu" className="ws-popover-enter absolute left-0 top-[calc(100%+.55rem)] z-50 w-80 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-1.5 shadow-2xl">
          <p className="px-3 py-2 text-[.65rem] font-bold uppercase tracking-[.18em] text-[var(--text-faint)]">{t("worlds.switchWorld")}</p>
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
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm text-[var(--text)]">{world.name}</b>
                  <span className="mt-0.5 block truncate text-xs text-[var(--text-faint)]">{world.description || t("worlds.noDescription")}</span>
                </span>
                {world.id === activeWorldId ? <Check size={16} className="mt-1 shrink-0 text-[var(--accent)]" /> : null}
              </button>
            ))}
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
