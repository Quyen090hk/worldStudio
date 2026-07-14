import { describe, expect, it } from "vitest";

import {
  MAX_WORLD_DESCRIPTION_LENGTH,
  MAX_WORLD_NAME_LENGTH,
  normalizeWorldProfileInput,
} from "./worldModel";

describe("worldModel", () => {
  it("trims profile fields", () => {
    expect(normalizeWorldProfileInput("  Ember Sea  ", "  Storm realm  ")).toEqual(
      {
        name: "Ember Sea",
        description: "Storm realm",
      },
    );
  });

  it("enforces persisted profile length limits", () => {
    const profile = normalizeWorldProfileInput("x".repeat(200), "y".repeat(500));
    expect(profile.name).toHaveLength(MAX_WORLD_NAME_LENGTH);
    expect(profile.description).toHaveLength(MAX_WORLD_DESCRIPTION_LENGTH);
  });
});
