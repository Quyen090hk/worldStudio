import type { ElementDefinition } from "cytoscape";
import type { Entry, EntryType } from "../entries/types";
import type { EntryRelationship } from "./types";

export const ENTRY_TYPES: EntryType[] = [
  "Character",
  "Location",
  "Organization",
  "Item",
  "Event",
];

export const TYPE_COLORS: Record<EntryType, string> = {
  Character: "#9b8ac4",
  Location: "#82a672",
  Organization: "#6f9eae",
  Item: "#c99a4b",
  Event: "#c67368",
};

export type GraphGroup = {
  id: string;
  query: string;
  color: string;
};

export type GraphProjectionOptions = {
  mode: "global" | "local";
  focusId: string | null;
  depth: number;
  query: string;
  visibleTypes: EntryType[];
  showSecrets: boolean;
  showOrphans: boolean;
  year: number | null;
  groups: GraphGroup[];
};

export type GraphProjection = {
  entries: Entry[];
  relationships: EntryRelationship[];
  elements: ElementDefinition[];
};

/** Returns all notes reachable within `depth` undirected link hops. */
export function collectLocalIds(
  focusId: string,
  depth: number,
  relationships: EntryRelationship[],
) {
  const found = new Set([focusId]);
  let frontier = new Set([focusId]);

  for (let level = 0; level < depth; level += 1) {
    const next = new Set<string>();
    for (const relationship of relationships) {
      if (frontier.has(relationship.sourceEntryId))
        next.add(relationship.targetEntryId);
      if (frontier.has(relationship.targetEntryId))
        next.add(relationship.sourceEntryId);
    }
    next.forEach((id) => found.add(id));
    frontier = next;
  }

  return found;
}

/**
 * A deliberately small, predictable subset of Obsidian-style graph search.
 * Supports plain text, quoted phrases, negation, OR, and file/type/tag fields.
 */
export function matchesGraphQuery(entry: Entry, query: string) {
  const normalized = query.trim();
  if (!normalized) return true;

  const clauses = normalized.split(/\s+OR\s+/i);
  return clauses.some((clause) => {
    const tokens =
      clause.match(/-?(?:file|type|tag):(?:"[^"]*"|\S+)|-?"[^"]*"|-?\S+/gi) ??
      [];
    return tokens.every((rawToken) => {
      const negated = rawToken.startsWith("-");
      const token = (negated ? rawToken.slice(1) : rawToken).replace(
        /^"|"$/g,
        "",
      );
      const separator = token.indexOf(":");
      const field =
        separator === -1 ? "" : token.slice(0, separator).toLowerCase();
      const value = (separator === -1 ? token : token.slice(separator + 1))
        .replace(/^"|"$/g, "")
        .toLowerCase();

      let match: boolean;
      if (field === "file") match = entry.title.toLowerCase().includes(value);
      else if (field === "type")
        match = entry.type.toLowerCase().includes(value);
      else if (field === "tag")
        match = entry.tags.some((tag) =>
          tag.toLowerCase().includes(value.replace(/^#/, "")),
        );
      else {
        match = `${entry.title} ${entry.summary} ${entry.tags.join(" ")}`
          .toLowerCase()
          .includes(value);
      }
      return negated ? !match : match;
    });
  });
}

function relationshipColor(relationship: EntryRelationship) {
  if (relationship.status === "secret") return "#9f7ab6";
  if (relationship.status === "rumored") return "#777780";
  if (relationship.type === "At war with" || relationship.type === "Rivals")
    return "#b75b57";
  return "#787880";
}

export function projectGraph(
  entries: Entry[],
  relationships: EntryRelationship[],
  options: GraphProjectionOptions,
): GraphProjection {
  const activeRelationships = relationships
    .filter(
      (relationship) => options.showSecrets || relationship.status !== "secret",
    )
    .filter(
      (relationship) =>
        options.year === null ||
        ((relationship.startYear === null ||
          relationship.startYear <= options.year) &&
          (relationship.endYear === null ||
            relationship.endYear >= options.year)),
    );

  const localIds =
    options.mode === "local" && options.focusId
      ? collectLocalIds(options.focusId, options.depth, activeRelationships)
      : null;

  let projectedEntries = entries.filter(
    (entry) =>
      options.visibleTypes.includes(entry.type) &&
      matchesGraphQuery(entry, options.query) &&
      (!localIds || localIds.has(entry.id)),
  );

  let ids = new Set(projectedEntries.map((entry) => entry.id));
  let projectedRelationships = activeRelationships.filter(
    (relationship) =>
      ids.has(relationship.sourceEntryId) &&
      ids.has(relationship.targetEntryId),
  );

  if (!options.showOrphans) {
    const linkedIds = new Set(
      projectedRelationships.flatMap((relationship) => [
        relationship.sourceEntryId,
        relationship.targetEntryId,
      ]),
    );
    projectedEntries = projectedEntries.filter((entry) =>
      linkedIds.has(entry.id),
    );
    ids = new Set(projectedEntries.map((entry) => entry.id));
    projectedRelationships = projectedRelationships.filter(
      (relationship) =>
        ids.has(relationship.sourceEntryId) &&
        ids.has(relationship.targetEntryId),
    );
  }

  // Obsidian scales notes by the number of references pointing to them.
  const inboundReferences = new Map<string, number>();
  for (const relationship of projectedRelationships) {
    inboundReferences.set(
      relationship.targetEntryId,
      (inboundReferences.get(relationship.targetEntryId) ?? 0) + 1,
    );
    if (relationship.direction === "mutual") {
      inboundReferences.set(
        relationship.sourceEntryId,
        (inboundReferences.get(relationship.sourceEntryId) ?? 0) + 1,
      );
    }
  }

  const elements: ElementDefinition[] = [
    ...projectedEntries.map((entry) => {
      const group = options.groups.find(
        (candidate) =>
          candidate.query.trim() && matchesGraphQuery(entry, candidate.query),
      );
      const references = inboundReferences.get(entry.id) ?? 0;
      return {
        data: {
          id: entry.id,
          label: entry.title,
          labelOpacity: 1,
          color: group?.color ?? TYPE_COLORS[entry.type],
          size: Math.min(15, 7 + references * 1.6),
          entryType: entry.type,
        },
        classes:
          entry.id === options.focusId && options.mode === "local"
            ? "focus"
            : "",
      };
    }),
    ...projectedRelationships.map((relationship) => ({
      data: {
        id: relationship.id,
        source: relationship.sourceEntryId,
        target: relationship.targetEntryId,
        label: relationship.type,
        color: relationshipColor(relationship),
        width: relationship.strength
          ? Math.max(0.7, Math.abs(relationship.strength) / 60)
          : 0.8,
      },
      classes: [
        relationship.direction === "directed" ? "directed" : "",
        relationship.status === "rumored" || relationship.status === "secret"
          ? "dashed"
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    })),
  ];

  return {
    entries: projectedEntries,
    relationships: projectedRelationships,
    elements,
  };
}
