export type TimelineCategory = string;

export type TimelineLane = {
  id: string;
  name: string;
  color: string;
};

export type WorldYearFormat = {
  beforeSuffix: string;
  afterSuffix: string;
  zeroLabel: string;
};

export type TimelineCertainty = "canon" | "rumored" | "legendary";

export type TimelineItem = {
  id: string;
  entryId: string | null;
  title: string;
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
