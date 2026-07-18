import { afterEach, describe, expect, it } from "vitest";

import { useCanvasStore } from "./useCanvasStore";

const now = "2026-01-01T00:00:00.000Z";

afterEach(() => {
  useCanvasStore.setState({ cards: [], connections: [], viewport: { zoom: 1 } });
});

describe("canvas store arranging", () => {
  it("aligns selected cards without moving unselected cards", () => {
    useCanvasStore.setState({
      cards: [
        { id: "a", kind: "note", x: 120, y: 40, title: "A", body: "", color: "parchment", createdAt: now, updatedAt: now },
        { id: "b", kind: "note", x: 260, y: 90, title: "B", body: "", color: "sage", createdAt: now, updatedAt: now },
        { id: "c", kind: "note", x: 500, y: 200, title: "C", body: "", color: "slate", createdAt: now, updatedAt: now },
      ],
    });
    useCanvasStore.getState().arrangeCards(["a", "b"], "left");
    const cards = useCanvasStore.getState().cards;
    expect(cards.find((card) => card.id === "a")?.x).toBe(120);
    expect(cards.find((card) => card.id === "b")?.x).toBe(120);
    expect(cards.find((card) => card.id === "c")?.x).toBe(500);
  });

  it("duplicates a card with a new id and offset", () => {
    useCanvasStore.setState({
      cards: [{ id: "a", kind: "note", x: 120, y: 40, title: "A", body: "Text", color: "parchment", createdAt: now, updatedAt: now }],
    });
    const id = useCanvasStore.getState().duplicateCard("a");
    const copy = useCanvasStore.getState().cards.find((card) => card.id === id);
    expect(copy).toMatchObject({ kind: "note", title: "A", body: "Text", x: 152, y: 72 });
  });
});
