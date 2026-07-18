import { describe, expect, it } from "vitest";

import { readEntryDraft, writeEntryDraft } from "./entryDraftStorage";

describe("entry draft storage", () => {
  it("keeps the latest recoverable draft independently from the entry store", async () => {
    await writeEntryDraft("draft-test-entry", "<p>First version</p>");
    await writeEntryDraft("draft-test-entry", "<p>Latest version</p>");

    const draft = await readEntryDraft("draft-test-entry");
    expect(draft).toMatchObject({
      entryId: "draft-test-entry",
      content: "<p>Latest version</p>",
    });
    expect(Number.isNaN(Date.parse(draft?.updatedAt ?? ""))).toBe(false);
  });
});
