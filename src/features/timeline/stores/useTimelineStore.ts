import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { indexedDbStateStorage } from "../../../shared/storage/database";
import type {
  TimelineEra,
  TimelineEraInput,
  TimelineItem,
  TimelineItemInput,
  TimelineLane,
  TimelineViewport,
  WorldYearFormat,
} from "../types";
import { DEFAULT_TIMELINE_LANES, DEFAULT_WORLD_YEAR_FORMAT } from "../timelineModel";

type TimelineStore = {
  items: TimelineItem[];
  eras: TimelineEra[];
  lanes: TimelineLane[];
  yearFormat: WorldYearFormat;
  viewport: TimelineViewport;
  createItem: (input: TimelineItemInput) => string;
  updateItem: (id: string, patch: Partial<TimelineItemInput>) => void;
  deleteItem: (id: string) => void;
  deleteItemsForEntry: (entryId: string) => void;
  createEra: (input: TimelineEraInput) => string;
  updateEra: (id: string, patch: Partial<TimelineEraInput>) => void;
  deleteEra: (id: string) => void;
  createLane: (name: string, color: string) => string;
  updateLane: (id: string, patch: Partial<Pick<TimelineLane, "name" | "color">>) => void;
  deleteLane: (id: string) => void;
  moveLane: (id: string, direction: -1 | 1) => void;
  setYearFormat: (format: WorldYearFormat) => void;
  setViewport: (viewport: TimelineViewport) => void;
};

function createId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `timeline-${crypto.randomUUID()}`
    : `timeline-${Date.now()}`;
}

export const useTimelineStore = create<TimelineStore>()(
  persist(
    (set) => ({
      items: [],
      eras: [],
      lanes: DEFAULT_TIMELINE_LANES.map((lane) => ({ ...lane })),
      yearFormat: { ...DEFAULT_WORLD_YEAR_FORMAT },
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
      createLane: (name, color) => {
        const id = `lane-${crypto.randomUUID?.() ?? Date.now()}`;
        set((state) => ({ lanes: [...state.lanes, { id, name: name.trim(), color }] }));
        return id;
      },
      updateLane: (id, patch) => set((state) => ({
        lanes: state.lanes.map((lane) => lane.id === id ? { ...lane, ...patch, name: patch.name?.trim() || lane.name } : lane),
      })),
      deleteLane: (id) => set((state) => {
        if (state.lanes.length <= 1) return state;
        const fallback = state.lanes.find((lane) => lane.id !== id)!;
        return {
          lanes: state.lanes.filter((lane) => lane.id !== id),
          items: state.items.map((item) => item.category === id ? { ...item, category: fallback.id } : item),
        };
      }),
      moveLane: (id, direction) => set((state) => {
        const index = state.lanes.findIndex((lane) => lane.id === id);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= state.lanes.length) return state;
        const lanes = [...state.lanes];
        [lanes[index], lanes[target]] = [lanes[target], lanes[index]];
        return { lanes };
      }),
      setYearFormat: (yearFormat) => set({ yearFormat }),
      setViewport: (viewport) => set({ viewport }),
    }),
    {
      name: "world-studio.timeline.v1",
      storage: createJSONStorage(() => indexedDbStateStorage),
      version: 3,
    },
  ),
);
