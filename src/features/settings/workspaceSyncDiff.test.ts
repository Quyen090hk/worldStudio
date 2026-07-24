import { describe, expect, it } from "vitest";

import { classifySyncChange, contentHash, summarizeSyncChanges } from "./workspaceSyncDiff";

describe("workspace sync diff", () => {
  it("creates stable content hashes", () => {
    expect(contentHash("same")).toBe(contentHash("same"));
    expect(contentHash("same")).not.toBe(contentHash("changed"));
  });

  it("separates one-sided changes from conflicts", () => {
    const changes = [
      classifySyncChange({ id: "clean", path: "a", baseHash: "1", browserHash: "1", localHash: "1" }),
      classifySyncChange({ id: "browser", path: "b", baseHash: "1", browserHash: "2", localHash: "1" }),
      classifySyncChange({ id: "local", path: "c", baseHash: "1", browserHash: "1", localHash: "2" }),
      classifySyncChange({ id: "conflict", path: "d", baseHash: "1", browserHash: "2", localHash: "3" }),
    ];
    expect(changes.map((change) => change.kind)).toEqual(["clean", "browser-only", "local-only", "conflict"]);
    expect(summarizeSyncChanges(changes)).toEqual({ clean: 1, "browser-only": 1, "local-only": 1, conflict: 1 });
  });

  it("treats missing or legacy baselines conservatively", () => {
    expect(classifySyncChange({ id: "legacy", path: "a", baseHash: null, browserHash: "1", localHash: "2" }).kind).toBe("conflict");
    expect(classifySyncChange({ id: "new-browser", path: "b", baseHash: null, browserHash: "1", localHash: null }).kind).toBe("browser-only");
    expect(classifySyncChange({ id: "new-local", path: "c", baseHash: null, browserHash: null, localHash: "1" }).kind).toBe("local-only");
    expect(classifySyncChange({ id: "deleted", path: "d", baseHash: "1", browserHash: "1", localHash: null }).kind).toBe("local-only");
  });
});
