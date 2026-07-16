import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteRecord,
  indexedDbStateStorage,
  readRecord,
  STORE_STATE,
  writeRecord,
} from "./database";

beforeEach(async () => {
  await deleteRecord(STORE_STATE, "test-record");
});

describe("database memory fallback", () => {
  it("round-trips and deletes records when IndexedDB is unavailable", async () => {
    await writeRecord(STORE_STATE, "test-record", { value: 42 });
    await expect(readRecord(STORE_STATE, "test-record")).resolves.toEqual({ value: 42 });
    await deleteRecord(STORE_STATE, "test-record");
    await expect(readRecord(STORE_STATE, "test-record")).resolves.toBeUndefined();
  });

  it("keeps the latest queued persisted state", async () => {
    await Promise.all([
      indexedDbStateStorage.setItem("test-record", "first"),
      indexedDbStateStorage.setItem("test-record", "second"),
    ]);
    await expect(indexedDbStateStorage.getItem("test-record")).resolves.toBe("second");
  });
});
