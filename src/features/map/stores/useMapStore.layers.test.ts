import { afterEach, describe, expect, it } from "vitest";

import { useMapStore } from "./useMapStore";

afterEach(() => {
  useMapStore.setState({ layers: [] });
});

describe("map layer ordering", () => {
  it("moves layers only within the same map", () => {
    useMapStore.setState({
      layers: [
        { id: "a", mapId: "map-1", name: "A", color: "#000", visible: true },
        { id: "b", mapId: "map-1", name: "B", color: "#111", visible: true },
        { id: "c", mapId: "map-2", name: "C", color: "#222", visible: true },
      ],
    });
    useMapStore.getState().moveLayer("b", -1);
    expect(useMapStore.getState().layers.map((layer) => layer.id)).toEqual(["b", "a", "c"]);
    useMapStore.getState().moveLayer("a", 1);
    expect(useMapStore.getState().layers.map((layer) => layer.id)).toEqual(["b", "a", "c"]);
  });
});
