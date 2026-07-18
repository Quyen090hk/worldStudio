import type { EntryPropertyType, EntryType } from "./types";

export type PropertySuggestion = {
  key: string;
  labelKey: string;
  type: EntryPropertyType;
};

const shared: PropertySuggestion[] = [
  { key: "common.status", labelKey: "property.status", type: "select" },
];

export const propertySuggestions: Partial<Record<EntryType, PropertySuggestion[]>> = {
  Character: [
    { key: "character.role", labelKey: "property.role", type: "text" },
    { key: "character.faction", labelKey: "property.faction", type: "entryReference" },
    { key: "character.location", labelKey: "property.location", type: "entryReference" },
    { key: "character.personality", labelKey: "property.personality", type: "longText" },
    { key: "character.motivation", labelKey: "property.motivation", type: "longText" },
    { key: "character.secret", labelKey: "property.secret", type: "longText" },
    ...shared,
  ],
  Location: [
    { key: "location.kind", labelKey: "property.locationKind", type: "text" },
    { key: "location.region", labelKey: "property.region", type: "entryReference" },
    { key: "location.atmosphere", labelKey: "property.atmosphere", type: "longText" },
    { key: "location.inhabitants", labelKey: "property.inhabitants", type: "longText" },
    { key: "location.controller", labelKey: "property.controller", type: "entryReference" },
    { key: "location.danger", labelKey: "property.danger", type: "longText" },
    ...shared,
  ],
  Organization: [
    { key: "organization.kind", labelKey: "property.organizationKind", type: "text" },
    { key: "organization.goal", labelKey: "property.goal", type: "longText" },
    { key: "organization.leader", labelKey: "property.leader", type: "entryReference" },
    { key: "organization.headquarters", labelKey: "property.headquarters", type: "entryReference" },
    { key: "organization.ideology", labelKey: "property.ideology", type: "longText" },
    { key: "organization.color", labelKey: "property.representativeColor", type: "text" },
    ...shared,
  ],
};

export function hasPropertyValue(value: string | string[]) {
  return Array.isArray(value) ? value.length > 0 : value.trim().length > 0;
}
