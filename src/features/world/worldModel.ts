import type { WorldProfile } from "./types";

export const MAX_WORLD_NAME_LENGTH = 80;
export const MAX_WORLD_DESCRIPTION_LENGTH = 280;

export function createDefaultWorldProfile(): WorldProfile {
  const now = new Date().toISOString();
  return {
    name: "The Ashen Archive",
    description: "Local-first lore, maps, timelines, and world references.",
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeWorldProfileInput(name: string, description: string) {
  return {
    name: name.trim().slice(0, MAX_WORLD_NAME_LENGTH),
    description: description.trim().slice(0, MAX_WORLD_DESCRIPTION_LENGTH),
  };
}
