import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { indexedDbStateStorage } from "../../../shared/storage/database";

import type { WorldProfile } from "../types";
import {
  createDefaultWorldProfile,
  normalizeWorldProfileInput,
  removeLegacyDefaultWorldDescription,
} from "../worldModel";

type WorldStore = {
  profile: WorldProfile;
  updateProfile: (name: string, description: string) => void;
  updateMemo: (memo: string) => void;
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
      updateMemo: (memo) => set((state) => ({
        profile: {
          ...state.profile,
          memo,
          updatedAt: new Date().toISOString(),
        },
      })),
    }),
    {
      name: "world-studio.profile.v1",
      storage: createJSONStorage(() => indexedDbStateStorage),
      version: 2,
      partialize: (state) => ({ profile: state.profile }),
      migrate: (persisted) => {
        const state = persisted as Pick<WorldStore, "profile">;
        return {
          ...state,
          profile: {
            ...state.profile,
            description: removeLegacyDefaultWorldDescription(
              state.profile?.description ?? "",
            ),
          },
        };
      },
    },
  ),
);
