import type { Entry, EntryType } from "../entries/types";
import type { EntryRelationship } from "../graph/types";
import type {
  TimelineCategory,
  TimelineCertainty,
  TimelineItem,
  TimelineLane,
  WorldYearFormat,
} from "./types";
import type { Locale } from "../../shared/i18n";

export const TIMELINE_TYPE_COLORS: Record<EntryType, string> = {
  Character: "#9b8ac4",
  Location: "#82a672",
  Organization: "#6f9eae",
  Item: "#c99a4b",
  Event: "#c67368",
};

export const DEFAULT_TIMELINE_LANES: TimelineLane[] = [
  { id: "Politics & Power", name: "Politics & Power", color: "#8e78a8" },
  { id: "Conflict", name: "Conflict", color: "#b75b57" },
  { id: "Culture & Faith", name: "Culture & Faith", color: "#b08a52" },
  { id: "Exploration", name: "Exploration", color: "#668f98" },
  { id: "Catastrophe", name: "Catastrophe", color: "#8f665d" },
  { id: "Lives", name: "Lives", color: "#78906a" },
  { id: "Other", name: "Other", color: "#777780" },
];

export const DEFAULT_WORLD_YEAR_FORMAT: WorldYearFormat = {
  beforeSuffix: "BCE",
  afterSuffix: "",
  zeroLabel: "0",
};

export function isDefaultTimelineLane(lane: Pick<TimelineLane, "id" | "name">) {
  return lane.id === lane.name && DEFAULT_TIMELINE_LANES.some((item) => item.id === lane.id);
}

export const TIMELINE_CATEGORIES = DEFAULT_TIMELINE_LANES.map((lane) => lane.id);
export const TIMELINE_CATEGORY_COLORS = Object.fromEntries(
  DEFAULT_TIMELINE_LANES.map((lane) => [lane.id, lane.color]),
) as Record<string, string>;

function defaultCategory(type: EntryType): TimelineCategory {
  if (type === "Character") return "Lives";
  if (type === "Location") return "Exploration";
  if (type === "Organization") return "Politics & Power";
  return "Other";
}

export type ResolvedTimelineItem = {
  id: string;
  source: "entry" | "relationship";
  entryId: string | null;
  relationshipId: string | null;
  focusEntryId: string | null;
  title: string;
  summary: string;
  tags: string[];
  entryType: EntryType | null;
  lane: TimelineCategory | "Relationships";
  startYear: number;
  endYear: number | null;
  color: string;
  importance: 1 | 2 | 3 | 4 | 5;
  certainty: TimelineCertainty;
};

export function resolveTimelineItems(
  items: TimelineItem[],
  entries: Entry[],
  relationships: EntryRelationship[],
  lanes: TimelineLane[] = DEFAULT_TIMELINE_LANES,
): ResolvedTimelineItem[] {
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const laneColors = new Map(lanes.map((lane) => [lane.id, lane.color]));
  const entryItems = items.flatMap<ResolvedTimelineItem>((item) => {
    const entry = item.entryId ? entriesById.get(item.entryId) : undefined;
    if (item.entryId && !entry) return [];
    const category = item.category ?? (entry ? defaultCategory(entry.type) : "Other");
    return [
      {
        id: item.id,
        source: "entry",
        entryId: entry?.id ?? null,
        relationshipId: null,
        focusEntryId: entry?.id ?? null,
        title: item.title.trim() || entry?.title || "Untitled event",
        summary: item.description || entry?.summary || "",
        tags: entry?.tags ?? [],
        entryType: entry?.type ?? null,
        lane: category,
        startYear: item.startYear,
        endYear: item.endYear,
        color:
          item.color ??
          laneColors.get(category) ?? TIMELINE_CATEGORY_COLORS.Other,
        importance: item.importance ?? 3,
        certainty: item.certainty ?? "canon",
      },
    ];
  });

  const relationshipItems = relationships.flatMap<ResolvedTimelineItem>(
    (relationship) => {
      if (relationship.startYear === null && relationship.endYear === null)
        return [];
      const source = entriesById.get(relationship.sourceEntryId);
      const target = entriesById.get(relationship.targetEntryId);
      if (!source || !target) return [];
      const startYear = relationship.startYear ?? relationship.endYear!;
      const endYear =
        relationship.startYear === null ? null : relationship.endYear;
      return [
        {
          id: `relationship-${relationship.id}`,
          source: "relationship",
          entryId: null,
          relationshipId: relationship.id,
          focusEntryId: source.id,
          title: `${source.title} · ${relationship.type} · ${target.title}`,
          summary: relationship.description,
          tags: relationship.tags,
          entryType: null,
          lane: "Relationships",
          startYear,
          endYear,
          color: relationship.status === "secret" ? "#9f7ab6" : "#777780",
          importance: 3,
          certainty:
            relationship.status === "rumored" ||
            relationship.status === "secret"
              ? "rumored"
              : "canon",
        },
      ];
    },
  );

  return [...entryItems, ...relationshipItems];
}

export function niceYearStep(yearsPerScreen: number) {
  const rough = yearsPerScreen / 8;
  const power = 10 ** Math.floor(Math.log10(Math.max(rough, 0.0001)));
  const normalized = rough / power;
  const multiple =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiple * power;
}

export function formatWorldYear(
  year: number,
  locale: Locale = "en-US",
  format: WorldYearFormat = DEFAULT_WORLD_YEAR_FORMAT,
) {
  if (Math.abs(year) < 0.001) return format.zeroLabel || "0";
  const absolute = Math.abs(year);
  const formatted = Number.isInteger(absolute)
    ? absolute.toLocaleString(locale)
    : absolute.toLocaleString(locale, { maximumFractionDigits: 2 });
  const suffix = year < 0 ? format.beforeSuffix.trim() : format.afterSuffix.trim();
  return suffix ? `${formatted} ${suffix}` : formatted;
}
