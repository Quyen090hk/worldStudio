import type { RelationshipType } from "./types";

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  "Parent of",
  "Sibling of",
  "Loves",
  "Rivals",
  "Rules",
  "Member of",
  "Allied with",
  "At war with",
  "Located in",
  "Born in",
  "Participated in",
  "Caused",
  "Possesses",
  "Created by",
  "Worships",
  "Travels to",
  "Custom",
];

const LEGACY_RELATIONSHIP_TYPES: Record<string, RelationshipType> = {
  "是……的父母": "Parent of",
  兄弟姐妹: "Sibling of",
  爱慕: "Loves",
  对手: "Rivals",
  统治: "Rules",
  属于: "Member of",
  盟友: "Allied with",
  交战: "At war with",
  位于: "Located in",
  出生于: "Born in",
  参与: "Participated in",
  导致: "Caused",
  拥有: "Possesses",
  "由……创造": "Created by",
  崇拜: "Worships",
  前往: "Travels to",
  自定义: "Custom",
};

export function normalizeRelationshipType(value: unknown): RelationshipType {
  if (
    typeof value === "string" &&
    RELATIONSHIP_TYPES.includes(value as RelationshipType)
  )
    return value as RelationshipType;

  return typeof value === "string"
    ? (LEGACY_RELATIONSHIP_TYPES[value] ?? "Custom")
    : "Custom";
}

export function inverseFor(type: RelationshipType) {
  const values: Partial<Record<RelationshipType, string>> = {
    "Parent of": "Child of",
    Rules: "Ruled by",
    "Member of": "Has member",
    "Located in": "Contains",
    "Born in": "Birthplace of",
    "Participated in": "Included",
    Caused: "Caused by",
    Possesses: "Possessed by",
    "Created by": "Created",
    Worships: "Worshipped by",
    "Travels to": "Visited by",
  };
  return values[type] ?? type;
}
