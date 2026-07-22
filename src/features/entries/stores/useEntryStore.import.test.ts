import { beforeEach, describe, expect, it } from "vitest";

import { useEntryStore } from "./useEntryStore";

describe("entry batch import", () => {
  beforeEach(() => useEntryStore.setState({ entries: [], revisions: [] }));

  it("creates entries and initial revisions in one state update", () => {
    const count = useEntryStore.getState().importEntries([{ title: "White Tower", type: "Location", summary: "Coastal watchtower", content: "<p>Built above the sea.</p>", tags: ["coast"] }]);
    const state = useEntryStore.getState();
    expect(count).toBe(1);
    expect(state.entries).toHaveLength(1);
    expect(state.revisions).toHaveLength(1);
    expect(state.revisions[0].entryId).toBe(state.entries[0].id);
    expect(state.revisions[0].content).toBe(state.entries[0].content);
  });
});
