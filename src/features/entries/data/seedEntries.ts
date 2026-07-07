import type { Entry } from "../types";

export const seedEntries: Entry[] = [
  {
    id: "entry-1",
    title: "Elarion Voss",
    type: "Character",
    summary:
      "A wandering cartographer who maps unstable regions of the Ashen Continent.",
    content:
      "Elarion Voss keeps a weathered journal filled with shifting coastlines, erased kingdoms, and maps that occasionally rewrite themselves.",
    tags: ["cartographer", "traveler", "main cast"],
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-08T10:00:00.000Z",
  },
  {
    id: "entry-2",
    title: "Kethvari Outlook",
    type: "Location",
    summary: "A cliffside settlement built around an ancient signal tower.",
    content:
      "Kethvari Outlook overlooks the north ridge. Its signal tower was built before the current calendar and still glows during ash storms.",
    tags: ["city", "north ridge", "map marker"],
    createdAt: "2026-01-02T10:00:00.000Z",
    updatedAt: "2026-01-07T10:00:00.000Z",
  },
  {
    id: "entry-3",
    title: "The Ember Concord",
    type: "Organization",
    summary:
      "A coalition of archivists, relic hunters, and oath-bound historians.",
    content:
      "The Ember Concord believes history is a living material. Its members recover forbidden records before they decay into myth.",
    tags: ["faction", "archive", "politics"],
    createdAt: "2026-01-03T10:00:00.000Z",
    updatedAt: "2026-01-06T10:00:00.000Z",
  },
  {
    id: "entry-4",
    title: "Moonwell Compass",
    type: "Item",
    summary:
      "A navigational relic that points toward forgotten memories instead of north.",
    content:
      "The Moonwell Compass does not respond to magnetism. It turns toward places where the owner has unresolved memories.",
    tags: ["relic", "magic", "navigation"],
    createdAt: "2026-01-04T10:00:00.000Z",
    updatedAt: "2026-01-05T10:00:00.000Z",
  },
];