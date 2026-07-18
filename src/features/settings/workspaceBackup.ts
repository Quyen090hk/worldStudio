import { MAX_ASSET_BYTES, ASSET_KINDS } from "../assets/assetModel";
import {
  loadAssetFile,
  removeAssetFile,
  saveAssetFile,
} from "../assets/assetStorage";
import { useAssetStore } from "../assets/stores/useAssetStore";
import type { AssetKind, AssetRecord } from "../assets/types";
import { sanitizeCanvasData } from "../canvas/canvasModel";
import { useCanvasStore } from "../canvas/stores/useCanvasStore";
import type {
  CanvasCard,
  CanvasCardColor,
  CanvasConnection,
  CanvasViewport,
} from "../canvas/types";
import type { Entry, EntryRevision, EntryType } from "../entries/types";
import { useEntryStore } from "../entries/stores/useEntryStore";
import type {
  EntryRelationship,
  RelationshipDirection,
  RelationshipStatus,
  RelationshipType,
} from "../graph/types";
import { RELATIONSHIP_TYPES } from "../graph/relationshipMeta";
import {
  useGraphSettingsStore,
  type GraphSettings,
} from "../graph/stores/useGraphSettingsStore";
import { useRelationshipStore } from "../graph/stores/useRelationshipStore";
import type {
  ConnectionType,
  MapConnection,
  MapLayer,
  MapMarker,
  MapScale,
  MarkerCategory,
  WorldMap,
} from "../map/types";
import { useMapStore } from "../map/stores/useMapStore";
import {
  loadMapImage,
  removeMapImage,
  saveMapImage,
} from "../map/utils/mapImageStorage";
import type {
  TimelineCertainty,
  TimelineEra,
  TimelineItem,
  TimelineLane,
  TimelineViewport,
  WorldYearFormat,
} from "../timeline/types";
import { DEFAULT_TIMELINE_LANES, DEFAULT_WORLD_YEAR_FORMAT } from "../timeline/timelineModel";
import { useTimelineStore } from "../timeline/stores/useTimelineStore";
import { useWorldStore } from "../world/stores/useWorldStore";
import type { WorldProfile } from "../world/types";
import {
  MAX_WORLD_DESCRIPTION_LENGTH,
  MAX_WORLD_NAME_LENGTH,
  createDefaultWorldProfile,
  removeLegacyDefaultWorldDescription,
} from "../world/worldModel";

export const WORKSPACE_BACKUP_FORMAT = "world-studio-backup";
export const WORKSPACE_BACKUP_VERSION = 6;
export const MAX_BACKUP_FILE_BYTES = 250 * 1024 * 1024;
const MAX_MAP_IMAGE_BYTES = 15 * 1024 * 1024;

type WorkspaceMapImage = {
  mapId: string;
  name: string;
  type: string;
  dataUrl: string;
};

type WorkspaceAssetFile = {
  assetId: string;
  type: string;
  dataUrl: string;
};

export type WorkspaceBackupData = {
  world: WorldProfile;
  entries: Entry[];
  revisions: EntryRevision[];
  relationships: EntryRelationship[];
  timeline: {
    items: TimelineItem[];
    eras: TimelineEra[];
    lanes: TimelineLane[];
    yearFormat: WorldYearFormat;
    viewport: TimelineViewport;
  };
  atlas: {
    maps: WorldMap[];
    activeMapId: string;
    layers: MapLayer[];
    markers: MapMarker[];
    connections: MapConnection[];
    images: WorkspaceMapImage[];
  };
  assetLibrary: {
    items: AssetRecord[];
    files: WorkspaceAssetFile[];
  };
  canvas: {
    cards: CanvasCard[];
    connections: CanvasConnection[];
    viewport: CanvasViewport;
  };
  graphSettings: GraphSettings;
};

export type WorkspaceBackup = {
  format: typeof WORKSPACE_BACKUP_FORMAT;
  version: typeof WORKSPACE_BACKUP_VERSION;
  /** Snapshots reference binary object stores; portable backups embed them. */
  storage?: "portable" | "snapshot";
  exportedAt: string;
  data: WorkspaceBackupData;
};

export type WorkspaceBackupErrorCode =
  | "invalid-json"
  | "invalid-format"
  | "unsupported-version"
  | "invalid-data"
  | "image-too-large"
  | "asset-too-large";

export class WorkspaceBackupError extends Error {
  readonly code: WorkspaceBackupErrorCode;

  constructor(code: WorkspaceBackupErrorCode, message: string) {
    super(message);
    this.name = "WorkspaceBackupError";
    this.code = code;
  }
}

