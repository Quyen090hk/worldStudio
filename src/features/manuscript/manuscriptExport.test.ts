import { describe, expect, it } from "vitest";
import { createEntryDocument } from "../entries/utils/entryDocument";
import { manuscriptToMarkdown } from "./manuscriptExport";
import type { Manuscript, ManuscriptNode } from "./types";

describe("manuscript export", () => {
  it("exports volumes, chapters, and prose in reading order", () => {
    const manuscript = { id: "m", worldId: "w", title: "Book", synopsis: "Premise", status: "drafting", targetWordCount: null, createdAt: "", updatedAt: "" } satisfies Manuscript;
    const base: Pick<ManuscriptNode, "manuscriptId" | "synopsis" | "status" | "povEntryId" | "characterEntryIds" | "locationEntryIds" | "timelineItemIds" | "createdAt" | "updatedAt"> = { manuscriptId: "m", synopsis: "", status: "draft", povEntryId: null, characterEntryIds: [], locationEntryIds: [], timelineItemIds: [], createdAt: "", updatedAt: "" };
    const nodes: ManuscriptNode[] = [
      { ...base, id: "v", parentId: null, kind: "volume", title: "Volume One", content: "", order: 0 },
      { ...base, id: "c", parentId: "v", kind: "chapter", title: "Chapter One", content: createEntryDocument({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Opening line." }] }] }), order: 0 },
    ];
    expect(manuscriptToMarkdown(manuscript, nodes)).toContain("## Volume One\n\n### Chapter One\n\nOpening line.");
  });
});
