import type { CanvasCard, CanvasConnection } from "../canvas/types";
import type { Entry } from "../entries/types";
import type { EntryRelationship } from "../graph/types";
import type { MapConnection, MapLayer, MapMarker, WorldMap } from "../map/types";
import type { TimelineItem } from "../timeline/types";

export type DataHealthSnapshot = {
  entries: Entry[];
  relationships: EntryRelationship[];
  timelineItems: TimelineItem[];
  maps: WorldMap[];
  activeMapId: string;
  layers: MapLayer[];
  markers: MapMarker[];
  mapConnections: MapConnection[];
  canvasCards: CanvasCard[];
  canvasConnections: CanvasConnection[];
};

export type DataHealthReport = {
  relationships: number;
  timeline: number;
  mapMarkers: number;
  mapEntryReferences: number;
  mapConnections: number;
  canvasCards: number;
  canvasConnections: number;
  activeMap: number;
  total: number;
};

export function scanWorkspaceHealth(data: DataHealthSnapshot): DataHealthReport {
  const entryIds = new Set(data.entries.map((entry) => entry.id));
  const mapIds = new Set(data.maps.map((map) => map.id));
  const layerIds = new Set(data.layers.map((layer) => layer.id));
  const markerIds = new Set(data.markers.map((marker) => marker.id));
  const cardIds = new Set(data.canvasCards.map((card) => card.id));
  const report = {
    relationships: data.relationships.filter(
      (item) => !entryIds.has(item.sourceEntryId) || !entryIds.has(item.targetEntryId),
    ).length,
    timeline: data.timelineItems.filter((item) => !entryIds.has(item.entryId)).length,
    mapMarkers: data.markers.filter(
      (marker) => !mapIds.has(marker.mapId) || !layerIds.has(marker.layerId),
    ).length,
    mapEntryReferences: data.markers.reduce(
      (count, marker) => count + marker.entryIds.filter((id) => !entryIds.has(id)).length,
      0,
    ),
    mapConnections: data.mapConnections.filter(
      (item) =>
        !mapIds.has(item.mapId) ||
        !markerIds.has(item.fromMarkerId) ||
        !markerIds.has(item.toMarkerId),
    ).length,
    canvasCards: data.canvasCards.filter(
      (card) => card.kind === "entry" && !entryIds.has(card.entryId),
    ).length,
    canvasConnections: data.canvasConnections.filter(
      (item) => !cardIds.has(item.fromCardId) || !cardIds.has(item.toCardId),
    ).length,
    activeMap: data.maps.length > 0 && !mapIds.has(data.activeMapId) ? 1 : 0,
  };
  return { ...report, total: Object.values(report).reduce((sum, value) => sum + value, 0) };
}
