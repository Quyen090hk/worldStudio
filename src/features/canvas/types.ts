export type CanvasCardColor = "parchment" | "sage" | "slate" | "rose";

type CanvasCardBase = {
  id: string;
  x: number;
  y: number;
  color: CanvasCardColor;
  createdAt: string;
  updatedAt: string;
};

export type CanvasNoteCard = CanvasCardBase & {
  kind: "note";
  title: string;
  body: string;
};

export type CanvasEntryCard = CanvasCardBase & {
  kind: "entry";
  entryId: string;
};

export type CanvasCard = CanvasNoteCard | CanvasEntryCard;

export type CanvasConnection = {
  id: string;
  fromCardId: string;
  toCardId: string;
  createdAt: string;
};

export type CanvasViewport = {
  zoom: number;
};
