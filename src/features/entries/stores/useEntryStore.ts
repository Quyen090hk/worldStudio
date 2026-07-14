import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedEntries } from "../data/seedEntries";
import type { Entry, EntryInput } from "../types";

type EntryDrawerMode = "create" | "edit";

type EntryStore = {
  entries: Entry[];

  drawerOpen: boolean;
  drawerMode: EntryDrawerMode;
  editingEntryId: string | null;

  openCreateEntry: () => void;
  openEditEntry: (entryId: string) => void;
  closeDrawer: () => void;

  createEntry: (input: EntryInput) => void;
  updateEntry: (entryId: string, input: EntryInput) => void;
  deleteEntry: (entryId: string) => void;
};

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useEntryStore = create<EntryStore>()(
  persist(
    (set) => ({
      entries: seedEntries,

      drawerOpen: false,
      drawerMode: "create",
      editingEntryId: null,

      openCreateEntry: () => {
        set({
          drawerOpen: true,
          drawerMode: "create",
          editingEntryId: null,
        });
      },

      openEditEntry: (entryId) => {
        set({
          drawerOpen: true,
          drawerMode: "edit",
          editingEntryId: entryId,
        });
      },

      closeDrawer: () => {
        set({
          drawerOpen: false,
          editingEntryId: null,
        });
      },

      createEntry: (input) => {
        const now = new Date().toISOString();

        const entry: Entry = {
          id: createId(),
          ...input,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          entries: [entry, ...state.entries],
          drawerOpen: false,
          editingEntryId: null,
        }));
      },

      updateEntry: (entryId, input) => {
        const now = new Date().toISOString();

        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  ...input,
                  updatedAt: now,
                }
              : entry
          ),
          drawerOpen: false,
          editingEntryId: null,
        }));
      },

      deleteEntry: (entryId) => {
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== entryId),
          drawerOpen:
            state.editingEntryId === entryId ? false : state.drawerOpen,
          editingEntryId:
            state.editingEntryId === entryId ? null : state.editingEntryId,
        }));
      },
    }),
    {
      name: "world-studio.entries.v1",
      partialize: (state) => ({
        entries: state.entries,
      }),
    }
  )
);
