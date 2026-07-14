import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";
import {
  CalendarRange,
  ChevronDown,
  Eye,
  EyeOff,
  Focus,
  Maximize2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MotionPage } from "../../shared/components/MotionPage";
import { useI18n } from "../../shared/i18n";
import { useEntryStore } from "../entries/stores/useEntryStore";
import type { EntryType } from "../entries/types";
import { useRelationshipStore } from "../graph/stores/useRelationshipStore";
import {
  formatWorldYear,
  niceYearStep,
  resolveTimelineItems,
  TIMELINE_CATEGORIES,
  TIMELINE_CATEGORY_COLORS,
  type ResolvedTimelineItem,
} from "./timelineModel";
import { useTimelineStore } from "./stores/useTimelineStore";
import type {
  TimelineCategory,
  TimelineCertainty,
  TimelineEraInput,
  TimelineViewport,
} from "./types";

const LANE_LABEL_WIDTH = 118;

type PositionedItem = ResolvedTimelineItem & { track: number };

function assignTracks(items: ResolvedTimelineItem[], minimumSpan: number) {
  const ends: number[] = [];
  return [...items]
    .sort((left, right) => left.startYear - right.startYear)
    .map<PositionedItem>((item) => {
      const visualEnd = Math.max(
        item.endYear ?? item.startYear,
        item.startYear + minimumSpan,
      );
      let track = ends.findIndex((end) => item.startYear > end);
      if (track === -1) track = ends.length;
      ends[track] = visualEnd;
      return { ...item, track };
    });
}