const ENTRY_TYPES: EntryType[] = [
  "Character",
  "Location",
  "Organization",
  "Item",
  "Event",
];
const RELATIONSHIP_DIRECTIONS: RelationshipDirection[] = [
  "directed",
  "mutual",
];
const RELATIONSHIP_STATUSES: RelationshipStatus[] = [
  "current",
  "former",
  "rumored",
  "secret",
];
const TIMELINE_CERTAINTIES: TimelineCertainty[] = [
  "canon",
  "rumored",
  "legendary",
];
const MAP_SCALES: MapScale[] = [
  "World",
  "Continent",
  "Region",
  "City",
  "Dungeon",
  "Other",
];
const MARKER_CATEGORIES: MarkerCategory[] = [
  "Settlement",
  "Capital",
  "Kingdom",
  "Landmark",
  "Ruin",
  "Dungeon",
  "Event",
  "Battle",
  "Character",
  "Faction",
  "Quest",
  "Religion",
  "Resource",
  "Transport",
  "Geography",
  "Custom",
];
const CONNECTION_TYPES: ConnectionType[] = [
  "Road",
  "Trade route",
  "River",
  "Border",
  "Migration",
  "Campaign",
  "Journey",
  "Alliance",
  "Custom",
];
const MARKER_SIZES: MapMarker["size"][] = ["Small", "Medium", "Large"];
const CANVAS_CARD_COLORS: CanvasCardColor[] = [
  "parchment",
  "sage",
  "slate",
  "rose",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isEntry(value: unknown): value is Entry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    ENTRY_TYPES.includes(value.type as EntryType) &&
    typeof value.summary === "string" &&
    typeof value.content === "string" &&
    isStringArray(value.tags) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (value.properties === undefined ||
      (Array.isArray(value.properties) && value.properties.every(isEntryProperty))) &&
    (value.media === undefined || isEntryMedia(value.media))
  );
}

function isEntryProperty(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    ["text", "longText", "select", "entryReference"].includes(String(value.type)) &&
    (typeof value.value === "string" || isStringArray(value.value))
  );
}

function isEntryMedia(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    (value.primaryAssetId === undefined || typeof value.primaryAssetId === "string") &&
    (value.bannerAssetId === undefined || typeof value.bannerAssetId === "string") &&
    (value.galleryAssetIds === undefined || isStringArray(value.galleryAssetIds)) &&
    (value.focalPoint === undefined ||
      (isRecord(value.focalPoint) &&
        isFiniteNumber(value.focalPoint.x) &&
        isFiniteNumber(value.focalPoint.y)))
  );
}

function isEntryRevision(value: unknown): value is EntryRevision {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.entryId === "string" &&
    typeof value.content === "string" &&
    typeof value.createdAt === "string"
  );
}

function isWorldProfile(value: unknown): value is WorldProfile {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    value.name.length <= MAX_WORLD_NAME_LENGTH &&
    typeof value.description === "string" &&
    value.description.length <= MAX_WORLD_DESCRIPTION_LENGTH &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isRelationship(value: unknown): value is EntryRelationship {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.sourceEntryId === "string" &&
    typeof value.targetEntryId === "string" &&
    RELATIONSHIP_TYPES.includes(value.type as RelationshipType) &&
    typeof value.inverseLabel === "string" &&
    RELATIONSHIP_DIRECTIONS.includes(
      value.direction as RelationshipDirection,
    ) &&
    (value.strength === null || isFiniteNumber(value.strength)) &&
    RELATIONSHIP_STATUSES.includes(value.status as RelationshipStatus) &&
    isNullableNumber(value.startYear) &&
    isNullableNumber(value.endYear) &&
    typeof value.description === "string" &&
    isStringArray(value.tags)
  );
}

function isTimelineItem(value: unknown): value is TimelineItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.entryId === null || typeof value.entryId === "string") &&
    typeof value.title === "string" &&
    isFiniteNumber(value.startYear) &&
    isNullableNumber(value.endYear) &&
    typeof value.description === "string" &&
    (value.color === null || typeof value.color === "string") &&
    (value.category === undefined || typeof value.category === "string") &&
    (value.importance === undefined ||
      ([1, 2, 3, 4, 5] as number[]).includes(value.importance as number)) &&
    (value.certainty === undefined ||
      TIMELINE_CERTAINTIES.includes(value.certainty as TimelineCertainty))
  );
}

function isTimelineLane(value: unknown): value is TimelineLane {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string" && typeof value.color === "string";
}

function isWorldYearFormat(value: unknown): value is WorldYearFormat {
  return isRecord(value) && typeof value.beforeSuffix === "string" && typeof value.afterSuffix === "string" && typeof value.zeroLabel === "string";
}

