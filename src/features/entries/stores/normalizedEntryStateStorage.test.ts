import { describe, expect, it } from "vitest";

import { normalizedEntryStateStorage } from "./normalizedEntryStateStorage";

describe("normalized entry state storage", () => {
  it("reconstructs entry arrays stored as individual records", async () => {
    const name = "normalized-entry-storage-test";
    const envelope = {
      state: {
        entries: [{ id: "entry-a", title: "A", type: "Character", summary: "", tags: [], createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
        revisions: [{ id: "revision-a", entryId: "entry-a", content: "<p>A</p>", createdAt: "2026-01-01" }],
      },
      version: 1,
    };
    await normalizedEntryStateStorage.setItem(name, JSON.stringify(envelope));
    const restored = JSON.parse((await normalizedEntryStateStorage.getItem(name)) ?? "null");
    expect(restored.state.entries).toHaveLength(1);
    expect(restored.state.revisions).toHaveLength(1);
    expect(restored.state.entries[0].title).toBe("A");
  });
});