export function TimelinePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { locale, t } = useI18n();
  const entries = useEntryStore((state) => state.entries);
  const relationships = useRelationshipStore((state) => state.relationships);
  const storedItems = useTimelineStore((state) => state.items);
  const eras = useTimelineStore((state) => state.eras);
  const savedViewport = useTimelineStore((state) => state.viewport);
  const createItem = useTimelineStore((state) => state.createItem);
  const deleteItem = useTimelineStore((state) => state.deleteItem);
  const createEra = useTimelineStore((state) => state.createEra);
  const deleteEra = useTimelineStore((state) => state.deleteEra);
  const persistViewport = useTimelineStore((state) => state.setViewport);
  const requestedItem = storedItems.find(
    (item) => item.entryId === searchParams.get("entry"),
  );
  const [viewport, setViewport] = useState(() =>
    requestedItem
      ? {
          ...savedViewport,
          centerYear:
            (requestedItem.startYear +
              (requestedItem.endYear ?? requestedItem.startYear)) /
            2,
        }
      : savedViewport,
  );
  const [query, setQuery] = useState("");
  const [visibleCategories, setVisibleCategories] =
    useState<TimelineCategory[]>(TIMELINE_CATEGORIES);
  const [showRelationships, setShowRelationships] = useState(true);
  const [showUncertain, setShowUncertain] = useState(true);
  const [minimumImportance, setMinimumImportance] = useState(1);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(
    requestedItem?.id ?? null,
  );
  const [composerOpen, setComposerOpen] = useState(false);
  const [eraComposerOpen, setEraComposerOpen] = useState(false);
  const [width, setWidth] = useState(900);
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef(viewport);
  const persistTimerRef = useRef(0);
  const panRef = useRef<{ x: number; centerYear: number } | null>(null);

  const allItems = useMemo(
    () => resolveTimelineItems(storedItems, entries, relationships),
    [storedItems, entries, relationships],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      allItems.filter((item) => {
        if (item.lane === "Relationships" && !showRelationships) return false;
        if (
          item.lane !== "Relationships" &&
          !visibleCategories.includes(item.lane)
        )
          return false;
        if (!showUncertain && item.certainty !== "canon") return false;
        if (item.importance < minimumImportance) return false;
        if (!normalizedQuery) return true;
        return `${item.title} ${item.summary} ${item.tags.join(" ")}`
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    [
      allItems,
      minimumImportance,
      normalizedQuery,
      showRelationships,
      showUncertain,
      visibleCategories,
    ],
  );
  const selected = allItems.find((item) => item.id === selectedId) ?? null;
  const contentWidth = Math.max(240, width - LANE_LABEL_WIDTH);
  const windowStart = viewport.centerYear - viewport.yearsPerScreen / 2;
  const windowEnd = viewport.centerYear + viewport.yearsPerScreen / 2;
  const yearToX = (year: number) =>
    LANE_LABEL_WIDTH +
    ((year - windowStart) / viewport.yearsPerScreen) * contentWidth;
  const step = niceYearStep(viewport.yearsPerScreen);
  const ticks = useMemo(() => {
    const result: number[] = [];
    for (
      let year = Math.ceil(windowStart / step) * step;
      year <= windowEnd;
      year += step
    ) {
      result.push(Number(year.toFixed(8)));
    }
    return result;
  }, [step, windowStart, windowEnd]);

  const lanes = useMemo(() => {
    const names: Array<TimelineCategory | "Relationships"> = [
      ...TIMELINE_CATEGORIES.filter((category) =>
        visibleCategories.includes(category),
      ),
      ...(showRelationships ? (["Relationships"] as const) : []),
    ];
    return names.map((name) => {
      const laneItems = filteredItems.filter(
        (item) =>
          item.lane === name &&
          (item.endYear ?? item.startYear) >= windowStart &&
          item.startYear <= windowEnd,
      );
      const positioned = assignTracks(
        laneItems,
        (viewport.yearsPerScreen * 118) / contentWidth,
      );
      const tracks = positioned.reduce(
        (maximum, item) => Math.max(maximum, item.track + 1),
        1,
      );
      return {
        name,
        items: positioned,
        height: Math.max(72, tracks * 34 + 34),
      };
    });
  }, [
    contentWidth,
    filteredItems,
    showRelationships,
    viewport.yearsPerScreen,
    visibleCategories,
    windowEnd,
    windowStart,
  ]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(persistTimerRef.current);
    },
    [],
  );

  function updateViewport(next: TimelineViewport, persistImmediately = false) {
    viewportRef.current = next;
    setViewport(next);
    window.clearTimeout(persistTimerRef.current);
    if (persistImmediately) persistViewport(next);
    else {
      persistTimerRef.current = window.setTimeout(
        () => persistViewport(next),
        180,
      );
    }
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const localX = Math.max(
      0,
      Math.min(contentWidth, event.clientX - bounds.left - LANE_LABEL_WIDTH),
    );
    const ratio = localX / contentWidth;
    const yearAtPointer = windowStart + ratio * viewport.yearsPerScreen;
    const nextSpan = Math.max(
      0.5,
      Math.min(
        10_000_000,
        viewport.yearsPerScreen * Math.exp(event.deltaY * 0.0015),
      ),
    );
    updateViewport({
      centerYear: yearAtPointer - (ratio - 0.5) * nextSpan,
      yearsPerScreen: nextSpan,
    });
  }

  function beginPan(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    panRef.current = { x: event.clientX, centerYear: viewport.centerYear };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePan(event: PointerEvent<HTMLDivElement>) {
    if (!panRef.current) return;
    const delta = event.clientX - panRef.current.x;
    const next = {
      ...viewport,
      centerYear:
        panRef.current.centerYear -
        (delta / contentWidth) * viewport.yearsPerScreen,
    };
    viewportRef.current = next;
    setViewport(next);
  }

  function endPan(event: PointerEvent<HTMLDivElement>) {
    if (!panRef.current) return;
    panRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    persistViewport(viewportRef.current);
  }

  function fitTimeline() {
    if (!filteredItems.length && !eras.length) return;
    const minimum = Math.min(
      ...filteredItems.map((item) => item.startYear),
      ...eras.map((era) => era.startYear),
    );
    const maximum = Math.max(
      ...filteredItems.map((item) => item.endYear ?? item.startYear),
      ...eras.map((era) => era.endYear),
    );
    const span = Math.max(10, maximum - minimum);
    updateViewport(
      { centerYear: (minimum + maximum) / 2, yearsPerScreen: span * 1.3 },
      true,
    );
  }

  function toggleCategory(category: TimelineCategory) {
    setVisibleCategories((current) =>
      current.includes(category)
        ? current.filter((candidate) => candidate !== category)
        : [...current, category],
    );
  }

  return (
    <MotionPage className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ws-eyebrow">{t("timeline.eyebrow")}</p>
          <h2 className="mt-1 text-4xl font-semibold tracking-[-.04em]">
            {t("nav.timeline")}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>
            {filteredItems.length} {t("timeline.records")} · {eras.length} {t("timeline.eras")}
          </span>
          <span>·</span>
          <span>
            {formatWorldYear(windowStart, locale)}–{formatWorldYear(windowEnd, locale)}
          </span>
        </div>
      </header>

      <section className="relative h-[calc(100vh-12.5rem)] min-h-[680px] overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-raised)]">
        <div className="absolute left-3 top-3 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setControlsOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--text-muted)] shadow-lg"
            aria-label={t("timeline.controls")}
          >
            <CalendarRange size={15} />
          </button>
          <label className="flex h-9 w-60 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] px-3 text-[var(--text-muted)] shadow-lg">
            <Search size={14} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("timeline.search")}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")}>
                <X size={13} />
              </button>
            ) : null}
          </label>
          <button
            type="button"
            onClick={() => {
              setComposerOpen(true);
              setEraComposerOpen(false);
            }}
            className="ws-button-primary flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold shadow-lg"
          >
            <Plus size={14} />
            {t("timeline.recordEvent")}
          </button>
          <button
            type="button"
            onClick={() => {
              setEraComposerOpen(true);
              setComposerOpen(false);
            }}
            className="ws-button-secondary flex h-9 items-center gap-2 rounded-lg px-3 text-xs shadow-lg"
          >
            <Plus size={14} />
            {t("timeline.defineEra")}
          </button>
        </div>

        {controlsOpen ? (
          <TimelineControls
            visibleCategories={visibleCategories}
            toggleCategory={toggleCategory}
            showRelationships={showRelationships}
            setShowRelationships={setShowRelationships}
            showUncertain={showUncertain}
            setShowUncertain={setShowUncertain}
            minimumImportance={minimumImportance}
            setMinimumImportance={setMinimumImportance}
            eras={eras}
            deleteEra={deleteEra}
          />
        ) : null}

        <div
          ref={canvasRef}
          onWheel={handleWheel}
          onPointerDown={beginPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          className="absolute inset-0 cursor-grab overflow-auto pt-16 active:cursor-grabbing"
        >
          <div
            className="relative min-h-full select-none"
            style={{ minWidth: 620 }}
          >
            <div className="sticky top-0 z-20 h-12 border-y border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_92%,transparent)] backdrop-blur">
              <div className="absolute inset-y-0 left-0 flex w-[118px] items-center px-3 text-[9px] font-semibold uppercase tracking-[.16em] text-[var(--text-faint)]">
                {t("timeline.worldYear")}
              </div>
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className="absolute inset-y-0 border-l border-[var(--border)]"
                  style={{ left: yearToX(tick) }}
                >
                  <span className="absolute left-2 top-3 whitespace-nowrap text-[10px] text-[var(--text-faint)]">
                    {formatWorldYear(tick, locale)}
                  </span>
                </div>
              ))}
            </div>

            <div className="relative h-10 border-b border-[var(--border)] bg-[var(--surface-muted)]/40">
              <div className="absolute inset-y-0 left-0 z-10 flex w-[118px] items-center border-r border-[var(--border)] bg-[var(--surface-solid)]/90 px-3 text-[9px] font-semibold uppercase tracking-[.14em] text-[var(--text-faint)]">
                {t("timeline.historicalEras")}
              </div>
              {eras
                .filter(
                  (era) =>
                    era.endYear >= windowStart && era.startYear <= windowEnd,
                )
                .map((era) => {
                  const left = yearToX(Math.max(era.startYear, windowStart));
                  const right = yearToX(Math.min(era.endYear, windowEnd));
                  return (
                    <div
                      key={era.id}
                      className="absolute inset-y-1 flex items-center overflow-hidden rounded px-2 text-[9px] font-semibold"
                      style={{
                        left,
                        width: Math.max(2, right - left),
                        color: "var(--text)",
                        background: `color-mix(in srgb, ${era.color} 25%, transparent)`,
                        borderLeft: `2px solid ${era.color}`,
                      }}
                      title={`${era.name}: ${formatWorldYear(era.startYear, locale)}–${formatWorldYear(era.endYear, locale)}`}
                    >
                      <span className="truncate">{era.name}</span>
                    </div>
                  );
                })}
            </div>

            {lanes.map((lane) => (
              <div
                key={lane.name}
                className="relative border-b border-[var(--border)]"
                style={{ height: lane.height }}
              >
                <div className="absolute inset-y-0 left-0 z-10 flex w-[118px] items-start gap-2 border-r border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_88%,transparent)] px-3 pt-4 text-xs text-[var(--text-muted)]">
                  <span
                    className="mt-1 h-2 w-2 rounded-full"
                    style={{
                      background:
                        lane.name === "Relationships"
                          ? "#777780"
                          : TIMELINE_CATEGORY_COLORS[lane.name],
                    }}
                  />
                  {lane.name}
                </div>
                {ticks.map((tick) => (
                  <div
                    key={tick}
                    className="pointer-events-none absolute inset-y-0 border-l border-[var(--border)] opacity-60"
                    style={{ left: yearToX(tick) }}
                  />
                ))}
                {lane.items.map((item) => {
                  const left = yearToX(item.startYear);
                  const end =
                    item.endYear === null ? null : yearToX(item.endYear);
                  const rangeWidth =
                    end === null ? 0 : Math.max(12, end - left);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id);
                        setComposerOpen(false);
                        setEraComposerOpen(false);
                      }}
                      className={`absolute z-10 flex items-center overflow-hidden rounded-md border px-2 text-left text-[10px] shadow-sm transition hover:z-20 hover:brightness-105 ${item.importance >= 4 ? "font-semibold" : "font-medium"} ${selectedId === item.id ? "ring-2 ring-[var(--text)]/40" : ""}`}
                      style={{
                        left: end === null ? left - 5 : left,
                        top: 10 + item.track * 34,
                        width: end === null ? 126 : rangeWidth,
                        maxWidth: end === null ? 126 : undefined,
                        height: 23 + item.importance,
                        background: `color-mix(in srgb, ${item.color} 24%, var(--surface-solid))`,
                        borderColor: item.color,
                        borderStyle:
                          item.certainty === "canon" ? "solid" : "dashed",
                        opacity: item.certainty === "legendary" ? 0.72 : 1,
                        color: "var(--text)",
                      }}
                      title={`${item.title} · ${formatWorldYear(item.startYear, locale)}`}
                    >
                      <span className="truncate">{item.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}

            {!filteredItems.length ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <CalendarRange className="text-[var(--text-faint)]" size={28} />
                <p className="mt-4 text-sm font-semibold">
                  {t("timeline.unwritten")}
                </p>
                <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--text-muted)]">
                  {t("timeline.unwrittenHelp")}
                </p>
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="ws-button-primary mt-4 rounded-md px-4 py-2 text-xs"
                >
                  {t("timeline.recordFirst")}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] text-[var(--text-muted)] shadow-lg">
          <button
            type="button"
            onClick={fitTimeline}
            className="flex h-9 items-center gap-2 px-3 text-xs hover:bg-[var(--surface-muted)]"
          >
            <Maximize2 size={14} />
            {t("timeline.fit")}
          </button>
        </div>

        {composerOpen ? (
          <TimelineComposer
            entries={entries}
            createItem={createItem}
            close={() => setComposerOpen(false)}
            created={(id, year) => {
              setSelectedId(id);
              setComposerOpen(false);
              if (year < windowStart || year > windowEnd)
                updateViewport({ ...viewport, centerYear: year }, true);
            }}
          />
        ) : null}
        {eraComposerOpen ? (
          <EraComposer
            createEra={createEra}
            close={() => setEraComposerOpen(false)}
          />
        ) : null}
        {selected && !composerOpen && !eraComposerOpen ? (
          <TimelineDetails
            item={selected}
            relationships={relationships}
            deleteItem={deleteItem}
            close={() => setSelectedId(null)}
            openEntry={() =>
              selected.entryId && navigate(`/entries/${selected.entryId}`)
            }
            openGraph={() =>
              selected.focusEntryId &&
              navigate(`/graph?mode=local&focus=${selected.focusEntryId}`)
            }
          />
        ) : null}
      </section>
    </MotionPage>
  );
}

