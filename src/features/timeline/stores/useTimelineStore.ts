import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  TimelineEra,
  TimelineEraInput,
  TimelineItem,
  TimelineItemInput,
  TimelineViewport,
} from "../types";

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
    { name: "world-studio.timeline.v1" },
  ),
);
