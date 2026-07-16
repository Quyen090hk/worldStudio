import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { indexedDbStateStorage } from "../../../shared/storage/database";
import { ENTRY_TYPES, type GraphGroup } from "../graphModel";
import type { EntryType } from "../../entries/types";

export type GraphSettings = {
  visibleTypes: EntryType[];
  showSecrets: boolean;
  showOrphans: boolean;
  nodeRepulsion: number;
  linkDistance: number;
  linkElasticity: number;
  centerGravity: number;
  animationDuration: number;
  groups: GraphGroup[];
};

const defaults: GraphSettings = {
  visibleTypes: ENTRY_TYPES,
  showSecrets: true,
  showOrphans: true,
  nodeRepulsion: 9_000,
  linkDistance: 92,
  linkElasticity: 0.9,
  centerGravity: 0.18,
  animationDuration: 500,
  groups: [],
};

export type GraphSettingsStore = GraphSettings & {
  patch: (patch: Partial<GraphSettings>) => void;
  reset: () => void;
  toggleType: (type: EntryType) => void;
  addGroup: () => void;
  updateGroup: (id: string, patch: Partial<GraphGroup>) => void;
  removeGroup: (id: string) => void;
};

function createGroupId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `graph-group-${crypto.randomUUID()}`
    : `graph-group-${Date.now()}`;
}

export const useGraphSettingsStore = create<GraphSettingsStore>()(
  persist(
    (set) => ({
      ...defaults,
      patch: (patch) => set(patch),
      reset: () => set(defaults),
      toggleType: (type) =>
        set((state) => ({
          visibleTypes: state.visibleTypes.includes(type)
            ? state.visibleTypes.filter((candidate) => candidate !== type)
            : [...state.visibleTypes, type],
        })),
      addGroup: () =>
        set((state) => ({
          groups: [
            ...state.groups,
            { id: createGroupId(), query: "", color: "#8b7ec8" },
          ],
        })),
      updateGroup: (id, patch) =>
        set((state) => ({
          groups: state.groups.map((group) =>
            group.id === id ? { ...group, ...patch } : group,
          ),
        })),
      removeGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((group) => group.id !== id),
        })),
    }),
    {
      name: "world-studio.graph-settings.v2",
      storage: createJSONStorage(() => indexedDbStateStorage),
      partialize: (state) => ({
        visibleTypes: state.visibleTypes,
        showSecrets: state.showSecrets,
        showOrphans: state.showOrphans,
        nodeRepulsion: state.nodeRepulsion,
        linkDistance: state.linkDistance,
        linkElasticity: state.linkElasticity,
        centerGravity: state.centerGravity,
        animationDuration: state.animationDuration,
        groups: state.groups,
      }),
    },
  ),
);
