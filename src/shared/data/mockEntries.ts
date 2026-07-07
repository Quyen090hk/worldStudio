export type EntryType =
  | "Character"
  | "Location"
  | "Organization"
  | "Item"
  | "Event";

export type Entry = {
  id: string;
  title: string;
  type: EntryType;
  summary: string;
  tags: string[];
  updatedAt: string;
};

export const mockEntries: Entry[] = [
  {
    id: "entry-1",
    title: "Elarion Voss",
    type: "Character",
    summary:
      "A wandering cartographer who maps unstable regions of the Ashen Continent.",
    tags: ["cartographer", "traveler", "main cast"],
    updatedAt: "Today",
  },
  {
    id: "entry-2",
    title: "Kethvari Outlook",
    type: "Location",
    summary: "A cliffside settlement built around an ancient signal tower.",
    tags: ["city", "north ridge", "map marker"],
    updatedAt: "Yesterday",
  },
  {
    id: "entry-3",
    title: "The Ember Concord",
    type: "Organization",
    summary:
      "A coalition of archivists, relic hunters, and oath-bound historians.",
    tags: ["faction", "archive", "politics"],
    updatedAt: "2 days ago",
  },
  {
    id: "entry-4",
    title: "Moonwell Compass",
    type: "Item",
    summary:
      "A navigational relic that points toward forgotten memories instead of north.",
    tags: ["relic", "magic", "navigation"],
    updatedAt: "4 days ago",
  },
];