function isTimelineEra(value: unknown): value is TimelineEra {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isFiniteNumber(value.startYear) &&
    isFiniteNumber(value.endYear) &&
    typeof value.description === "string" &&
    typeof value.color === "string"
  );
}

function isTimelineViewport(value: unknown): value is TimelineViewport {
  return (
    isRecord(value) &&
    isFiniteNumber(value.centerYear) &&
    isFiniteNumber(value.yearsPerScreen) &&
    value.yearsPerScreen > 0
  );
}

function isWorldMap(value: unknown): value is WorldMap {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    MAP_SCALES.includes(value.scale as MapScale) &&
    typeof value.description === "string" &&
    typeof value.createdAt === "string"
  );
}

function isMapLayer(value: unknown): value is MapLayer {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.mapId === "string" &&
    typeof value.name === "string" &&
    typeof value.color === "string" &&
    typeof value.visible === "boolean"
  );
}

function isMapMarker(value: unknown): value is MapMarker {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.mapId === "string" &&
    typeof value.layerId === "string" &&
    isStringArray(value.entryIds) &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    MARKER_CATEGORIES.includes(value.category as MarkerCategory) &&
    isFiniteNumber(value.x) &&
    value.x >= 0 &&
    value.x <= 100 &&
    isFiniteNumber(value.y) &&
    value.y >= 0 &&
    value.y <= 100 &&
    typeof value.color === "string" &&
    MARKER_SIZES.includes(value.size as MapMarker["size"]) &&
    isNullableNumber(value.startYear) &&
    isNullableNumber(value.endYear)
  );
}

function isMapConnection(value: unknown): value is MapConnection {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.mapId === "string" &&
    typeof value.fromMarkerId === "string" &&
    typeof value.toMarkerId === "string" &&
    CONNECTION_TYPES.includes(value.type as ConnectionType) &&
    typeof value.label === "string" &&
    typeof value.color === "string" &&
    typeof value.dashed === "boolean"
  );
}

function isMapImage(value: unknown): value is WorkspaceMapImage {
  return (
    isRecord(value) &&
    typeof value.mapId === "string" &&
    typeof value.name === "string" &&
    typeof value.type === "string" &&
    value.type.startsWith("image/") &&
    typeof value.dataUrl === "string" &&
    value.dataUrl.startsWith("data:image/")
  );
}

function isAssetRecord(value: unknown): value is AssetRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.mediaType === "string" &&
    ASSET_KINDS.includes(value.kind as AssetKind) &&
    isFiniteNumber(value.size) &&
    value.size >= 0 &&
    value.size <= MAX_ASSET_BYTES &&
    isStringArray(value.tags) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isAssetFile(value: unknown): value is WorkspaceAssetFile {
  return (
    isRecord(value) &&
    typeof value.assetId === "string" &&
    typeof value.type === "string" &&
    typeof value.dataUrl === "string" &&
    value.dataUrl.startsWith("data:")
  );
}

function isCanvasCard(value: unknown): value is CanvasCard {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !CANVAS_CARD_COLORS.includes(value.color as CanvasCardColor) ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return false;
  }
  if (value.kind === "entry") return typeof value.entryId === "string";
  return (
    value.kind === "note" &&
    typeof value.title === "string" &&
    typeof value.body === "string"
  );
}

function isCanvasConnection(value: unknown): value is CanvasConnection {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.fromCardId === "string" &&
    typeof value.toCardId === "string" &&
    typeof value.createdAt === "string"
  );
}

function isCanvasViewport(value: unknown): value is CanvasViewport {
  return (
    isRecord(value) &&
    isFiniteNumber(value.zoom) &&
    value.zoom >= 0.6 &&
    value.zoom <= 1.4
  );
}

function isGraphSettings(value: unknown): value is GraphSettings {
  return (
    isRecord(value) &&
    Array.isArray(value.visibleTypes) &&
    value.visibleTypes.every((type) => ENTRY_TYPES.includes(type as EntryType)) &&
    typeof value.showSecrets === "boolean" &&
    typeof value.showOrphans === "boolean" &&
    isFiniteNumber(value.nodeRepulsion) &&
    isFiniteNumber(value.linkDistance) &&
    isFiniteNumber(value.linkElasticity) &&
    isFiniteNumber(value.centerGravity) &&
    isFiniteNumber(value.animationDuration) &&
    Array.isArray(value.groups) &&
    value.groups.every(
      (group) =>
        isRecord(group) &&
        typeof group.id === "string" &&
        typeof group.query === "string" &&
        typeof group.color === "string",
    )
  );
}

function assertUniqueIds(items: Array<{ id: string }>, label: string) {
  const ids = new Set(items.map((item) => item.id));
  if (ids.size !== items.length || items.some((item) => !item.id)) {
    throw new WorkspaceBackupError(
      "invalid-data",
      `${label} contains missing or duplicate IDs`,
    );
  }
}

