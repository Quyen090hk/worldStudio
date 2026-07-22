import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { normalizedEntryStateStorage } from "./normalizedEntryStateStorage";
import type { Entry, EntryInput, EntryRevision } from "../types";

type EntryDrawerMode = "create" | "edit";

type EntryStore = {
  entries: Entry[];
  revisions: EntryRevision[];

  drawerOpen: boolean;
  drawerSession: number;
  drawerMode: EntryDrawerMode;
  editingEntryId: string | null;

  openCreateEntry: () => void;
  openEditEntry: (entryId: string) => void;
  closeDrawer: () => void;

  createEntry: (input: EntryInput) => void;
  importEntries: (inputs: EntryInput[]) => number;
  updateEntry: (entryId: string, input: EntryInput) => void;
  updateEntryContent: (entryId: string, content: string) => void;
  createRevision: (entryId: string, content: string) => void;
  restoreRevision: (entryId: string, revisionId: string) => void;
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
      // A new workspace starts empty. Example content belongs in an explicit
      // sample world, never in a user's first real workspace.
      entries: [],
      revisions: [],

      drawerOpen: false,
      drawerSession: 0,
      drawerMode: "create",
      editingEntryId: null,

      openCreateEntry: () => {
        set((state) => ({
          drawerOpen: true,
          drawerSession: state.drawerSession + 1,
          drawerMode: "create",
          editingEntryId: null,
        }));
      },

      openEditEntry: (entryId) => {
        set((state) => ({
          drawerOpen: true,
          drawerSession: state.drawerSession + 1,
          drawerMode: "edit",
          editingEntryId: entryId,
        }));
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

      importEntries: (inputs) => {
        const now = new Date().toISOString();
        const entries: Entry[] = inputs.map((input) => ({
          id: createId(),
          ...input,
          createdAt: now,
          updatedAt: now,
        }));
        const revisions: EntryRevision[] = entries
          .filter((entry) => entry.content)
          .map((entry) => ({
            id: createId(),
            entryId: entry.id,
            content: entry.content,
            createdAt: now,
          }));
        set((state) => ({
          entries: [...entries, ...state.entries],
          revisions: [...revisions, ...state.revisions],
          drawerOpen: false,
          editingEntryId: null,
        }));
        return entries.length;
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

      updateEntryContent: (entryId, content) => {
        const now = new Date().toISOString();

        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  content,
                  updatedAt: now,
                }
              : entry,
          ),
        }));
      },

      createRevision: (entryId, content) => {
        set((state) => {
          const latest = state.revisions.find((revision) => revision.entryId === entryId);
          if (latest?.content === content) return state;
          const revision: EntryRevision = {
            id: createId(),
            entryId,
            content,
            createdAt: new Date().toISOString(),
          };
          const older = state.revisions.filter((item) => item.entryId !== entryId);
          const own = state.revisions.filter((item) => item.entryId === entryId).slice(0, 19);
          return { revisions: [revision, ...own, ...older] };
        });
      },

      restoreRevision: (entryId, revisionId) => {
        set((state) => {
          const entry = state.entries.find((item) => item.id === entryId);
          const target = state.revisions.find(
            (revision) => revision.id === revisionId && revision.entryId === entryId,
          );
          if (!entry || !target || entry.content === target.content) return state;
          const now = new Date().toISOString();
          const current: EntryRevision = {
            id: createId(),
            entryId,
            content: entry.content,
            createdAt: now,
          };
          const older = state.revisions
            .filter((item) => item.entryId !== entryId || item.content !== entry.content)
            .filter((item) => item.entryId !== entryId);
          const own = state.revisions
            .filter((item) => item.entryId === entryId && item.content !== entry.content)
            .slice(0, 19);
          return {
            entries: state.entries.map((item) =>
              item.id === entryId ? { ...item, content: target.content, updatedAt: now } : item,
            ),
            revisions: [current, ...own, ...older],
          };
        });
      },

      deleteEntry: (entryId) => {
        set((state) => ({
          entries: state.entries
            .filter((entry) => entry.id !== entryId)
            .map((entry) => ({
              ...entry,
              properties: entry.properties?.map((property) =>
                property.type === "entryReference" && Array.isArray(property.value)
                  ? { ...property, value: property.value.filter((id) => id !== entryId) }
                  : property,
              ),
            })),
          revisions: state.revisions.filter((revision) => revision.entryId !== entryId),
          drawerOpen:
            state.editingEntryId === entryId ? false : state.drawerOpen,
          editingEntryId:
            state.editingEntryId === entryId ? null : state.editingEntryId,
        }));
      },
    }),
    {
      name: "world-studio.entries.v1",
      storage: createJSONStorage(() => normalizedEntryStateStorage),
      partialize: (state) => ({
        entries: state.entries,
        revisions: state.revisions,
      }),
    }
  )
);