function TimelineControls({
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
}: {
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
}) {
  const { t } = useI18n();
  return (
    <aside className="absolute left-3 top-14 z-30 w-64 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_96%,transparent)] p-2 shadow-2xl backdrop-blur">
      <details open>
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
      <details open className="mt-2 border-t border-[var(--border)] pt-2">
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
                  className="text-[var(--text-faint)] opacity-0 hover:text-red-500 group-hover:opacity-100"
                  aria-label={t("timeline.deleteEra", { name: era.name })}
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

function TimelineComposer({
  entries,
  createItem,
  close,
  created,
}: {
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
}) {
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
    if (
      !entryId ||
      !Number.isFinite(start) ||
      (end !== null && !Number.isFinite(end))
    )
      return;
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
    <aside className="absolute bottom-3 right-3 top-3 z-40 w-80 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-faint)]">
            {t("timeline.eyebrow")}
          </p>
          <h3 className="mt-1 text-lg font-semibold">
            {t("timeline.recordHistoricalEvent")}
          </h3>
        </div>
        <button type="button" onClick={close}>
          <X size={16} />
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
        {t("timeline.composerHelp")}
      </p>
      <div className="mt-5 space-y-3">
        <label className="block text-[10px] text-[var(--text-faint)]">
          {t("common.entries")}
          <select
            value={entryId}
            onChange={(event) => setEntryId(event.target.value)}
            className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs"
          >
            {entries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title} · {t(`type.${entry.type}`)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[10px] text-[var(--text-faint)]">
            {t("timeline.startYear")}
            <input
              type="number"
              value={startYear}
              onChange={(event) => setStartYear(event.target.value)}
              className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs"
            />
          </label>
          <label className="block text-[10px] text-[var(--text-faint)]">
            {t("timeline.endYear")}
            <input
              type="number"
              value={endYear}
              onChange={(event) => setEndYear(event.target.value)}
              placeholder={t("timeline.point")}
              className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs"
            />
          </label>
        </div>
        <label className="block text-[10px] text-[var(--text-faint)]">
          {t("timeline.threads")}
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as TimelineCategory)
            }
            className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs"
            >
              {TIMELINE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`timeline.category.${value}`)}
              </option>
              ))}
            </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[10px] text-[var(--text-faint)]">
            {t("timeline.significance")}
            <select
              value={importance}
              onChange={(event) =>
                setImportance(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)
              }
              className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs"
            >
              <option value={1}>1 · {t("timeline.footnote")}</option>
              <option value={2}>2 · {t("timeline.minor")}</option>
              <option value={3}>3 · {t("timeline.notable")}</option>
              <option value={4}>4 · {t("timeline.major")}</option>
              <option value={5}>5 · {t("timeline.worldShaping")}</option>
            </select>
          </label>
          <label className="block text-[10px] text-[var(--text-faint)]">
            {t("timeline.status")}
            <select
              value={certainty}
              onChange={(event) =>
                setCertainty(event.target.value as TimelineCertainty)
              }
              className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs"
            >
              <option value="canon">{t("timeline.canon")}</option>
              <option value="rumored">{t("timeline.rumored")}</option>
              <option value="legendary">{t("timeline.legendary")}</option>
            </select>
          </label>
        </div>
        <label className="block text-[10px] text-[var(--text-faint)]">
          {t("timeline.note")}
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="ws-input mt-1 w-full rounded-md p-2 text-xs"
            placeholder={t("timeline.contextPlaceholder")}
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={!entryId || startYear === ""}
          className="ws-button-primary flex h-10 w-full items-center justify-center gap-2 rounded-md text-xs font-semibold disabled:opacity-40"
        >
          <Plus size={14} />
          {t("timeline.addToChronicle")}
        </button>
      </div>
    </aside>
  );
}

