import type { Entry, EntryType } from "../entries/types";
import type { EntryRelationship } from "../graph/types";
import type {
  TimelineCategory,
  TimelineCertainty,
  TimelineItem,
} from "./types";
import type { Locale } from "../../shared/i18n";

export const TIMELINE_TYPE_COLORS: Record<EntryType, string> = {
  Character: "#9b8ac4",
  Location: "#82a672",
  Organization: "#6f9eae",
  Item: "#c99a4b",
  Event: "#c67368",
};

export const TIMELINE_CATEGORIES: TimelineCategory[] = [
  "Politics & Power",
  "Conflict",
  "Culture & Faith",
  "Exploration",
  "Catastrophe",
  "Lives",
  "Other",
];

export const TIMELINE_CATEGORY_COLORS: Record<TimelineCategory, string> = {
  "Politics & Power": "#8e78a8",
  Conflict: "#b75b57",
  "Culture & Faith": "#b08a52",
  Exploration: "#668f98",
  Catastrophe: "#8f665d",
  Lives: "#78906a",
  Other: "#777780",
};

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
): ResolvedTimelineItem[] {
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const entryItems = items.flatMap<ResolvedTimelineItem>((item) => {
    const entry = entriesById.get(item.entryId);
    if (!entry) return [];
    return [
      {
        id: item.id,
        source: "entry",
        entryId: entry.id,
        relationshipId: null,
        focusEntryId: entry.id,
        title: entry.title,
        summary: item.description || entry.summary,
        tags: entry.tags,
        entryType: entry.type,
        lane: item.category ?? defaultCategory(entry.type),
        startYear: item.startYear,
        endYear: item.endYear,
        color:
          item.color ??
          TIMELINE_CATEGORY_COLORS[
            item.category ?? defaultCategory(entry.type)
          ],
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

export function formatWorldYear(year: number, locale: Locale = "en-US") {
  if (Math.abs(year) < 0.001) return "0";
  const absolute = Math.abs(year);
  const formatted = Number.isInteger(absolute)
    ? absolute.toLocaleString(locale)
    : absolute.toLocaleString(locale, { maximumFractionDigits: 2 });
  return year < 0
    ? locale === "zh-CN"
      ? `${formatted} BCE`
      : `${formatted} BCE`
    : formatted;
}
