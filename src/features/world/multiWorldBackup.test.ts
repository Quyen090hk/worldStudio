import { describe, expect, it } from "vitest";
import { MAX_MULTI_WORLD_COUNT, parseMultiWorldBackup } from "./multiWorldBackup";

describe("parseMultiWorldBackup", () => {
  it("rejects unrelated backup formats", () => {
    expect(() => parseMultiWorldBackup('{"format":"world-studio-backup","version":4}')).toThrow("invalid-format");
  });
  it("rejects duplicate world ids before restore", () => {
    const record = { id: "same", name: "World", description: "", createdAt: "", updatedAt: "" };
    expect(() => parseMultiWorldBackup(JSON.stringify({ format: "world-studio-multiworld-backup", version: 1, worlds: [{ record }, { record }] }))).toThrow("invalid-world");
  });
  it("rejects backups with an unreasonable number of worlds", () => {
    const worlds = Array.from({ length: MAX_MULTI_WORLD_COUNT + 1 }, (_, index) => ({
      record: { id: `world-${index}`, name: "World" },
      workspace: {},
    }));
    expect(() => parseMultiWorldBackup(JSON.stringify({
      format: "world-studio-multiworld-backup",
      version: 1,
      worlds,
    }))).toThrow("too-many-worlds");
  });
});
