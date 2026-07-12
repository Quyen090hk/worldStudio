export type MapScale = "World" | "Continent" | "Region" | "City" | "Dungeon" | "Other";

export type MarkerCategory =
  | "Settlement" | "Capital" | "Kingdom" | "Landmark" | "Ruin" | "Dungeon"
  | "Event" | "Battle" | "Character" | "Faction" | "Quest" | "Religion"
  | "Resource" | "Transport" | "Geography" | "Custom";

export type ConnectionType =
  | "Road" | "Trade route" | "River" | "Border" | "Migration"
  | "Campaign" | "Journey" | "Alliance" | "Custom";

export type WorldMap = {
  id: string;
  name: string;
  scale: MapScale;
  description: string;
  createdAt: string;
};

export type MapLayer = {
  id: string;
  mapId: string;
  name: string;
  color: string;
  visible: boolean;
};

export type MapMarker = {
  id: string;
  mapId: string;
  layerId: string;
  entryIds: string[];
  title: string;
  description: string;
  category: MarkerCategory;
  x: number;
  y: number;
  color: string;
  size: "Small" | "Medium" | "Large";
  startYear: number | null;
  endYear: number | null;
};

export type MapConnection = {
  id: string;
  mapId: string;
  fromMarkerId: string;
  toMarkerId: string;
  type: ConnectionType;
  label: string;
  color: string;
  dashed: boolean;
};