function validateReferences(
  data: WorkspaceBackupData,
  allowExternalAssetFiles = false,
) {
  assertUniqueIds(data.entries, "Entries");
  assertUniqueIds(data.revisions, "Entry revisions");
  assertUniqueIds(data.relationships, "Relationships");
  assertUniqueIds(data.timeline.items, "Timeline items");
  assertUniqueIds(data.timeline.eras, "Timeline eras");
  assertUniqueIds(data.timeline.lanes, "Timeline lanes");
  assertUniqueIds(data.atlas.maps, "Maps");
  assertUniqueIds(data.atlas.layers, "Map layers");
  assertUniqueIds(data.atlas.markers, "Map markers");
  assertUniqueIds(data.atlas.connections, "Map connections");
  assertUniqueIds(data.assetLibrary.items, "Assets");
  assertUniqueIds(data.canvas.cards, "Canvas cards");
  assertUniqueIds(data.canvas.connections, "Canvas connections");

  const entryIds = new Set(data.entries.map((entry) => entry.id));
  const timelineLaneIds = new Set(data.timeline.lanes.map((lane) => lane.id));
  const mapIds = new Set(data.atlas.maps.map((map) => map.id));
  const layersById = new Map(
    data.atlas.layers.map((layer) => [layer.id, layer]),
  );
  const markersById = new Map(
    data.atlas.markers.map((marker) => [marker.id, marker]),
  );

  if (!data.atlas.maps.length || !mapIds.has(data.atlas.activeMapId)) {
    throw new WorkspaceBackupError(
      "invalid-data",
      "The backup must contain a valid active map",
    );
  }
  if (
    data.relationships.some(
      (relationship) =>
        !entryIds.has(relationship.sourceEntryId) ||
        !entryIds.has(relationship.targetEntryId),
    ) ||
    data.timeline.items.some((item) =>
      (item.entryId !== null && !entryIds.has(item.entryId)) ||
      (item.category !== undefined && !timelineLaneIds.has(item.category)),
    ) ||
    data.revisions.some((revision) => !entryIds.has(revision.entryId))
  ) {
    throw new WorkspaceBackupError(
      "invalid-data",
      "The backup contains orphaned entry references",
    );
  }
  if (data.atlas.layers.some((layer) => !mapIds.has(layer.mapId))) {
    throw new WorkspaceBackupError(
      "invalid-data",
      "The backup contains orphaned map layers",
    );
  }
  if (
    data.atlas.markers.some(
      (marker) => {
        const layer = layersById.get(marker.layerId);
        return (
          !mapIds.has(marker.mapId) ||
          !layer ||
          layer.mapId !== marker.mapId ||
          marker.entryIds.some((entryId) => !entryIds.has(entryId))
        );
      },
    )
  ) {
    throw new WorkspaceBackupError(
      "invalid-data",
      "The backup contains orphaned map markers",
    );
  }
  if (
    data.atlas.connections.some((connection) => {
      const from = markersById.get(connection.fromMarkerId);
      const to = markersById.get(connection.toMarkerId);
      return (
        !mapIds.has(connection.mapId) ||
        !from ||
        !to ||
        from.mapId !== connection.mapId ||
        to.mapId !== connection.mapId
      );
    })
  ) {
    throw new WorkspaceBackupError(
      "invalid-data",
      "The backup contains orphaned map connections",
    );
  }

  const imageMapIds = data.atlas.images.map((image) => image.mapId);
  if (
    new Set(imageMapIds).size !== imageMapIds.length ||
    imageMapIds.some((mapId) => !mapIds.has(mapId))
  ) {
    throw new WorkspaceBackupError(
      "invalid-data",
      "The backup contains invalid map images",
    );
  }

  const assetIds = new Set(data.assetLibrary.items.map((asset) => asset.id));
  const fileAssetIds = data.assetLibrary.files.map((file) => file.assetId);
  if (
    new Set(fileAssetIds).size !== fileAssetIds.length ||
    fileAssetIds.some((assetId) => !assetIds.has(assetId)) ||
    (!allowExternalAssetFiles && data.assetLibrary.items.some(
      (asset) => !fileAssetIds.includes(asset.id),
    )) ||
    data.assetLibrary.files.some((file) => {
      const asset = data.assetLibrary.items.find(
        (item) => item.id === file.assetId,
      );
      return !asset || file.type !== asset.mediaType;
    })
  ) {
    throw new WorkspaceBackupError(
      "invalid-data",
      "The backup contains invalid asset files",
    );
  }

  const canvasCardIds = new Set(data.canvas.cards.map((card) => card.id));
  if (
    data.canvas.cards.some(
      (card) => card.kind === "entry" && !entryIds.has(card.entryId),
    ) ||
    data.canvas.connections.some(
      (connection) =>
        connection.fromCardId === connection.toCardId ||
        !canvasCardIds.has(connection.fromCardId) ||
        !canvasCardIds.has(connection.toCardId),
    )
  ) {
    throw new WorkspaceBackupError(
      "invalid-data",
      "The backup contains invalid canvas references",
    );
  }
}

