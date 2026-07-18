import { describe, expect, it } from "vitest";

import type { Entry } from "../../features/entries/types";
import { getEntrySearchExcerpt, searchEntries } from "./searchEntries";

const entries: Entry[] = [
  {
    id: "old-title",
    title: "Ashen Archive",
    type: "Location",
    summary: "A quiet library.",
    content: "<p>Stone shelves and sealed rooms.</p>",
    tags: ["library"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "new-content",
    title: "Northern Watch",
    type: "Organization",
    summary: "Wardens of the border.",
    content: "<p>They guard the ashen road.</p>",
    tags: ["faction", "watch"],
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-02T00:00:00.000Z",
  },
];

describe("searchEntries", () => {
  it("returns recently updated entries for an empty query", () => {
    expect(searchEntries(entries, "").map((entry) => entry.id)).toEqual([
      "new-content",
      "old-title",
    ]);
  });

  it("ranks title matches before content matches", () => {
    expect(searchEntries(entries, "ashen").map((entry) => entry.id)).toEqual([
      "old-title",
      "new-content",
    ]);
  });

  it("supports multi-word searches across different fields", () => {
    expect(searchEntries(entries, "northern faction")[0]?.id).toBe(
      "new-content",
    );
  });

  it("searches visible rich-text content without matching markup", () => {
    expect(searchEntries(entries, "stone shelves")[0]?.id).toBe("old-title");
    expect(searchEntries(entries, "<p>")).toEqual([]);
  });

  it("returns a readable excerpt around a body match", () => {
    expect(getEntrySearchExcerpt(entries[0], "sealed")).toContain("sealed rooms");
    expect(getEntrySearchExcerpt(entries[0], "library")).toBe("A quiet library.");
  });
});
