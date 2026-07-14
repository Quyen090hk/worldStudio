import { Plus, X } from "lucide-react";
import { useState } from "react";

import { useI18n } from "../../../shared/i18n";
import type { EntryType } from "../../entries/types";
import { TIMELINE_CATEGORIES } from "../timelineModel";
import type { TimelineCategory, TimelineCertainty } from "../types";

type TimelineComposerProps = {
  entries: Array<{ id: string; title: string; type: EntryType }>;
  createItem: (input: {
    entryId: string;
    startYear: number;
    endYear: number | null;
    description: string;
    color: string | null;
    category?: TimelineCategory;
    importance?: 1 | 2 | 3 | 4 | 5;
    certainty?: TimelineCertainty;
  }) => string;
  close: () => void;
  created: (id: string, year: number) => void;
};

export function TimelineComposer({
  entries,
  createItem,
  close,
  created,
}: TimelineComposerProps) {
  const { t } = useI18n();
  const [entryId, setEntryId] = useState(
    entries.find((entry) => entry.type === "Event")?.id ?? entries[0]?.id ?? "",
  );
  const [startYear, setStartYear] = useState("0");
  const [endYear, setEndYear] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TimelineCategory>("Other");
  const [importance, setImportance] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [certainty, setCertainty] = useState<TimelineCertainty>("canon");

  function submit() {
    const start = Number(startYear);
    const end = endYear.trim() ? Number(endYear) : null;
    if (!entryId || !Number.isFinite(start) || (end !== null && !Number.isFinite(end))) return;
    const id = createItem({
      entryId,
      startYear: Math.min(start, end ?? start),
      endYear: end === null ? null : Math.max(start, end),
      description,
      color: null,
      category,
      importance,
      certainty,
    });
    created(id, start);
  }

  return (
    <aside className="ws-panel-enter-right absolute bottom-3 left-3 right-3 top-3 z-40 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] p-4 shadow-2xl sm:left-auto sm:w-80">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-faint)]">{t("timeline.eyebrow")}</p>
          <h3 className="mt-1 text-lg font-semibold">{t("timeline.recordHistoricalEvent")}</h3>
        </div>
        <button type="button" onClick={close} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-faint)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]" aria-label={t("common.close")} title={t("common.close")}><X size={16} /></button>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{t("timeline.composerHelp")}</p>
      <div className="mt-5 space-y-3">
        <label className="block text-[10px] text-[var(--text-faint)]">
          {t("common.entries")}
          <select value={entryId} onChange={(event) => setEntryId(event.target.value)} className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs">
            {entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} · {t(`type.${entry.type}`)}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[10px] text-[var(--text-faint)]">{t("timeline.startYear")}<input type="number" value={startYear} onChange={(event) => setStartYear(event.target.value)} className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs" /></label>
          <label className="block text-[10px] text-[var(--text-faint)]">{t("timeline.endYear")}<input type="number" value={endYear} onChange={(event) => setEndYear(event.target.value)} placeholder={t("timeline.point")} className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs" /></label>
        </div>
        <label className="block text-[10px] text-[var(--text-faint)]">
          {t("timeline.threads")}
          <select value={category} onChange={(event) => setCategory(event.target.value as TimelineCategory)} className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs">
            {TIMELINE_CATEGORIES.map((value) => <option key={value} value={value}>{t(`timeline.category.${value}`)}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[10px] text-[var(--text-faint)]">
            {t("timeline.significance")}
            <select value={importance} onChange={(event) => setImportance(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)} className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs">
              <option value={1}>1 · {t("timeline.footnote")}</option><option value={2}>2 · {t("timeline.minor")}</option><option value={3}>3 · {t("timeline.notable")}</option><option value={4}>4 · {t("timeline.major")}</option><option value={5}>5 · {t("timeline.worldShaping")}</option>
            </select>
          </label>
          <label className="block text-[10px] text-[var(--text-faint)]">
            {t("timeline.status")}
            <select value={certainty} onChange={(event) => setCertainty(event.target.value as TimelineCertainty)} className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs">
              <option value="canon">{t("timeline.canon")}</option><option value="rumored">{t("timeline.rumored")}</option><option value="legendary">{t("timeline.legendary")}</option>
            </select>
          </label>
        </div>
        <label className="block text-[10px] text-[var(--text-faint)]">{t("timeline.note")}<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="ws-input mt-1 w-full rounded-md p-2 text-xs" placeholder={t("timeline.contextPlaceholder")} /></label>
        <button type="button" onClick={submit} disabled={!entryId || startYear === ""} className="ws-button-primary flex h-10 w-full items-center justify-center gap-2 rounded-md text-xs font-semibold disabled:opacity-40"><Plus size={14} />{t("timeline.addToChronicle")}</button>
      </div>
    </aside>
  );
}
