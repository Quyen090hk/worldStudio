export type EntryType =
  | "Character"
  | "Location"
  | "Organization"
  | "Item"
  | "Event";

export type EntryPropertyType =
  | "text"
  | "longText"
  | "select"
  | "entryReference";

export type EntryProperty = {
  id: string;
  key?: string;
  label: string;
  type: EntryPropertyType;
  value: string | string[];
};

export type EntryMedia = {
  primaryAssetId?: string;
  bannerAssetId?: string;
  galleryAssetIds?: string[];
  focalPoint?: { x: number; y: number };
};

export type Entry = {
  id: string;
  title: string;
  type: EntryType;
  summary: string;
  content: string;
  tags: string[];
  properties?: EntryProperty[];
  media?: EntryMedia;
  createdAt: string;
  updatedAt: string;
};

export type EntryInput = {
  title: string;
  type: EntryType;
  summary: string;
  content: string;
  tags: string[];
  properties?: EntryProperty[];
  media?: EntryMedia;
};

export type EntryRevision = {
  id: string;
  entryId: string;
  content: string;
  createdAt: string;
};
