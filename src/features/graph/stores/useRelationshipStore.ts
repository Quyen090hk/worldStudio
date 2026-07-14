import { create } from "zustand";
import { persist } from "zustand/middleware";
import { inverseFor, normalizeRelationshipType } from "../relationshipMeta";
import type { EntryRelationship, RelationshipInput } from "../types";

type RelationshipStore = {
  relationships: EntryRelationship[];
  createRelationship: (input: RelationshipInput) => string;
  updateRelationship: (id: string, patch: Partial<RelationshipInput>) => void;
  deleteRelationship: (id: string) => void;
  deleteRelationshipsForEntry: (entryId: string) => void;
};

const seedRelationships: EntryRelationship[] = [
  {
    id: "rel-elarion-kethvari",
    sourceEntryId: "entry-1",
    targetEntryId: "entry-2",
    type: "Travels to",
    inverseLabel: "Visited by",
    direction: "directed",
    strength: 65,
    status: "current",
    startYear: null,
    endYear: null,
    description:
      "Elarion repeatedly returns to chart the shifting north ridge.",
    tags: ["journey"],
  },
  {
    id: "rel-elarion-concord",
    sourceEntryId: "entry-1",
    targetEntryId: "entry-3",
    type: "Allied with",
    inverseLabel: "Allied with",
    direction: "mutual",
    strength: 40,
    status: "secret",
    startYear: null,
    endYear: null,
    description: "An uneasy exchange of maps for forbidden records.",
    tags: ["politics", "secret"],
  },
  {
    id: "rel-elarion-compass",
    sourceEntryId: "entry-1",
    targetEntryId: "entry-4",
    type: "Possesses",
    inverseLabel: "Possessed by",
    direction: "directed",
    strength: null,
    status: "current",
    startYear: null,
    endYear: null,
    description: "The compass guides Elarion toward unresolved memories.",
    tags: ["relic"],
  },
];

function createId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `relationship-${crypto.randomUUID()}`
    : `relationship-${Date.now()}`;
}

export const useRelationshipStore = create<RelationshipStore>()(
  persist(
    (set) => ({
      relationships: seedRelationships,
      createRelationship: (input) => {
        const id = createId();
        set((state) => ({
          relationships: [...state.relationships, { ...input, id }],
        }));
        return id;
      },
      updateRelationship: (id, patch) =>
        set((state) => ({
          relationships: state.relationships.map((relationship) =>
            relationship.id === id
              ? { ...relationship, ...patch }
              : relationship,
          ),
        })),
      deleteRelationship: (id) =>
        set((state) => ({
          relationships: state.relationships.filter(
            (relationship) => relationship.id !== id,
          ),
        })),
      deleteRelationshipsForEntry: (entryId) =>
        set((state) => ({
          relationships: state.relationships.filter(
            (relationship) =>
              relationship.sourceEntryId !== entryId &&
              relationship.targetEntryId !== entryId,
          ),
        })),
    }),
    {
      name: "world-studio.relationships.v1",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<RelationshipStore>;
        return {
          ...state,
          relationships: (state.relationships ?? []).map((relationship) => {
            const type = normalizeRelationshipType(relationship.type);
            return {
              ...relationship,
              type,
              inverseLabel: inverseFor(type),
            };
          }),
        } as RelationshipStore;
      },
    },
  ),
);