function validateWorkspaceBackupObject(value: unknown): WorkspaceBackup {
  if (!isRecord(value) || value.format !== WORKSPACE_BACKUP_FORMAT) {
    throw new WorkspaceBackupError(
      "invalid-format",
      "This file is not a World Studio backup",
    );
  }
  if (
    value.version !== 1 &&
    value.version !== 2 &&
    value.version !== 3 &&
    value.version !== 4 &&
    value.version !== WORKSPACE_BACKUP_VERSION
  ) {
    throw new WorkspaceBackupError(
      "unsupported-version",
      "This backup version is not supported",
    );
  }
  const emptyCanvas = {
    cards: [],
    connections: [],
    viewport: { zoom: 1 },
  };
  const defaultWorld = createDefaultWorldProfile();
  const migratedValue =
    value.version === 1 && isRecord(value.data)
      ? {
          ...value,
          version: WORKSPACE_BACKUP_VERSION,
          data: {
            ...value.data,
            assetLibrary: { items: [], files: [] },
            canvas: emptyCanvas,
            world: defaultWorld,
            revisions: [],
          },
        }
      : value.version === 2 && isRecord(value.data)
        ? {
            ...value,
            version: WORKSPACE_BACKUP_VERSION,
            data: {
              ...value.data,
              canvas: emptyCanvas,
              world: defaultWorld,
              revisions: [],
            },
          }
        : value.version === 3 && isRecord(value.data)
          ? {
              ...value,
              version: WORKSPACE_BACKUP_VERSION,
              data: { ...value.data, world: defaultWorld, revisions: [] },
            }
          : value.version === 4 && isRecord(value.data)
            ? {
                ...value,
                version: WORKSPACE_BACKUP_VERSION,
                data: { ...value.data, revisions: [] },
              }
            : value;

  const normalizedValue = isRecord(migratedValue.data) && isRecord(migratedValue.data.timeline)
    ? {
        ...migratedValue,
        version: WORKSPACE_BACKUP_VERSION,
        data: {
          ...migratedValue.data,
          timeline: {
            ...migratedValue.data.timeline,
            items: Array.isArray(migratedValue.data.timeline.items)
              ? migratedValue.data.timeline.items.map((item) => isRecord(item) ? { title: "", ...item } : item)
              : migratedValue.data.timeline.items,
            lanes: Array.isArray(migratedValue.data.timeline.lanes)
              ? migratedValue.data.timeline.lanes
              : DEFAULT_TIMELINE_LANES.map((lane) => ({ ...lane })),
            yearFormat: isRecord(migratedValue.data.timeline.yearFormat)
              ? migratedValue.data.timeline.yearFormat
              : { ...DEFAULT_WORLD_YEAR_FORMAT },
          },
        },
      }
    : migratedValue;

  if (
    typeof normalizedValue.exportedAt !== "string" ||
    (normalizedValue.storage !== undefined &&
      normalizedValue.storage !== "portable" &&
      normalizedValue.storage !== "snapshot") ||
    !isRecord(normalizedValue.data)
  ) {
    throw new WorkspaceBackupError("invalid-data", "Invalid backup metadata");
  }

  const { data } = normalizedValue;
  if (
    !isWorldProfile(data.world) ||
    !Array.isArray(data.entries) ||
    !data.entries.every(isEntry) ||
    !Array.isArray(data.revisions) ||
    !data.revisions.every(isEntryRevision) ||
    !Array.isArray(data.relationships) ||
    !data.relationships.every(isRelationship) ||
    !isRecord(data.timeline) ||
    !Array.isArray(data.timeline.items) ||
    !data.timeline.items.every(isTimelineItem) ||
    !Array.isArray(data.timeline.eras) ||
    !data.timeline.eras.every(isTimelineEra) ||
    !Array.isArray(data.timeline.lanes) ||
    !data.timeline.lanes.length ||
    !data.timeline.lanes.every(isTimelineLane) ||
    !isWorldYearFormat(data.timeline.yearFormat) ||
    !isTimelineViewport(data.timeline.viewport) ||
    !isRecord(data.atlas) ||
    !Array.isArray(data.atlas.maps) ||
    !data.atlas.maps.every(isWorldMap) ||
    typeof data.atlas.activeMapId !== "string" ||
    !Array.isArray(data.atlas.layers) ||
    !data.atlas.layers.every(isMapLayer) ||
    !Array.isArray(data.atlas.markers) ||
    !data.atlas.markers.every(isMapMarker) ||
    !Array.isArray(data.atlas.connections) ||
    !data.atlas.connections.every(isMapConnection) ||
    !Array.isArray(data.atlas.images) ||
    !data.atlas.images.every(isMapImage) ||
    !isRecord(data.assetLibrary) ||
    !Array.isArray(data.assetLibrary.items) ||
    !data.assetLibrary.items.every(isAssetRecord) ||
    !Array.isArray(data.assetLibrary.files) ||
    !data.assetLibrary.files.every(isAssetFile) ||
    !isRecord(data.canvas) ||
    !Array.isArray(data.canvas.cards) ||
    !data.canvas.cards.every(isCanvasCard) ||
    !Array.isArray(data.canvas.connections) ||
    !data.canvas.connections.every(isCanvasConnection) ||
    !isCanvasViewport(data.canvas.viewport) ||
    !isGraphSettings(data.graphSettings)
  ) {
    throw new WorkspaceBackupError(
      "invalid-data",
      "The backup contains invalid workspace data",
    );
  }

  const backup = normalizedValue as WorkspaceBackup;
  validateReferences(backup.data, backup.storage === "snapshot");
  return backup;
}

