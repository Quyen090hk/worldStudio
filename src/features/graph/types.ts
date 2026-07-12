export type RelationshipDirection = "directed" | "mutual";
export type RelationshipStatus = "current" | "former" | "rumored" | "secret";

export type RelationshipType =
  | "Parent of" | "Sibling of" | "Loves" | "Rivals" | "Rules"
  | "Member of" | "Allied with" | "At war with" | "Located in"
  | "Born in" | "Participated in" | "Caused" | "Possesses"
  | "Created by" | "Worships" | "Travels to" | "Custom";

export type EntryRelationship = {
  id: string;
  sourceEntryId: string;
  targetEntryId: string;
  type: RelationshipType;
  inverseLabel: string;
  direction: RelationshipDirection;
  strength: number | null;
  status: RelationshipStatus;
  startYear: number | null;
  endYear: number | null;
  description: string;
  tags: string[];
};

export type RelationshipInput = Omit<EntryRelationship, "id">;

