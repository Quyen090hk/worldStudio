import type { ConnectionType, MapScale, MarkerCategory } from "./types";

export const MAP_CATEGORIES: MarkerCategory[] = [
  "Settlement", "Capital", "Kingdom", "Landmark", "Ruin", "Dungeon",
  "Event", "Battle", "Character", "Faction", "Quest", "Religion",
  "Resource", "Transport", "Geography", "Custom",
];

export const MAP_CONNECTION_TYPES: ConnectionType[] = [
  "Road", "Trade route", "River", "Border", "Migration", "Campaign",
  "Journey", "Alliance", "Custom",
];

export const MAP_SCALES: MapScale[] = [
  "World", "Continent", "Region", "City", "Dungeon", "Other",
];

export const MAP_COLORS = [
  "#986e36",
  "#725b87",
  "#627554",
  "#557783",
  "#925b52",
];

export const CATEGORY_GLYPH: Record<MarkerCategory, string> = {
  Settlement: "●",
  Capital: "★",
  Kingdom: "♜",
  Landmark: "◆",
  Ruin: "⌁",
  Dungeon: "⬟",
  Event: "◈",
  Battle: "⚔",
  Character: "♟",
  Faction: "⚑",
  Quest: "!",
  Religion: "✦",
  Resource: "♦",
  Transport: "↔",
  Geography: "▲",
  Custom: "•",
};
