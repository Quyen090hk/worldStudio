import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addCustomOpeningQuote,
  getDailyOpeningQuote,
  getOpeningQuotes,
  isCustomOpeningQuote,
  removeCustomOpeningQuote,
} from "./openingQuotes";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("opening quotations", () => {
  it("keeps a quotation stable throughout the same UTC day", () => {
    const morning = getDailyOpeningQuote("zh-CN", new Date("2026-07-16T01:00:00Z"));
    const evening = getDailyOpeningQuote("zh-CN", new Date("2026-07-16T23:00:00Z"));
    expect(morning).toEqual(evening);
  });

  it("provides localized text and attribution", () => {
    for (const locale of ["zh-CN", "en-US"] as const) {
      const quote = getDailyOpeningQuote(locale, new Date("2026-07-16T12:00:00Z"));
      expect(quote.text.length).toBeGreaterThan(4);
      expect(quote.source.length).toBeGreaterThan(2);
    }
  });

  it("persists author-created lines in the localized collection", () => {
    const originalLength = getOpeningQuotes("zh-CN").length;
    const index = addCustomOpeningQuote("zh-CN", {
      text: "群星记得我们未曾写下的名字。",
      translation: "The stars remember the names we never wrote.",
      source: "守夜人伊岚",
    });

    expect(index).toBe(originalLength);
    expect(isCustomOpeningQuote("zh-CN", index)).toBe(true);
    expect(getOpeningQuotes("zh-CN")[index].source).toBe("守夜人伊岚");
    expect(removeCustomOpeningQuote("zh-CN", index)).toBe(true);
    expect(getOpeningQuotes("zh-CN")).toHaveLength(originalLength);
  });
});
