import { afterEach, describe, expect, it } from "vitest";
import { hasPropertyValue } from "./entryPropertyCatalog";
import { useEntryStore } from "./stores/useEntryStore";
import type { Entry } from "./types";

const referenced: Entry = { id: "place", title: "Place", type: "Location", summary: "", content: "", tags: [], createdAt: "2026-01-01", updatedAt: "2026-01-01" };
const character: Entry = { id: "character", title: "Character", type: "Character", summary: "", content: "", tags: [], properties: [{ id: "home", label: "Home", type: "entryReference", value: ["place"] }], media: { primaryAssetId: "asset-1" }, createdAt: "2026-01-01", updatedAt: "2026-01-01" };

afterEach(() => useEntryStore.setState({ entries: [], revisions: [] }));

describe("optional entry properties", () => {
  it("hides empty values and keeps authored values", () => {
    expect(hasPropertyValue("")).toBe(false);
    expect(hasPropertyValue("  ")).toBe(false);
    expect(hasPropertyValue([])).toBe(false);
    expect(hasPropertyValue("Cartographer")).toBe(true);
  });

  it("removes references when the target entry is deleted", () => {
    useEntryStore.setState({ entries: [character, referenced], revisions: [] });
    useEntryStore.getState().deleteEntry("place");
    expect(useEntryStore.getState().entries[0].properties?.[0].value).toEqual([]);
  });
});
