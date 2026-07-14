import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "../../../shared/i18n";
import { useWorldRegistryStore } from "../stores/useWorldRegistryStore";
import { createWorld, initializeWorldRegistry, switchWorld } from "../worldWorkspace";

export function WorldSwitcher() {
  const { t } = useI18n();
  const worlds = useWorldRegistryStore((state) => state.worlds);
  const activeWorldId = useWorldRegistryStore((state) => state.activeWorldId);
  const [busy, setBusy] = useState(false);

  useEffect(() => { void initializeWorldRegistry(); }, []);

  async function change(id: string) {
    setBusy(true);
    try { await switchWorld(id); } finally { setBusy(false); }
  }

  async function add() {
    const name = window.prompt(t("worlds.namePrompt"));
    if (!name?.trim()) return;
    setBusy(true);
    try { await createWorld(name, ""); } finally { setBusy(false); }
  }

  return (
    <div className="hidden min-w-0 shrink-0 items-end gap-2 md:flex">
      <label className="min-w-0">
        <span className="block text-[0.66rem] font-bold uppercase tracking-[0.24em] text-[var(--text-faint)]">{t("topbar.workspace")}</span>
        <select value={activeWorldId} disabled={busy} onChange={(event) => void change(event.target.value)} className="ws-display mt-1 max-w-52 bg-transparent text-xl font-semibold outline-none disabled:opacity-50" aria-label={t("worlds.switchWorld")}>
          {worlds.filter((world) => !world.archived).map((world) => <option key={world.id} value={world.id}>{world.name}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => void add()} disabled={busy} className="mb-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] disabled:opacity-40" aria-label={t("worlds.createWorld")}><Plus size={14} /></button>
    </div>
  );
}
