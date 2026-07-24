export type ManuscriptStatus = "planning" | "drafting" | "revising" | "complete";
export type ManuscriptNodeKind = "volume" | "chapter" | "scene";
export type ManuscriptNodeStatus = "idea" | "outline" | "draft" | "revised" | "final";

export type Manuscript = {
  id: string;
  worldId: string;
  title: string;
  synopsis: string;
  status: ManuscriptStatus;
  targetWordCount: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ManuscriptNode = {
  id: string;
  manuscriptId: string;
  parentId: string | null;
  kind: ManuscriptNodeKind;
  title: string;
  synopsis: string;
  content: string;
  order: number;
  status: ManuscriptNodeStatus;
  povEntryId: string | null;
  characterEntryIds: string[];
  locationEntryIds: string[];
  timelineItemIds: string[];
  createdAt: string;
  updatedAt: string;
};
