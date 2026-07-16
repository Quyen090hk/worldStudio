import { describe, expect, it } from "vitest";
import { getReferencedEntryIds } from "./entryReferences";

describe("getReferencedEntryIds", () => {
  it("collects unique internal entry links", () => {
    const ids = getReferencedEntryIds(
      '<p><a href="/entries/entry-1">One</a> and <a href="/entries/entry-1">One again</a></p>',
    );

    expect([...ids]).toEqual(["entry-1"]);
  });

  it("decodes ids and ignores external links", () => {
    const ids = getReferencedEntryIds(
      "<p><a href='/entries/north%20ridge?from=note'>Ridge</a><a href='https://example.com'>Web</a></p>",
    );

    expect([...ids]).toEqual(["north ridge"]);
  });

  it("tolerates malformed encoded ids", () => {
    expect([...getReferencedEntryIds('<a href="/entries/%broken">Broken</a>')]).toEqual([
      "%broken",
    ]);
  });
});
