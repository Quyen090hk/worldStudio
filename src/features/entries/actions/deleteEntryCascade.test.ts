import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteEntry: vi.fn(),
  deleteRelationshipsForEntry: vi.fn(),
  deleteItemsForEntry: vi.fn(),
  removeEntryReferences: vi.fn(),
  removeEntryCards: vi.fn(),
}));

vi.mock("../stores/useEntryStore", () => ({
  useEntryStore: { getState: () => ({ deleteEntry: mocks.deleteEntry }) },
}));
vi.mock("../../graph/stores/useRelationshipStore", () => ({
  useRelationshipStore: {
    getState: () => ({
      deleteRelationshipsForEntry: mocks.deleteRelationshipsForEntry,
    }),
  },
}));
vi.mock("../../timeline/stores/useTimelineStore", () => ({
  useTimelineStore: {
    getState: () => ({ deleteItemsForEntry: mocks.deleteItemsForEntry }),
  },
}));
vi.mock("../../map/stores/useMapStore", () => ({
  useMapStore: {
    getState: () => ({ removeEntryReferences: mocks.removeEntryReferences }),
  },
}));
vi.mock("../../canvas/stores/useCanvasStore", () => ({
  useCanvasStore: {
    getState: () => ({ removeEntryCards: mocks.removeEntryCards }),
  },
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

    const relationshipOrder = mocks.deleteRelationshipsForEntry.mock.invocationCallOrder[0];
    const entryOrder = mocks.deleteEntry.mock.invocationCallOrder[0];
    expect(relationshipOrder).toBeLessThan(entryOrder);
  });
});
