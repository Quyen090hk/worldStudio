import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MapConnection, MapLayer, MapMarker, MapScale, WorldMap } from "../types";

type MapStore = {
  maps: WorldMap[];
  activeMapId: string;
  layers: MapLayer[];
  markers: MapMarker[];
  connections: MapConnection[];
  setActiveMap: (id: string) => void;
  createMap: (name: string, scale: MapScale) => string;
  updateMap: (id: string, patch: Partial<Omit<WorldMap, "id">>) => void;
  deleteMap: (id: string) => void;
  addLayer: (mapId: string, name: string) => string;
  toggleLayer: (id: string) => void;
  addMarker: (marker: Omit<MapMarker, "id">) => string;
  updateMarker: (id: string, patch: Partial<Omit<MapMarker, "id">>) => void;
  deleteMarker: (id: string) => void;
  addConnection: (connection: Omit<MapConnection, "id">) => string;
  deleteConnection: (id: string) => void;
};

function createId(prefix: string) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}`;
}

const mapId = "map-ashen-continent";
const defaultLayerId = "layer-places";
const maps: WorldMap[] = [{ id: mapId, name: "The Ashen Continent", scale: "Continent", description: "The known lands of the Ashen Archive.", createdAt: new Date().toISOString() }];
const layers: MapLayer[] = [
  { id: defaultLayerId, mapId, name: "Places", color: "#986e36", visible: true },
  { id: "layer-history", mapId, name: "History & conflicts", color: "#925b52", visible: true },
];

export const useMapStore = create<MapStore>()(
  persist(
    (set) => ({
      maps,
      activeMapId: mapId,
      layers,
      markers: [],
      connections: [],
      setActiveMap: (activeMapId) => set({ activeMapId }),
      createMap: (name, scale) => {
        const id = createId("map");
        const layerId = createId("layer");
        set((state) => ({
          maps: [...state.maps, { id, name, scale, description: "", createdAt: new Date().toISOString() }],
          layers: [...state.layers, { id: layerId, mapId: id, name: "Places", color: "#986e36", visible: true }],
          activeMapId: id,
        }));
        return id;
      },
      updateMap: (id, patch) => set((state) => ({ maps: state.maps.map((map) => map.id === id ? { ...map, ...patch } : map) })),
      deleteMap: (id) => set((state) => {
        if (state.maps.length === 1) return state;
        const remaining = state.maps.filter((map) => map.id !== id);
        const markerIds = new Set(state.markers.filter((marker) => marker.mapId === id).map((marker) => marker.id));
        return {
          maps: remaining,
          activeMapId: state.activeMapId === id ? remaining[0].id : state.activeMapId,
          layers: state.layers.filter((layer) => layer.mapId !== id),
          markers: state.markers.filter((marker) => marker.mapId !== id),
          connections: state.connections.filter((connection) => connection.mapId !== id && !markerIds.has(connection.fromMarkerId) && !markerIds.has(connection.toMarkerId)),
        };
      }),
      addLayer: (mapId, name) => {
        const id = createId("layer");
        set((state) => ({ layers: [...state.layers, { id, mapId, name, color: "#627554", visible: true }] }));
        return id;
      },
      toggleLayer: (id) => set((state) => ({ layers: state.layers.map((layer) => layer.id === id ? { ...layer, visible: !layer.visible } : layer) })),
      addMarker: (marker) => {
        const id = createId("marker");
        set((state) => ({ markers: [...state.markers, { ...marker, id }] }));
        return id;
      },
      updateMarker: (id, patch) => set((state) => ({ markers: state.markers.map((marker) => marker.id === id ? { ...marker, ...patch } : marker) })),
      deleteMarker: (id) => set((state) => ({ markers: state.markers.filter((marker) => marker.id !== id), connections: state.connections.filter((connection) => connection.fromMarkerId !== id && connection.toMarkerId !== id) })),
      addConnection: (connection) => {
        const id = createId("connection");
        set((state) => ({ connections: [...state.connections, { ...connection, id }] }));
        return id;
      },
      deleteConnection: (id) => set((state) => ({ connections: state.connections.filter((connection) => connection.id !== id) })),
    }),
    { name: "world-studio.map.v2", version: 2 },
  ),
);

