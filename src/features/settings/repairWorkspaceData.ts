import { useCanvasStore } from "../canvas/stores/useCanvasStore";
import { useEntryStore } from "../entries/stores/useEntryStore";
import { useRelationshipStore } from "../graph/stores/useRelationshipStore";
import { useMapStore } from "../map/stores/useMapStore";
import { useTimelineStore } from "../timeline/stores/useTimelineStore";

export function repairWorkspaceData() {
  const entryIds = new Set(useEntryStore.getState().entries.map((entry) => entry.id));

  useRelationshipStore.setState((state) => ({
    relationships: state.relationships.filter(
      (item) => entryIds.has(item.sourceEntryId) && entryIds.has(item.targetEntryId),
    ),
  }));
  useTimelineStore.setState((state) => ({
    items: state.items.filter((item) => item.entryId === null || entryIds.has(item.entryId)),
  }));

  useMapStore.setState((state) => {
    const mapIds = new Set(state.maps.map((map) => map.id));
    const layerIds = new Set(state.layers.map((layer) => layer.id));
    const markers = state.markers
      .filter((marker) => mapIds.has(marker.mapId) && layerIds.has(marker.layerId))
      .map((marker) => ({
        ...marker,
        entryIds: marker.entryIds.filter((id) => entryIds.has(id)),
      }));
    const markerIds = new Set(markers.map((marker) => marker.id));
    return {
      markers,
      connections: state.connections.filter(
        (item) =>
          mapIds.has(item.mapId) &&
          markerIds.has(item.fromMarkerId) &&
          markerIds.has(item.toMarkerId),
      ),
      activeMapId: mapIds.has(state.activeMapId)
        ? state.activeMapId
        : (state.maps[0]?.id ?? ""),
    };
  });

  useCanvasStore.setState((state) => {
    const cards = state.cards.filter(
      (card) => card.kind === "note" || entryIds.has(card.entryId),
    );
    const cardIds = new Set(cards.map((card) => card.id));
    return {
      cards,
      connections: state.connections.filter(
        (item) => cardIds.has(item.fromCardId) && cardIds.has(item.toCardId),
      ),
    };
  });
}
