import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { WorldProfile } from "../types";
import {
  createDefaultWorldProfile,
  normalizeWorldProfileInput,
} from "../worldModel";

type WorldStore = {
  profile: WorldProfile;
  updateProfile: (name: string, description: string) => void;
};

export const useWorldStore = create<WorldStore>()(
  persist(
    (set) => ({
      profile: createDefaultWorldProfile(),
      updateProfile: (name, description) => {
        const normalized = normalizeWorldProfileInput(name, description);
        if (!normalized.name) return;
        set((state) => ({
          profile: {
            ...state.profile,
            ...normalized,
            updatedAt: new Date().toISOString(),
          },
        }));
      },
    }),
    {
      name: "world-studio.profile.v1",
      partialize: (state) => ({ profile: state.profile }),
    },
  ),
);