export function parseWorkspaceBackup(serialized: string) {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new WorkspaceBackupError("invalid-json", "Invalid JSON");
  }
  return validateWorkspaceBackupObject(value);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function snapshotGraphSettings(): GraphSettings {
  const state = useGraphSettingsStore.getState();
  return {
    visibleTypes: [...state.visibleTypes],
    showSecrets: state.showSecrets,
    showOrphans: state.showOrphans,
    nodeRepulsion: state.nodeRepulsion,
    linkDistance: state.linkDistance,
    linkElasticity: state.linkElasticity,
    centerGravity: state.centerGravity,
    animationDuration: state.animationDuration,
    groups: state.groups.map((group) => ({ ...group })),
  };
}

export function sanitizeWorkspaceData(
  data: WorkspaceBackupData,
  options: { preserveExternalAssetFiles?: boolean } = {},
): WorkspaceBackupData {
  const entryIds = new Set(data.entries.map((entry) => entry.id));
  const mapIds = new Set(data.atlas.maps.map((map) => map.id));
  const layers = data.atlas.layers.filter((layer) => mapIds.has(layer.mapId));
  const layersById = new Map(layers.map((layer) => [layer.id, layer]));
  const markers = data.atlas.markers
    .filter((marker) => {
      const layer = layersById.get(marker.layerId);
      return mapIds.has(marker.mapId) && layer?.mapId === marker.mapId;
    })
    .map((marker) => ({
      ...marker,
      entryIds: marker.entryIds.filter((entryId) => entryIds.has(entryId)),
    }));
  const markersById = new Map(markers.map((marker) => [marker.id, marker]));
  const assetFileIds = new Set(
    data.assetLibrary.files.map((file) => file.assetId),
  );
  const assetItems = options.preserveExternalAssetFiles
    ? data.assetLibrary.items
    : data.assetLibrary.items.filter((asset) => assetFileIds.has(asset.id));
  const assetIds = new Set(assetItems.map((asset) => asset.id));
  const canvasCards = data.canvas.cards.filter(
    (card) => card.kind === "note" || entryIds.has(card.entryId),
  );
  const canvas = sanitizeCanvasData(canvasCards, data.canvas.connections);

  return {
    ...data,
    revisions: data.revisions.filter((revision) => entryIds.has(revision.entryId)),
    relationships: data.relationships.filter(
      (relationship) =>
        entryIds.has(relationship.sourceEntryId) &&
        entryIds.has(relationship.targetEntryId),
    ),
    timeline: {
      ...data.timeline,
      items: data.timeline.items.filter((item) => item.entryId === null || entryIds.has(item.entryId)),
    },
    atlas: {
      ...data.atlas,
      activeMapId: mapIds.has(data.atlas.activeMapId)
        ? data.atlas.activeMapId
        : (data.atlas.maps[0]?.id ?? ""),
      layers,
      markers,
      connections: data.atlas.connections.filter((connection) => {
        const from = markersById.get(connection.fromMarkerId);
        const to = markersById.get(connection.toMarkerId);
        return (
          mapIds.has(connection.mapId) &&
          from?.mapId === connection.mapId &&
          to?.mapId === connection.mapId
        );
      }),
      images: data.atlas.images.filter((image) => mapIds.has(image.mapId)),
    },
    assetLibrary: {
      items: assetItems,
      files: data.assetLibrary.files.filter((file) =>
        assetIds.has(file.assetId),
      ),
    },
    canvas: {
      ...canvas,
      viewport: data.canvas.viewport,
    },
  };
}

