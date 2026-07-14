import { ChevronDown, Eye, EyeOff, Trash2 } from "lucide-react";

import { useI18n } from "../../../shared/i18n";
import {
  TIMELINE_CATEGORIES,
  TIMELINE_CATEGORY_COLORS,
} from "../timelineModel";
import type { TimelineCategory } from "../types";

type TimelineControlsProps = {
  visibleCategories: TimelineCategory[];
  toggleCategory: (category: TimelineCategory) => void;
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
  toggleCategory,
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
  return (
    <aside className="ws-popover-enter absolute left-3 top-14 z-30 max-h-[calc(100%-4.5rem)] w-[min(16rem,calc(100%-1.5rem))] overflow-y-auto rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_96%,transparent)] p-2 shadow-2xl backdrop-blur">
      <details>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-xs font-semibold">
          <ChevronDown size={13} />
          {t("timeline.threads")}
        </summary>
        <div className="space-y-1">
          {TIMELINE_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-xs hover:bg-[var(--surface-muted)]"
            >
              {visibleCategories.includes(category) ? (
                <Eye size={13} />
              ) : (
                <EyeOff size={13} className="text-[var(--text-faint)]" />
              )}
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: TIMELINE_CATEGORY_COLORS[category] }}
              />
              {t(`timeline.category.${category}`)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowRelationships(!showRelationships)}
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-xs hover:bg-[var(--surface-muted)]"
          >
            {showRelationships ? (
              <Eye size={13} />
            ) : (
              <EyeOff size={13} className="text-[var(--text-faint)]" />
            )}
            <span className="h-2.5 w-2.5 rounded-full bg-[#777780]" />
            {t("timeline.relationships")}
          </button>
        </div>
      </details>
      <details className="mt-2 border-t border-[var(--border)] pt-2">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-xs font-semibold">
          <ChevronDown size={13} />
          {t("timeline.lens")}
        </summary>
        <button
          type="button"
          onClick={() => setShowUncertain(!showUncertain)}
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-xs hover:bg-[var(--surface-muted)]"
        >
          <span>{t("timeline.rumorsLegends")}</span>
          {showUncertain ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
        <label className="block px-2 py-2 text-[10px] text-[var(--text-faint)]">
          <span className="flex justify-between">
            <span>{t("timeline.minimumSignificance")}</span>
            <span>{minimumImportance}/5</span>
          </span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={minimumImportance}
            onChange={(event) =>
              setMinimumImportance(Number(event.target.value))
            }
            className="mt-2 w-full accent-[var(--accent)]"
          />
        </label>
      </details>
      {eras.length ? (
        <details className="mt-2 border-t border-[var(--border)] pt-2">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-xs font-semibold">
            <ChevronDown size={13} />
            {t("timeline.eras")}
          </summary>
          <div className="space-y-1">
            {eras.map((era) => (
              <div
                key={era.id}
                className="group flex items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-[var(--surface-muted)]"
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: era.color }}
                />
                <span className="min-w-0 flex-1 truncate">{era.name}</span>
                <button
                  type="button"
                  onClick={() => deleteEra(era.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-faint)] opacity-60 transition hover:bg-red-500/10 hover:text-red-500 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={t("timeline.deleteEra", { name: era.name })}
                  title={t("timeline.deleteEra", { name: era.name })}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </aside>
  );
}
