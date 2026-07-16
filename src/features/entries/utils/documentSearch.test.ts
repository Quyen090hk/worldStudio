import { describe, expect, it } from "vitest";
import { findDocumentTextMatches } from "./documentSearch";

function documentWith(...nodes: Array<{ text: string; position: number }>) {
  return {
    descendants(callback: (node: { isText: boolean; text: string }, position: number) => void) {
      nodes.forEach(({ text, position }) => callback({ isText: true, text }, position));
    },
  };
}

describe("findDocumentTextMatches", () => {
  it("finds all case-insensitive matches with ProseMirror positions", () => {
    const matches = findDocumentTextMatches(
      documentWith({ text: "Ash ash", position: 1 }, { text: "ASHEN", position: 12 }),
      "ash",
    );
    expect(matches).toEqual([
      { from: 1, to: 4 },
      { from: 5, to: 8 },
      { from: 12, to: 15 },
    ]);
  });

  it("does not create matches across separate text nodes", () => {
    expect(
      findDocumentTextMatches(
        documentWith({ text: "world", position: 1 }, { text: "studio", position: 8 }),
        "worldstudio",
      ),
    ).toEqual([]);
  });

  it("returns no matches for an empty query", () => {
    expect(findDocumentTextMatches(documentWith({ text: "text", position: 1 }), "")).toEqual([]);
  });
});
