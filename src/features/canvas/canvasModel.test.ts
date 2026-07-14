import { describe, expect, it } from "vitest";

import {
  CANVAS_CARD_WIDTH,
  CANVAS_WIDTH,
  clampCanvasPosition,
  clampCanvasZoom,
  sanitizeCanvasData,
} from "./canvasModel";
import type { CanvasCard } from "./types";

const cards: CanvasCard[] = [
  {
    id: "note-1",
    kind: "note",
    x: 100,
    y: 100,
    title: "Question",
    body: "",
    color: "parchment",
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "entry-1",
    kind: "entry",
    entryId: "lore-1",
    x: 500,
    y: 300,
    color: "slate",
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
];

describe("canvasModel", () => {
  it("keeps cards and zoom inside supported bounds", () => {
    expect(clampCanvasPosition(-20, -10)).toEqual({ x: 24, y: 24 });
    expect(clampCanvasPosition(9999, 100).x).toBe(
      CANVAS_WIDTH - CANVAS_CARD_WIDTH - 24,
    );
    expect(clampCanvasZoom(0.1)).toBe(0.6);
    expect(clampCanvasZoom(2)).toBe(1.4);
  });

  it("removes orphaned and self-referencing connections", () => {
    const result = sanitizeCanvasData(cards, [
      {
        id: "valid",
        fromCardId: "note-1",
        toCardId: "entry-1",
        createdAt: "2026-07-14T00:00:00.000Z",
      },
      {
        id: "orphan",
        fromCardId: "note-1",
        toCardId: "missing",
        createdAt: "2026-07-14T00:00:00.000Z",
      },
      {
        id: "self",
        fromCardId: "note-1",
        toCardId: "note-1",
        createdAt: "2026-07-14T00:00:00.000Z",
      },
    ]);

    expect(result.connections.map((connection) => connection.id)).toEqual([
      "valid",
    ]);
  });
});
