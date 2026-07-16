import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { indexedDbStateStorage } from "../../../shared/storage/database";
import type {
  TimelineCategory,
  TimelineEra,
  TimelineEraInput,
  TimelineItem,
  TimelineItemInput,
  TimelineViewport,
} from "../types";
import { TIMELINE_CATEGORIES } from "../timelineModel";

type TimelineStore = {
  items: TimelineItem[];
  eras: TimelineEra[];
  viewport: TimelineViewport;
  createItem: (input: TimelineItemInput) => string;
  updateItem: (id: string, patch: Partial<TimelineItemInput>) => void;
  deleteItem: (id: string) => void;
  deleteItemsForEntry: (entryId: string) => void;
  createEra: (input: TimelineEraInput) => string;
  updateEra: (id: string, patch: Partial<TimelineEraInput>) => void;
  deleteEra: (id: string) => void;
  setViewport: (viewport: TimelineViewport) => void;
};

function createId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `timeline-${crypto.randomUUID()}`
    : `timeline-${Date.now()}`;
}

const LEGACY_TIMELINE_CATEGORIES: Record<string, TimelineCategory> = {
  政治与权力: "Politics & Power",
  冲突: "Conflict",
  文化与信仰: "Culture & Faith",
  探索: "Exploration",
  灾变: "Catastrophe",
  人生: "Lives",
  其他: "Other",
};

function normalizeTimelineCategory(value: unknown) {
  if (value === undefined) return undefined;
  if (
    typeof value === "string" &&
    TIMELINE_CATEGORIES.includes(value as TimelineCategory)
  )
    return value as TimelineCategory;

  return typeof value === "string"
    ? (LEGACY_TIMELINE_CATEGORIES[value] ?? "Other")
    : "Other";
}

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set) => ({
      items: [],
      eras: [],
      viewport: { centerYear: 0, yearsPerScreen: 500 },
      createItem: (input) => {
        const id = createId();
        set((state) => ({ items: [...state.items, { ...input, id }] }));
        return id;
      },
      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        })),
      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      deleteItemsForEntry: (entryId) =>
        set((state) => ({
          items: state.items.filter((item) => item.entryId !== entryId),
        })),
      createEra: (input) => {
        const id = createId().replace("timeline-", "era-");
        set((state) => ({ eras: [...state.eras, { ...input, id }] }));
        return id;
      },
      updateEra: (id, patch) =>
        set((state) => ({
          eras: state.eras.map((era) =>
            era.id === id ? { ...era, ...patch } : era,
          ),
        })),
      deleteEra: (id) =>
        set((state) => ({
          eras: state.eras.filter((era) => era.id !== id),
        })),
      setViewport: (viewport) => set({ viewport }),
    }),
    {
      name: "world-studio.timeline.v1",
      storage: createJSONStorage(() => indexedDbStateStorage),
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<TimelineStore>;
        return {
          ...state,
          items: (state.items ?? []).map((item) => ({
            ...item,
            category: normalizeTimelineCategory(item.category),
          })),
        } as TimelineStore;
      },
    },
  ),
);
