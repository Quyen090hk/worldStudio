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
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type EntryInput = {
  title: string;
  type: EntryType;
  summary: string;
  content: string;
  tags: string[];
};

export type EntryRevision = {
  id: string;
  entryId: string;
  content: string;
  createdAt: string;
};
