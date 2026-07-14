import { Plus, X } from "lucide-react";
import { useState } from "react";

import { useI18n } from "../../../shared/i18n";
import type { TimelineEraInput } from "../types";

export function EraComposer({
  createEra,
  close,
}: {
  createEra: (input: TimelineEraInput) => string;
  close: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [startYear, setStartYear] = useState("0");
  const [endYear, setEndYear] = useState("100");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#9b8ac4");

  function submit() {
    const start = Number(startYear);
    const end = Number(endYear);
    if (!name.trim() || !Number.isFinite(start) || !Number.isFinite(end)) return;
    createEra({
      name: name.trim(),
      startYear: Math.min(start, end),
      endYear: Math.max(start, end),
      description,
      color,
    });
    close();
  }

  return (
    <aside className="absolute bottom-3 right-3 top-3 z-40 w-80 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-faint)]">{t("timeline.structure")}</p>
          <h3 className="mt-1 text-lg font-semibold">{t("timeline.defineAnEra")}</h3>
        </div>
        <button type="button" onClick={close}><X size={16} /></button>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{t("timeline.eraComposerHelp")}</p>
      <div className="mt-5 space-y-3">
        <label className="block text-[10px] text-[var(--text-faint)]">
          {t("timeline.eraNameLabel")}
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("timeline.eraName")} className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[10px] text-[var(--text-faint)]">{t("timeline.begins")}<input type="number" value={startYear} onChange={(event) => setStartYear(event.target.value)} className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs" /></label>
          <label className="block text-[10px] text-[var(--text-faint)]">{t("timeline.ends")}<input type="number" value={endYear} onChange={(event) => setEndYear(event.target.value)} className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs" /></label>
        </div>
        <label className="flex items-center justify-between text-[10px] text-[var(--text-faint)]">
          {t("timeline.eraColor")}
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-8 w-12 rounded border-0 bg-transparent" />
        </label>
        <label className="block text-[10px] text-[var(--text-faint)]">
          {t("timeline.eraCharacter")}
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder={t("timeline.eraDescription")} className="ws-input mt-1 w-full rounded-md p-2 text-xs" />
        </label>
        <button type="button" onClick={submit} disabled={!name.trim()} className="ws-button-primary flex h-10 w-full items-center justify-center gap-2 rounded-md text-xs font-semibold disabled:opacity-40"><Plus size={14} />{t("timeline.establishEra")}</button>
      </div>
    </aside>
  );
}
