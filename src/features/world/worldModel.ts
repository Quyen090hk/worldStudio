import type { WorldProfile } from "./types";

export const MAX_WORLD_NAME_LENGTH = 80;
export const MAX_WORLD_DESCRIPTION_LENGTH = 280;
export const LEGACY_DEFAULT_WORLD_DESCRIPTION =
  "Local-first lore, maps, timelines, and world references.";

export function removeLegacyDefaultWorldDescription(description: string) {
  return description === LEGACY_DEFAULT_WORLD_DESCRIPTION ? "" : description;
}

export function createDefaultWorldProfile(): WorldProfile {
  const now = new Date().toISOString();
  return {
    name: "Untitled World",
    description: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeWorldProfileInput(name: string, description: string) {
  return {
    name: name.trim().slice(0, MAX_WORLD_NAME_LENGTH),
    description: removeLegacyDefaultWorldDescription(description.trim()).slice(
      0,
      MAX_WORLD_DESCRIPTION_LENGTH,
    ),
  };
}
