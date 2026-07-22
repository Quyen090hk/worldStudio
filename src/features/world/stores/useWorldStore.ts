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
  addDailyTask: (dateKey: string, text: string) => void;
  toggleDailyTask: (dateKey: string, taskId: string) => void;
  deleteDailyTask: (dateKey: string, taskId: string) => void;
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
      addDailyTask: (dateKey, text) => {
        const normalized = text.trim();
        if (!normalized) return;
        set((state) => {
          const tasks = state.profile.dailyTasks?.[dateKey] ?? [];
          const now = new Date().toISOString();
          return {
            profile: {
              ...state.profile,
              dailyTasks: {
                ...state.profile.dailyTasks,
                [dateKey]: [
                  ...tasks,
                  {
                    id: crypto.randomUUID(),
                    text: normalized.slice(0, 160),
                    completed: false,
                    createdAt: now,
                  },
                ],
              },
              updatedAt: now,
            },
          };
        });
      },
      toggleDailyTask: (dateKey, taskId) => set((state) => ({
        profile: {
          ...state.profile,
          dailyTasks: {
            ...state.profile.dailyTasks,
            [dateKey]: (state.profile.dailyTasks?.[dateKey] ?? []).map((task) =>
              task.id === taskId ? { ...task, completed: !task.completed } : task,
            ),
          },
          updatedAt: new Date().toISOString(),
        },
      })),
      deleteDailyTask: (dateKey, taskId) => set((state) => ({
        profile: {
          ...state.profile,
          dailyTasks: {
            ...state.profile.dailyTasks,
            [dateKey]: (state.profile.dailyTasks?.[dateKey] ?? []).filter(
              (task) => task.id !== taskId,
            ),
          },
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
