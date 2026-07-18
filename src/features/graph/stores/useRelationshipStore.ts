import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { indexedDbStateStorage } from "../../../shared/storage/database";
import { inverseFor, normalizeRelationshipType } from "../relationshipMeta";
import type { EntryRelationship, RelationshipInput } from "../types";

type RelationshipStore = {
  relationships: EntryRelationship[];
  createRelationship: (input: RelationshipInput) => string;
  updateRelationship: (id: string, patch: Partial<RelationshipInput>) => void;
  deleteRelationship: (id: string) => void;
  deleteRelationshipsForEntry: (entryId: string) => void;
};

function createId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `relationship-${crypto.randomUUID()}`
    : `relationship-${Date.now()}`;
}

export const useRelationshipStore = create<RelationshipStore>()(
  persist(
    (set) => ({
      relationships: [],
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
      storage: createJSONStorage(() => indexedDbStateStorage),
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
