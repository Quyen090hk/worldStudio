import { describe, expect, it } from "vitest";
import { normalizeEntryContent } from "./normalizeEntryContent";

describe("normalizeEntryContent", () => {
  it("preserves string and legacy html content", () => {
    expect(normalizeEntryContent("<p>Existing lore</p>")).toBe("<p>Existing lore</p>");
    expect(normalizeEntryContent({ html: "<p>Legacy lore</p>" })).toBe("<p>Legacy lore</p>");
  });

  it("recovers readable paragraphs from a Tiptap JSON document", () => {
    expect(normalizeEntryContent({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "First" }] },
        { type: "paragraph", content: [{ type: "text", text: "Second" }] },
      ],
    })).toBe("<p>First</p><p>Second</p>");
  });

  it("returns an empty document for unsupported values", () => {
    expect(normalizeEntryContent(undefined)).toBe("");
    expect(normalizeEntryContent({ unexpected: true })).toBe("");
  });
});
