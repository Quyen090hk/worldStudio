import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { indexedDbStateStorage } from "../../../shared/storage/database";

export type WorldRecord = { id: string; name: string; description: string; createdAt: string; updatedAt: string; archived?: boolean };
type WorldRegistryStore = {
  activeWorldId: string;
  worlds: WorldRecord[];
  setActive: (id: string) => void;
  upsert: (world: WorldRecord) => void;
  remove: (id: string) => void;
  replace: (worlds: WorldRecord[], activeWorldId: string) => void;
};

export const useWorldRegistryStore = create<WorldRegistryStore>()(
  persist(
    (set) => ({
      activeWorldId: "",
      worlds: [],
      setActive: (activeWorldId) => set({ activeWorldId }),
      upsert: (world) => set((state) => ({ worlds: state.worlds.some((item) => item.id === world.id) ? state.worlds.map((item) => item.id === world.id ? world : item) : [...state.worlds, world] })),
      remove: (id) => set((state) => ({ worlds: state.worlds.filter((item) => item.id !== id) })),
      replace: (worlds, activeWorldId) => set({ worlds, activeWorldId }),
    }),
    {
      name: "world-studio.world-registry.v1",
      storage: createJSONStorage(() => indexedDbStateStorage),
      version: 3,
    },
  ),
);