function EraComposer({
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
    if (!name.trim() || !Number.isFinite(start) || !Number.isFinite(end))
      return;
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
          <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-faint)]">
            {t("timeline.structure")}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{t("timeline.defineAnEra")}</h3>
        </div>
        <button type="button" onClick={close}>
          <X size={16} />
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
        {t("timeline.eraComposerHelp")}
      </p>
      <div className="mt-5 space-y-3">
        <label className="block text-[10px] text-[var(--text-faint)]">
          {t("timeline.eraNameLabel")}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("timeline.eraName")}
            className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[10px] text-[var(--text-faint)]">
            {t("timeline.begins")}
            <input
              type="number"
              value={startYear}
              onChange={(event) => setStartYear(event.target.value)}
              className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs"
            />
          </label>
          <label className="block text-[10px] text-[var(--text-faint)]">
            {t("timeline.ends")}
            <input
              type="number"
              value={endYear}
              onChange={(event) => setEndYear(event.target.value)}
              className="ws-input mt-1 h-10 w-full rounded-md px-2 text-xs"
            />
          </label>
        </div>
        <label className="flex items-center justify-between text-[10px] text-[var(--text-faint)]">
          {t("timeline.eraColor")}
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-8 w-12 rounded border-0 bg-transparent"
          />
        </label>
        <label className="block text-[10px] text-[var(--text-faint)]">
          {t("timeline.eraCharacter")}
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder={t("timeline.eraDescription")}
            className="ws-input mt-1 w-full rounded-md p-2 text-xs"
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="ws-button-primary flex h-10 w-full items-center justify-center gap-2 rounded-md text-xs font-semibold disabled:opacity-40"
        >
          <Plus size={14} />
          {t("timeline.establishEra")}
        </button>
      </div>
    </aside>
  );
}

