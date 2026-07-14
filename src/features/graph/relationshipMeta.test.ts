import { describe, expect, it } from "vitest";

import {
  inverseFor,
  normalizeRelationshipType,
} from "./relationshipMeta";

describe("relationship metadata", () => {
  it("migrates legacy Chinese display values to stable relationship types", () => {
    expect(normalizeRelationshipType("盟友")).toBe("Allied with");
    expect(normalizeRelationshipType("由……创造")).toBe("Created by");
  });

  it("keeps valid types and safely normalizes unknown values", () => {
    expect(normalizeRelationshipType("Parent of")).toBe("Parent of");
    expect(normalizeRelationshipType("unknown-value")).toBe("Custom");
  });

  it("returns the canonical inverse label", () => {
    expect(inverseFor("Parent of")).toBe("Child of");
    expect(inverseFor("Allied with")).toBe("Allied with");
  });
});
