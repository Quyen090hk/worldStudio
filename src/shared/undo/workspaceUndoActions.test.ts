import { afterEach, describe, expect, it } from "vitest";

import { useCanvasStore } from "../../features/canvas/stores/useCanvasStore";
import { useRelationshipStore } from "../../features/graph/stores/useRelationshipStore";
import { useTimelineStore } from "../../features/timeline/stores/useTimelineStore";
import { useUndoStore } from "./useUndoStore";
import {
  removeCanvasCardsWithUndo,
  removeRelationshipWithUndo,
  removeTimelineEraWithUndo,
  removeTimelineItemWithUndo,
} from "./workspaceUndoActions";

describe("workspace undo actions", () => {
  afterEach(() => {
    useRelationshipStore.setState({ relationships: [] });
    useTimelineStore.setState({ items: [], eras: [] });
    useCanvasStore.setState({ cards: [], connections: [], viewport: { zoom: 1 } });
    useUndoStore.setState({ offer: null });
  });

  it("restores a deleted relationship", () => {
    useRelationshipStore.setState({
      relationships: [{
        id: "relationship-1",
        sourceEntryId: "entry-a",
        targetEntryId: "entry-b",
        type: "Allied with",
        inverseLabel: "Allied with",
        direction: "mutual",
        strength: null,
        status: "current",
        startYear: null,
        endYear: null,
        description: "",
        tags: [],
      }],
    });

    removeRelationshipWithUndo("relationship-1", "A — B");
    expect(useRelationshipStore.getState().relationships).toEqual([]);

    useUndoStore.getState().undo();
    expect(useRelationshipStore.getState().relationships).toHaveLength(1);
  });

  it("restores timeline records and eras", () => {
    useTimelineStore.setState({
      items: [{ id: "item-1", entryId: "entry-1", title: "Event", startYear: 1, endYear: null, description: "", color: null }],
      eras: [{ id: "era-1", name: "First Age", startYear: 0, endYear: 10, description: "", color: "#000" }],
    });

    removeTimelineItemWithUndo("item-1", "Event");
    useUndoStore.getState().undo();
    removeTimelineEraWithUndo("era-1", "First Age");
    useUndoStore.getState().undo();

    expect(useTimelineStore.getState().items).toHaveLength(1);
    expect(useTimelineStore.getState().eras).toHaveLength(1);
  });

  it("restores canvas cards together with their connections", () => {
    const now = "2026-07-18T00:00:00.000Z";
    useCanvasStore.setState({
      cards: [
        { id: "card-a", kind: "note", x: 0, y: 0, color: "parchment", title: "A", body: "", createdAt: now, updatedAt: now },
        { id: "card-b", kind: "note", x: 100, y: 0, color: "sage", title: "B", body: "", createdAt: now, updatedAt: now },
      ],
      connections: [{ id: "line-1", fromCardId: "card-a", toCardId: "card-b", createdAt: now }],
    });

    removeCanvasCardsWithUndo(["card-a"], "A");
    expect(useCanvasStore.getState().connections).toEqual([]);

    useUndoStore.getState().undo();
    expect(useCanvasStore.getState().cards).toHaveLength(2);
    expect(useCanvasStore.getState().connections).toHaveLength(1);
  });
});
