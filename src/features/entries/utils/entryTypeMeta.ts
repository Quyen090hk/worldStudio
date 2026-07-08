import type { EntryType } from "../types";

export type EntryTypeMeta = {
  label: string;
  description: string;
  badgeClassName: string;
  softBgClassName: string;
  borderClassName: string;
  glowClassName: string;
  dotClassName: string;
};

export const entryTypeMetaMap: Record<EntryType, EntryTypeMeta> = {
  Character: {
    label: "Character",
    description: "People, heroes, rivals, witnesses, and named figures.",
    badgeClassName:
      "border-[var(--tone-character-border)] bg-[var(--tone-character-soft)] text-[var(--tone-character)]",
    softBgClassName: "bg-[var(--tone-character-soft)]",
    borderClassName: "border-[var(--tone-character-border)]",
    glowClassName: "ws-glow-character",
    dotClassName: "bg-[var(--tone-character)]",
  },
  Location: {
    label: "Location",
    description: "Cities, ruins, regions, realms, landmarks, and maps.",
    badgeClassName:
      "border-[var(--tone-location-border)] bg-[var(--tone-location-soft)] text-[var(--tone-location)]",
    softBgClassName: "bg-[var(--tone-location-soft)]",
    borderClassName: "border-[var(--tone-location-border)]",
    glowClassName: "ws-glow-location",
    dotClassName: "bg-[var(--tone-location)]",
  },
  Organization: {
    label: "Organization",
    description: "Factions, guilds, kingdoms, orders, and institutions.",
    badgeClassName:
      "border-[var(--tone-organization-border)] bg-[var(--tone-organization-soft)] text-[var(--tone-organization)]",
    softBgClassName: "bg-[var(--tone-organization-soft)]",
    borderClassName: "border-[var(--tone-organization-border)]",
    glowClassName: "ws-glow-organization",
    dotClassName: "bg-[var(--tone-organization)]",
  },
  Item: {
    label: "Item",
    description: "Relics, tools, artifacts, weapons, books, and objects.",
    badgeClassName:
      "border-[var(--tone-item-border)] bg-[var(--tone-item-soft)] text-[var(--tone-item)]",
    softBgClassName: "bg-[var(--tone-item-soft)]",
    borderClassName: "border-[var(--tone-item-border)]",
    glowClassName: "ws-glow-item",
    dotClassName: "bg-[var(--tone-item)]",
  },
  Event: {
    label: "Event",
    description: "Battles, disasters, rituals, meetings, and turning points.",
    badgeClassName:
      "border-[var(--tone-event-border)] bg-[var(--tone-event-soft)] text-[var(--tone-event)]",
    softBgClassName: "bg-[var(--tone-event-soft)]",
    borderClassName: "border-[var(--tone-event-border)]",
    glowClassName: "ws-glow-event",
    dotClassName: "bg-[var(--tone-event)]",
  },
};

export function getEntryTypeMeta(type: EntryType) {
  return entryTypeMetaMap[type];
}