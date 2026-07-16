import { afterEach, describe, expect, it } from "vitest";
import type { Entry } from "../types";
import { useEntryStore } from "./useEntryStore";

const entry: Entry = {
  id: "revision-entry",
  title: "Revision Entry",
  type: "Character",
  summary: "",
  content: "<p>Current</p>",
  tags: [],
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
};

afterEach(() => {
  useEntryStore.setState({ entries: [], revisions: [] });
});

describe("entry revisions", () => {
  it("deduplicates snapshots and keeps at most 20 per entry", () => {
    useEntryStore.setState({ entries: [entry], revisions: [] });
    const store = useEntryStore.getState();

    store.createRevision(entry.id, "<p>Same</p>");
    store.createRevision(entry.id, "<p>Same</p>");
    for (let index = 0; index < 25; index += 1) {
      useEntryStore.getState().createRevision(entry.id, `<p>${index}</p>`);
    }

    const revisions = useEntryStore
      .getState()
      .revisions.filter((revision) => revision.entryId === entry.id);
    expect(revisions).toHaveLength(20);
    expect(revisions[0].content).toBe("<p>24</p>");
  });

  it("saves the current document before restoring a snapshot", () => {
    useEntryStore.setState({ entries: [entry], revisions: [] });
    useEntryStore.getState().createRevision(entry.id, "<p>Older</p>");
    const revision = useEntryStore.getState().revisions[0];

    useEntryStore.getState().restoreRevision(entry.id, revision.id);

    const state = useEntryStore.getState();
    expect(state.entries[0].content).toBe("<p>Older</p>");
    expect(state.revisions[0].content).toBe("<p>Current</p>");
  });

  it("removes revision history with its entry", () => {
    useEntryStore.setState({ entries: [entry], revisions: [] });
    useEntryStore.getState().createRevision(entry.id, "<p>Older</p>");

    useEntryStore.getState().deleteEntry(entry.id);

    expect(useEntryStore.getState().revisions).toEqual([]);
  });
});
