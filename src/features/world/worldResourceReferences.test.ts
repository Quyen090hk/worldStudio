import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  activeWorldId: "world-a",
  workspaces: new Map<string, { data: { assetLibrary: { items: Array<{ id: string }> }; atlas: { maps: Array<{ id: string }> } } }>(),
}));

vi.mock("./stores/useWorldRegistryStore", () => ({
  useWorldRegistryStore: {
    getState: () => ({
      activeWorldId: mocks.activeWorldId,
      worlds: [{ id: "world-a" }, { id: "world-b" }],
    }),
  },
}));

vi.mock("./workspaceStorage", () => ({
  loadWorldWorkspace: (id: string) => Promise.resolve(mocks.workspaces.get(id)),
}));

import {
  isAssetReferencedByStoredWorld,
  isMapImageReferencedByStoredWorld,
} from "./worldResourceReferences";

describe("world resource references", () => {
  beforeEach(() => {
    mocks.workspaces.clear();
    mocks.workspaces.set("world-a", {
      data: { assetLibrary: { items: [{ id: "asset-shared" }] }, atlas: { maps: [{ id: "map-shared" }] } },
    });
    mocks.workspaces.set("world-b", {
      data: { assetLibrary: { items: [{ id: "asset-shared" }] }, atlas: { maps: [{ id: "map-shared" }] } },
    });
  });

  it("finds resources retained by another world while excluding the active one", async () => {
    await expect(isAssetReferencedByStoredWorld("asset-shared", "world-a")).resolves.toBe(true);
    await expect(isMapImageReferencedByStoredWorld("map-shared", "world-a")).resolves.toBe(true);
  });

  it("allows cleanup after the final stored reference disappears", async () => {
    mocks.workspaces.set("world-b", {
      data: { assetLibrary: { items: [] }, atlas: { maps: [] } },
    });

    await expect(isAssetReferencedByStoredWorld("asset-shared", "world-a")).resolves.toBe(false);
    await expect(isMapImageReferencedByStoredWorld("map-shared", "world-a")).resolves.toBe(false);
  });
});
