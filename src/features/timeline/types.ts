export type TimelineCategory =
  | "Politics & Power"
  | "Conflict"
  | "Culture & Faith"
  | "Exploration"
  | "Catastrophe"
  | "Lives"
  | "Other";

export type TimelineCertainty = "canon" | "rumored" | "legendary";

export type TimelineItem = {
  id: string;
  entryId: string;
  startYear: number;
  endYear: number | null;
  description: string;
  color: string | null;
  category?: TimelineCategory;
  importance?: 1 | 2 | 3 | 4 | 5;
  certainty?: TimelineCertainty;
};

export type TimelineItemInput = Omit<TimelineItem, "id">;

export type TimelineViewport = {
  centerYear: number;
  yearsPerScreen: number;
};

export type TimelineEra = {
  id: string;
  name: string;
  startYear: number;
  endYear: number;
  description: string;
  color: string;
};

export type TimelineEraInput = Omit<TimelineEra, "id">;
