import { describe, expect, it } from "vitest";

import { formatWorldYear, resolveTimelineItems } from "./timelineModel";
import type { TimelineItem, TimelineLane } from "./types";

describe("timeline customization", () => {
  it("resolves a standalone event through a custom lane", () => {
    const lanes: TimelineLane[] = [{ id: "dynasties", name: "Dynasties", color: "#123456" }];
    const items: TimelineItem[] = [{
      id: "event-1",
      entryId: null,
      title: "The First Crown",
      startYear: 12,
      endYear: null,
      description: "A sovereign is chosen.",
      color: null,
      category: "dynasties",
    }];

    expect(resolveTimelineItems(items, [], [], lanes)[0]).toMatchObject({
      title: "The First Crown",
      lane: "dynasties",
      color: "#123456",
      entryId: null,
    });
  });

  it("formats both sides of a custom calendar epoch", () => {
    const format = { beforeSuffix: "Before Dawn", afterSuffix: "After Dawn", zeroLabel: "Dawn" };
    expect(formatWorldYear(-12, "en-US", format)).toBe("12 Before Dawn");
    expect(formatWorldYear(0, "en-US", format)).toBe("Dawn");
    expect(formatWorldYear(8, "en-US", format)).toBe("8 After Dawn");
  });
});