async function createWorkspacePackage(includeBinaryFiles: boolean): Promise<WorkspaceBackup> {
  const entryState = useEntryStore.getState();
  const relationshipState = useRelationshipStore.getState();
  const timelineState = useTimelineStore.getState();
  const mapState = useMapStore.getState();
  const assetState = useAssetStore.getState();
  const canvasState = useCanvasStore.getState();
  const images: WorkspaceMapImage[] = [];
  const assetItems: AssetRecord[] = [...assetState.assets];
  const assetFiles: WorkspaceAssetFile[] = [];

  for (const map of includeBinaryFiles ? mapState.maps : []) {
    const image = await loadMapImage(map.id);
    if (!image) continue;
    images.push({
      mapId: map.id,
      name: map.name,
      type: image.type || "image/png",
      dataUrl: await blobToDataUrl(image),
    });
  }

  for (const asset of includeBinaryFiles ? assetState.assets : []) {
    const file = await loadAssetFile(asset.id);
    if (!file) continue;
    assetFiles.push({
      assetId: asset.id,
      type: asset.mediaType,
      dataUrl: await blobToDataUrl(file),
    });
  }

  const data = sanitizeWorkspaceData({
    world: useWorldStore.getState().profile,
    entries: entryState.entries,
    revisions: entryState.revisions,
    relationships: relationshipState.relationships,
    timeline: {
      items: timelineState.items,
      eras: timelineState.eras,
      lanes: timelineState.lanes,
      yearFormat: timelineState.yearFormat,
      viewport: timelineState.viewport,
    },
    atlas: {
      maps: mapState.maps,
      activeMapId: mapState.activeMapId,
      layers: mapState.layers,
      markers: mapState.markers,
      connections: mapState.connections,
      images,
    },
    assetLibrary: {
      items: assetItems,
      files: assetFiles,
    },
    canvas: {
      cards: canvasState.cards,
      connections: canvasState.connections,
      viewport: canvasState.viewport,
    },
    graphSettings: snapshotGraphSettings(),
  }, { preserveExternalAssetFiles: !includeBinaryFiles });

  return validateWorkspaceBackupObject({
    format: WORKSPACE_BACKUP_FORMAT,
    version: WORKSPACE_BACKUP_VERSION,
    storage: includeBinaryFiles ? "portable" : "snapshot",
    exportedAt: new Date().toISOString(),
    data,
  });
}

/** Full portable backup, including binary files encoded for export. */
export function createWorkspaceBackup(): Promise<WorkspaceBackup> {
  return createWorkspacePackage(true);
}

/** Fast internal snapshot. Binary files remain in IndexedDB and are not copied. */
export function createWorkspaceSnapshot(): Promise<WorkspaceBackup> {
  return createWorkspacePackage(false);
}

export function serializeWorkspaceBackup(backup: WorkspaceBackup) {
  return JSON.stringify(backup, null, 2);
}

async function decodeMapImages(images: WorkspaceMapImage[]) {
  const decoded = new Map<string, Blob>();
  for (const image of images) {
    const response = await fetch(image.dataUrl);
    const blob = await response.blob();
    if (!blob.type.startsWith("image/") || blob.size > MAX_MAP_IMAGE_BYTES) {
      throw new WorkspaceBackupError(
        "image-too-large",
        "A map image is invalid or exceeds 15 MB",
      );
    }
    decoded.set(image.mapId, blob);
  }
  return decoded;
}

async function decodeAssetFiles(data: WorkspaceBackupData["assetLibrary"]) {
  const decoded = new Map<string, Blob>();
  const assetsById = new Map(data.items.map((asset) => [asset.id, asset]));

  for (const file of data.files) {
    const response = await fetch(file.dataUrl);
    const blob = await response.blob();
    const asset = assetsById.get(file.assetId);
    if (
      !asset ||
      blob.size !== asset.size ||
      blob.size > MAX_ASSET_BYTES ||
      blob.type !== asset.mediaType
    ) {
      throw new WorkspaceBackupError(
        "asset-too-large",
        "An asset file is invalid or exceeds 25 MB",
      );
    }
    decoded.set(file.assetId, blob);
  }

  return decoded;
}

async function readCurrentMapImages(mapIds: string[]) {
  const images = new Map<string, Blob>();
  for (const mapId of mapIds) {
    const image = await loadMapImage(mapId);
    if (image) images.set(mapId, image);
  }
  return images;
}

