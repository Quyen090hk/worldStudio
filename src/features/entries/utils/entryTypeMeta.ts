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
      "border-violet-400/20 bg-violet-500/15 text-violet-200",
    softBgClassName: "bg-violet-500/10",
    borderClassName: "border-violet-400/20",
    glowClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.24),transparent_34rem)]",
    dotClassName: "bg-violet-300",
  },
  Location: {
    label: "Location",
    description: "Cities, ruins, regions, realms, landmarks, and maps.",
    badgeClassName: "border-cyan-400/20 bg-cyan-500/15 text-cyan-200",
    softBgClassName: "bg-cyan-500/10",
    borderClassName: "border-cyan-400/20",
    glowClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.20),transparent_34rem)]",
    dotClassName: "bg-cyan-300",
  },
  Organization: {
    label: "Organization",
    description: "Factions, guilds, kingdoms, orders, and institutions.",
    badgeClassName:
      "border-amber-400/20 bg-amber-500/15 text-amber-200",
    softBgClassName: "bg-amber-500/10",
    borderClassName: "border-amber-400/20",
    glowClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.20),transparent_34rem)]",
    dotClassName: "bg-amber-300",
  },
  Item: {
    label: "Item",
    description: "Relics, tools, artifacts, weapons, books, and objects.",
    badgeClassName:
      "border-emerald-400/20 bg-emerald-500/15 text-emerald-200",
    softBgClassName: "bg-emerald-500/10",
    borderClassName: "border-emerald-400/20",
    glowClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.20),transparent_34rem)]",
    dotClassName: "bg-emerald-300",
  },
  Event: {
    label: "Event",
    description: "Battles, disasters, rituals, meetings, and turning points.",
    badgeClassName: "border-rose-400/20 bg-rose-500/15 text-rose-200",
    softBgClassName: "bg-rose-500/10",
    borderClassName: "border-rose-400/20",
    glowClassName:
      "bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.20),transparent_34rem)]",
    dotClassName: "bg-rose-300",
  },
};

export function getEntryTypeMeta(type: EntryType) {
  return entryTypeMetaMap[type];
}