import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useI18n } from "../../../shared/i18n";
import { isDefaultTimelineLane } from "../timelineModel";
import type { TimelineCategory, TimelineLane, WorldYearFormat } from "../types";

type TimelineControlsProps = {
  visibleCategories: TimelineCategory[];
  lanes: TimelineLane[];
  toggleCategory: (category: TimelineCategory) => void;
  createLane: (name: string, color: string) => void;
  updateLane: (id: string, patch: Partial<Pick<TimelineLane, "name" | "color">>) => void;
  deleteLane: (id: string) => void;
  moveLane: (id: string, direction: -1 | 1) => void;
  yearFormat: WorldYearFormat;
  setYearFormat: (format: WorldYearFormat) => void;
  showRelationships: boolean;
  setShowRelationships: (value: boolean) => void;
  showUncertain: boolean;
  setShowUncertain: (value: boolean) => void;
  minimumImportance: number;
  setMinimumImportance: (value: number) => void;
  eras: Array<{ id: string; name: string; color: string }>;
  deleteEra: (id: string) => void;
};

export function TimelineControls({
  visibleCategories,
  lanes,
  toggleCategory,
  createLane,
  updateLane,
  deleteLane,
  moveLane,
  yearFormat,
  setYearFormat,
  showRelationships,
  setShowRelationships,
  showUncertain,
  setShowUncertain,
  minimumImportance,
  setMinimumImportance,
  eras,
  deleteEra,
}: TimelineControlsProps) {
  const { t } = useI18n();
  const [newLaneName, setNewLaneName] = useState("");
  const [newLaneColor, setNewLaneColor] = useState("#8b7355");

  function addLane() {
    if (!newLaneName.trim()) return;
    createLane(newLaneName, newLaneColor);
    setNewLaneName("");
  }

  return (
    <aside className="ws-popover-enter absolute left-3 top-14 z-30 max-h-[calc(100%-4.5rem)] w-[min(22rem,calc(100%-1.5rem))] overflow-y-auto rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_96%,transparent)] p-2 shadow-2xl backdrop-blur">
      <details open>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-xs font-semibold"><ChevronDown size={13} />{t("timeline.threads")}</summary>
        <div className="space-y-1">
          {lanes.map((lane, index) => {
            const displayName = isDefaultTimelineLane(lane) ? t(`timeline.category.${lane.id}`) : lane.name;
            return (
            <div key={lane.id} className="group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-[var(--surface-muted)]">
              <button type="button" onClick={() => toggleCategory(lane.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md" aria-label={visibleCategories.includes(lane.id) ? t("timeline.hideLane", { name: displayName }) : t("timeline.showLane", { name: displayName })}>
                {visibleCategories.includes(lane.id) ? <Eye size={13} /> : <EyeOff size={13} className="text-[var(--text-faint)]" />}
              </button>
              <input type="color" value={lane.color} onChange={(event) => updateLane(lane.id, { color: event.target.value })} className="h-7 w-7 shrink-0 border-0 bg-transparent" aria-label={t("timeline.laneColor", { name: displayName })} />
              <input value={displayName} onChange={(event) => updateLane(lane.id, { name: event.target.value })} aria-label={t("timeline.laneName")} className="min-w-0 flex-1 bg-transparent px-1 text-xs outline-none" placeholder={t("timeline.laneName")} />
              <button type="button" disabled={index === 0} onClick={() => moveLane(lane.id, -1)} className="flex h-7 w-7 items-center justify-center rounded disabled:opacity-20" aria-label={t("timeline.moveLaneUp", { name: displayName })}><ArrowUp size={11} /></button>
              <button type="button" disabled={index === lanes.length - 1} onClick={() => moveLane(lane.id, 1)} className="flex h-7 w-7 items-center justify-center rounded disabled:opacity-20" aria-label={t("timeline.moveLaneDown", { name: displayName })}><ArrowDown size={11} /></button>
              <button type="button" disabled={lanes.length <= 1} onClick={() => deleteLane(lane.id)} className="flex h-7 w-7 items-center justify-center rounded text-red-500 opacity-60 hover:bg-red-500/10 disabled:opacity-20" aria-label={t("timeline.deleteLane", { name: displayName })}><Trash2 size={11} /></button>
            </div>
          );})}
          <div className="mt-2 flex items-center gap-1 border-t border-[var(--border)] pt-2">
            <input type="color" value={newLaneColor} onChange={(event) => setNewLaneColor(event.target.value)} className="h-8 w-8 border-0 bg-transparent" aria-label={t("timeline.newLaneColor")} />
            <input value={newLaneName} onChange={(event) => setNewLaneName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addLane(); }} placeholder={t("timeline.newLane")} className="ws-input h-8 min-w-0 flex-1 rounded-md px-2 text-xs" />
            <button type="button" disabled={!newLaneName.trim()} onClick={addLane} className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)] disabled:opacity-30" aria-label={t("timeline.addLane")}><Plus size={13} /></button>
          </div>
          <button type="button" onClick={() => setShowRelationships(!showRelationships)} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-xs hover:bg-[var(--surface-muted)]">
            {showRelationships ? <Eye size={13} /> : <EyeOff size={13} className="text-[var(--text-faint)]" />}<span className="h-2.5 w-2.5 rounded-full bg-[#777780]" />{t("timeline.relationships")}
          </button>
        </div>
      </details>

      <details className="mt-2 border-t border-[var(--border)] pt-2">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-xs font-semibold"><ChevronDown size={13} />{t("timeline.yearFormat")}</summary>
        <div className="grid grid-cols-2 gap-2 px-2 pb-2">
          <label className="text-[10px] text-[var(--text-faint)]">{t("timeline.beforeSuffix")}<input value={yearFormat.beforeSuffix} onChange={(event) => setYearFormat({ ...yearFormat, beforeSuffix: event.target.value })} className="ws-input mt-1 h-8 w-full rounded-md px-2 text-xs" /></label>
          <label className="text-[10px] text-[var(--text-faint)]">{t("timeline.afterSuffix")}<input value={yearFormat.afterSuffix} onChange={(event) => setYearFormat({ ...yearFormat, afterSuffix: event.target.value })} className="ws-input mt-1 h-8 w-full rounded-md px-2 text-xs" /></label>
          <label className="col-span-2 text-[10px] text-[var(--text-faint)]">{t("timeline.zeroLabel")}<input value={yearFormat.zeroLabel} onChange={(event) => setYearFormat({ ...yearFormat, zeroLabel: event.target.value })} className="ws-input mt-1 h-8 w-full rounded-md px-2 text-xs" /></label>
        </div>
      </details>

      <details className="mt-2 border-t border-[var(--border)] pt-2">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-xs font-semibold"><ChevronDown size={13} />{t("timeline.lens")}</summary>
        <button type="button" onClick={() => setShowUncertain(!showUncertain)} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-xs hover:bg-[var(--surface-muted)]"><span>{t("timeline.rumorsLegends")}</span>{showUncertain ? <Eye size={13} /> : <EyeOff size={13} />}</button>
        <label className="block px-2 py-2 text-[10px] text-[var(--text-faint)]"><span className="flex justify-between"><span>{t("timeline.minimumSignificance")}</span><span>{minimumImportance}/5</span></span><input type="range" min={1} max={5} step={1} value={minimumImportance} onChange={(event) => setMinimumImportance(Number(event.target.value))} className="mt-2 w-full accent-[var(--accent)]" /></label>
      </details>

      {eras.length ? <details className="mt-2 border-t border-[var(--border)] pt-2"><summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-xs font-semibold"><ChevronDown size={13} />{t("timeline.eras")}</summary><div className="space-y-1">{eras.map((era) => <div key={era.id} className="group flex items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-[var(--surface-muted)]"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: era.color }} /><span className="min-w-0 flex-1 truncate">{era.name}</span><button type="button" onClick={() => deleteEra(era.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-faint)] opacity-60 transition hover:bg-red-500/10 hover:text-red-500 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label={t("timeline.deleteEra", { name: era.name })}><Trash2 size={12} /></button></div>)}</div></details> : null}
    </aside>
  );
}
