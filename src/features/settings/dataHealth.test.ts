import { describe, expect, it } from "vitest";
import { scanWorkspaceHealth, type DataHealthSnapshot } from "./dataHealth";

function snapshot(): DataHealthSnapshot {
  return {
    entries: [], relationships: [], timelineItems: [], maps: [], activeMapId: "",
    layers: [], markers: [], mapConnections: [], canvasCards: [], canvasConnections: [],
  };
}

describe("scanWorkspaceHealth", () => {
  it("reports dangling references across modules", () => {
    const data = snapshot();
    data.relationships = [{ id: "r", sourceEntryId: "missing", targetEntryId: "also-missing", type: "Custom", inverseLabel: "", direction: "directed", strength: null, status: "current", startYear: null, endYear: null, description: "", tags: [] }];
    data.timelineItems = [{ id: "t", entryId: "missing", title: "Missing", startYear: 1, endYear: null, description: "", color: null }];
    data.canvasCards = [{ id: "c", kind: "entry", entryId: "missing", x: 0, y: 0, color: "slate", createdAt: "", updatedAt: "" }];
    data.canvasConnections = [{ id: "cc", fromCardId: "c", toCardId: "missing", createdAt: "" }];
    expect(scanWorkspaceHealth(data)).toMatchObject({ relationships: 1, timeline: 1, canvasCards: 1, canvasConnections: 1, total: 4 });
  });

  it("accepts a consistent workspace", () => {
    const data = snapshot();
    data.entries = [{ id: "e", title: "Entry", summary: "", content: "", tags: [], type: "Event", createdAt: "", updatedAt: "" }];
    data.maps = [{ id: "m", name: "Map", scale: "World", description: "", createdAt: "" }];
    data.activeMapId = "m";
    data.layers = [{ id: "l", mapId: "m", name: "Layer", color: "#000", visible: true }];
    data.markers = [{ id: "p", mapId: "m", layerId: "l", entryIds: ["e"], title: "Place", description: "", category: "Custom", x: 0, y: 0, color: "#000", size: "Small", startYear: null, endYear: null }];
    expect(scanWorkspaceHealth(data).total).toBe(0);
  });
});