async function readCurrentAssetFiles(assetIds: string[]) {
  const files = new Map<string, Blob>();
  for (const assetId of assetIds) {
    const file = await loadAssetFile(assetId);
    if (file) files.set(assetId, file);
  }
  return files;
}

async function replaceMapImages(
  mapIdsToClear: Iterable<string>,
  images: Map<string, Blob>,
) {
  for (const mapId of mapIdsToClear) await removeMapImage(mapId);
  for (const [mapId, image] of images) await saveMapImage(mapId, image);
}

async function replaceAssetFiles(
  assetIdsToClear: Iterable<string>,
  files: Map<string, Blob>,
) {
  for (const assetId of assetIdsToClear) await removeAssetFile(assetId);
  for (const [assetId, file] of files) await saveAssetFile(assetId, file);
}

function applyWorkspaceData(data: WorkspaceBackupData) {
  useWorldStore.setState({
    profile: {
      ...data.world,
      description: removeLegacyDefaultWorldDescription(data.world.description),
    },
  });
  useEntryStore.setState({
    entries: data.entries,
    revisions: data.revisions,
    drawerOpen: false,
    editingEntryId: null,
  });
  useRelationshipStore.setState({ relationships: data.relationships });
  useTimelineStore.setState({
    items: data.timeline.items,
    eras: data.timeline.eras,
    lanes: data.timeline.lanes,
    yearFormat: data.timeline.yearFormat,
    viewport: data.timeline.viewport,
  });
  useMapStore.setState({
    maps: data.atlas.maps,
    activeMapId: data.atlas.activeMapId,
    layers: data.atlas.layers,
    markers: data.atlas.markers,
    connections: data.atlas.connections,
  });
  useAssetStore.setState({ assets: data.assetLibrary.items });
  useCanvasStore.setState({
    cards: data.canvas.cards,
    connections: data.canvas.connections,
    viewport: data.canvas.viewport,
  });
  useGraphSettingsStore.setState(data.graphSettings);
}

/** Restores an internal world snapshot without rewriting binary object stores. */
export function restoreWorkspaceSnapshot(snapshot: WorkspaceBackup) {
  const normalized = validateWorkspaceBackupObject(snapshot);
  applyWorkspaceData(normalized.data);
}

export async function restoreWorkspaceBackup(backup: WorkspaceBackup) {
  const normalizedBackup = validateWorkspaceBackupObject(backup);
  const replacementImages = await decodeMapImages(normalizedBackup.data.atlas.images);
  const replacementAssetFiles = await decodeAssetFiles(
    normalizedBackup.data.assetLibrary,
  );

  const currentMapState = useMapStore.getState();
  const currentAssetState = useAssetStore.getState();
  const currentData: WorkspaceBackupData = {
    world: useWorldStore.getState().profile,
    entries: useEntryStore.getState().entries,
    revisions: useEntryStore.getState().revisions,
    relationships: useRelationshipStore.getState().relationships,
    timeline: {
      items: useTimelineStore.getState().items,
      eras: useTimelineStore.getState().eras,
      lanes: useTimelineStore.getState().lanes,
      yearFormat: useTimelineStore.getState().yearFormat,
      viewport: useTimelineStore.getState().viewport,
    },
    atlas: {
      maps: currentMapState.maps,
      activeMapId: currentMapState.activeMapId,
      layers: currentMapState.layers,
      markers: currentMapState.markers,
      connections: currentMapState.connections,
      images: [],
    },
    assetLibrary: {
      items: currentAssetState.assets,
      files: [],
    },
    canvas: {
      cards: useCanvasStore.getState().cards,
      connections: useCanvasStore.getState().connections,
      viewport: useCanvasStore.getState().viewport,
    },
    graphSettings: snapshotGraphSettings(),
  };
  const currentImages = await readCurrentMapImages(
    currentMapState.maps.map((map) => map.id),
  );
  const allMapIds = new Set([
    ...currentMapState.maps.map((map) => map.id),
    ...normalizedBackup.data.atlas.maps.map((map) => map.id),
  ]);
  const currentAssetFiles = await readCurrentAssetFiles(
    currentAssetState.assets.map((asset) => asset.id),
  );
  const allAssetIds = new Set([
    ...currentAssetState.assets.map((asset) => asset.id),
    ...normalizedBackup.data.assetLibrary.items.map((asset) => asset.id),
  ]);

  try {
    await replaceMapImages(allMapIds, replacementImages);
    await replaceAssetFiles(allAssetIds, replacementAssetFiles);
    applyWorkspaceData(normalizedBackup.data);
  } catch (error) {
    await Promise.allSettled([
      replaceMapImages(allMapIds, currentImages),
      replaceAssetFiles(allAssetIds, currentAssetFiles),
    ]);
    applyWorkspaceData(currentData);
    throw error;
  }
}
