import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteEntry: vi.fn(),
  deleteRelationshipsForEntry: vi.fn(),
  deleteItemsForEntry: vi.fn(),
  removeEntryReferences: vi.fn(),
  removeEntryCards: vi.fn(),
  showUndo: vi.fn(),
  setState: vi.fn(),
}));

vi.mock("../stores/useEntryStore", () => ({
  useEntryStore: {
    getState: () => ({ entries: [{ id: "entry-1", title: "Test entry" }], deleteEntry: mocks.deleteEntry }),
    setState: mocks.setState,
  },
}));
vi.mock("../../graph/stores/useRelationshipStore", () => ({
  useRelationshipStore: {
    getState: () => ({
      relationships: [],
      deleteRelationshipsForEntry: mocks.deleteRelationshipsForEntry,
    }),
    setState: mocks.setState,
  },
}));
vi.mock("../../timeline/stores/useTimelineStore", () => ({
  useTimelineStore: {
    getState: () => ({ items: [], deleteItemsForEntry: mocks.deleteItemsForEntry }),
    setState: mocks.setState,
  },
}));
vi.mock("../../map/stores/useMapStore", () => ({
  useMapStore: {
    getState: () => ({ markers: [], removeEntryReferences: mocks.removeEntryReferences }),
    setState: mocks.setState,
  },
}));
vi.mock("../../canvas/stores/useCanvasStore", () => ({
  useCanvasStore: {
    getState: () => ({ cards: [], connections: [], removeEntryCards: mocks.removeEntryCards }),
    setState: mocks.setState,
  },
}));
vi.mock("../../../shared/undo/useUndoStore", () => ({
  useUndoStore: { getState: () => ({ show: mocks.showUndo }) },
}));

import { deleteEntryCascade } from "./deleteEntryCascade";

describe("deleteEntryCascade", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cleans every dependent store before deleting the entry", () => {
    deleteEntryCascade("entry-1");

    expect(mocks.deleteRelationshipsForEntry).toHaveBeenCalledWith("entry-1");
    expect(mocks.deleteItemsForEntry).toHaveBeenCalledWith("entry-1");
    expect(mocks.removeEntryReferences).toHaveBeenCalledWith("entry-1");
    expect(mocks.removeEntryCards).toHaveBeenCalledWith("entry-1");
    expect(mocks.deleteEntry).toHaveBeenCalledWith("entry-1");
    expect(mocks.showUndo).toHaveBeenCalledWith("Test entry", expect.any(Function));

    const relationshipOrder = mocks.deleteRelationshipsForEntry.mock.invocationCallOrder[0];
    const entryOrder = mocks.deleteEntry.mock.invocationCallOrder[0];
    expect(relationshipOrder).toBeLessThan(entryOrder);
  });
});