function TimelineDetails({
  item,
  relationships,
  deleteItem,
  close,
  openEntry,
  openGraph,
}: {
  item: ResolvedTimelineItem;
  relationships: Array<{
    id: string;
    sourceEntryId: string;
    targetEntryId: string;
    type: string;
    inverseLabel: string;
  }>;
  deleteItem: (id: string) => void;
  close: () => void;
  openEntry: () => void;
  openGraph: () => void;
}) {
  const { locale, t } = useI18n();
  const related = item.focusEntryId
    ? relationships.filter(
        (relationship) =>
          relationship.sourceEntryId === item.focusEntryId ||
          relationship.targetEntryId === item.focusEntryId,
      )
    : [];
  return (
    <aside className="absolute bottom-3 right-3 top-3 z-40 w-80 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <span
          className="mt-1 h-3 w-3 rounded-full"
          style={{ background: item.color }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-faint)]">
            {item.source === "relationship"
              ? t("timeline.graphRelationship")
              : item.lane === "Relationships"
                ? t("timeline.relationships")
                : t(`timeline.category.${item.lane}`)}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
        </div>
        <button type="button" onClick={close}>
          <X size={16} />
        </button>
      </div>
      <p className="mt-4 text-sm font-semibold">
        {formatWorldYear(item.startYear, locale)}
        {item.endYear !== null ? ` — ${formatWorldYear(item.endYear, locale)}` : ""}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-md bg-[var(--surface-muted)] px-3 py-2">
          <span className="block text-[var(--text-faint)]">{t("timeline.significance")}</span>
          <b className="mt-1 block tracking-[.12em]">
            {"★".repeat(item.importance)}
            {"☆".repeat(5 - item.importance)}
          </b>
        </div>
        <div className="rounded-md bg-[var(--surface-muted)] px-3 py-2">
          <span className="block text-[var(--text-faint)]">
            {t("timeline.status")}
          </span>
          <b className="mt-1 block capitalize">{item.certainty}</b>
        </div>
      </div>
      {item.entryType ? (
        <p className="mt-2 text-[10px] text-[var(--text-faint)]">
          {t("timeline.canonicalSource", { type: item.entryType ? t(`type.${item.entryType}`) : "" })}
        </p>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
        {item.summary || t("timeline.noNote")}
      </p>
      {item.tags.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[10px]"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-5 grid grid-cols-2 gap-2">
        {item.entryId ? (
          <button
            type="button"
            onClick={openEntry}
            className="ws-button-secondary h-9 rounded-md text-xs"
          >
            {t("timeline.openEntry")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={openGraph}
          className="ws-button-secondary flex h-9 items-center justify-center gap-2 rounded-md text-xs"
        >
          <Focus size={13} />
          {t("timeline.localGraph")}
        </button>
      </div>
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-faint)]">
        {t("timeline.connectedKnowledge", { count: related.length })}
      </p>
      <div className="mt-2 space-y-1">
        {related.slice(0, 8).map((relationship) => (
          <div
            key={relationship.id}
            className="rounded-md bg-[var(--surface-muted)] px-3 py-2 text-xs"
          >
            {relationship.sourceEntryId === item.focusEntryId
              ? relationship.type
              : relationship.inverseLabel}
          </div>
        ))}
      </div>
      {item.source === "entry" ? (
        <button
          type="button"
          onClick={() => {
            deleteItem(item.id);
            close();
          }}
          className="mt-6 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-red-500/10 text-xs text-red-500"
        >
          <Trash2 size={13} />
          {t("timeline.removeFromChronicle")}
        </button>
      ) : (
        <p className="mt-6 text-[10px] leading-4 text-[var(--text-faint)]">
          {t("timeline.generatedRelationshipHelp")}
        </p>
      )}
    </aside>
  );
}
