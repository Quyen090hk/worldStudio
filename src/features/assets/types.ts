export type AssetKind =
  | "image"
  | "audio"
  | "video"
  | "document"
  | "other";

export type AssetRecord = {
  id: string;
  name: string;
  mediaType: string;
  kind: AssetKind;
  size: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};
