import { describe, expect, it } from "vitest";

import { removeEmbeddedAsset } from "./assetActions";

describe("asset deletion cleanup", () => {
  it("removes only the matching embedded image block from entry content", () => {
    const content = [
      "<p>Before</p>",
      '<figure data-asset-image="true" data-asset-id="asset-1"><figcaption>One</figcaption></figure>',
      '<figure data-asset-id="asset-2" data-asset-image="true"><figcaption>Two</figcaption></figure>',
      "<p>After</p>",
    ].join("");

    const cleaned = removeEmbeddedAsset(content, "asset-1");

    expect(cleaned).not.toContain("asset-1");
    expect(cleaned).toContain("asset-2");
    expect(cleaned).toContain("<p>Before</p>");
    expect(cleaned).toContain("<p>After</p>");
  });
});
