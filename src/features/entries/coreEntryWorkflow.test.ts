import { afterEach, describe, expect, it } from "vitest";

import {
  createWorkspaceSnapshot,
  parseWorkspaceBackup,
  serializeWorkspaceBackup,
} from "../settings/workspaceBackup";
import { readEntryDraft, writeEntryDraft } from "./entryDraftStorage";
import { useEntryStore } from "./stores/useEntryStore";

describe("core entry workflow", () => {
  afterEach(() => {
    useEntryStore.setState({
      entries: [],
      revisions: [],
      drawerOpen: false,
      editingEntryId: null,
    });
  });

  it("keeps authored content recoverable and exportable through a snapshot round trip", async () => {
    useEntryStore.getState().createEntry({
      title: "Lantern Keeper",
      type: "Character",
      summary: "Keeps the western signal alight.",
      content: "",
      tags: ["watch"],
      properties: [],
      media: {},
    });
    const entryId = useEntryStore.getState().entries[0]?.id;
    expect(entryId).toBeTruthy();

    const firstDraft = "<p>The lamp survived the storm.</p>";
    await writeEntryDraft(entryId!, firstDraft);
    useEntryStore.getState().updateEntryContent(entryId!, firstDraft);
    useEntryStore.getState().createRevision(entryId!, firstDraft);

    const secondDraft = "<p>The lamp survived the storm and guided the fleet.</p>";
    await writeEntryDraft(entryId!, secondDraft);
    useEntryStore.getState().updateEntryContent(entryId!, secondDraft);

    expect((await readEntryDraft(entryId!))?.content).toBe(secondDraft);

    const serialized = serializeWorkspaceBackup(await createWorkspaceSnapshot());
    const restored = parseWorkspaceBackup(serialized);

    expect(restored.storage).toBe("snapshot");
    expect(restored.data.entries.find((entry) => entry.id === entryId)?.content).toBe(secondDraft);
    expect(restored.data.revisions.some((revision) => revision.content === firstDraft)).toBe(true);
  });
});
