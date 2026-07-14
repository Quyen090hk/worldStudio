import { describe, expect, it } from "vitest";

import type { AssetRecord } from "./types";
import { filterAssets, formatAssetSize, getAssetKind } from "./assetModel";

const assets: AssetRecord[] = [
  {
    id: "image-1",
    name: "Northern Citadel.png",
    mediaType: "image/png",
    kind: "image",
    size: 2048,
    tags: ["location", "winter"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "document-1",
    name: "Chapter Notes.pdf",
    mediaType: "application/pdf",
    kind: "document",
    size: 1024 * 1024,
    tags: ["draft"],
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-02T00:00:00.000Z",
  },
];

describe("assetModel", () => {
  it("classifies common media types", () => {
    expect(getAssetKind("image/webp")).toBe("image");
    expect(getAssetKind("audio/mpeg")).toBe("audio");
    expect(getAssetKind("video/mp4")).toBe("video");
    expect(getAssetKind("application/pdf")).toBe("document");
    expect(getAssetKind("application/zip")).toBe("other");
  });

  it("filters by category and multiple search tokens", () => {
    expect(filterAssets(assets, "citadel winter", "image")[0]?.id).toBe(
      "image-1",
    );
    expect(filterAssets(assets, "", "document")[0]?.id).toBe("document-1");
  });

  it("formats byte sizes for display", () => {
    expect(formatAssetSize(500)).toBe("500 B");
    expect(formatAssetSize(2048)).toBe("2.0 KB");
    expect(formatAssetSize(1024 * 1024)).toBe("1.0 MB");
  });
});
