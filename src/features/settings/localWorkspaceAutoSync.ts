import { useAssetStore } from "../assets/stores/useAssetStore";
import { useCanvasStore } from "../canvas/stores/useCanvasStore";
import { useEntryStore } from "../entries/stores/useEntryStore";
import { useGraphSettingsStore } from "../graph/stores/useGraphSettingsStore";
import { useRelationshipStore } from "../graph/stores/useRelationshipStore";
import { useMapStore } from "../map/stores/useMapStore";
import { useManuscriptStore } from "../manuscript/stores/useManuscriptStore";
import { useTimelineStore } from "../timeline/stores/useTimelineStore";
import { useWorldStore } from "../world/stores/useWorldStore";
import { getLocalDirectoryStatus, syncWorkspaceToLocalDirectory, updateLocalSyncMetadata } from "./localWorkspaceDirectory";

const AUTO_SYNC_DELAY_MS = 30_000;
const stores = [useWorldStore, useEntryStore, useRelationshipStore, useTimelineStore, useManuscriptStore, useMapStore, useCanvasStore, useAssetStore, useGraphSettingsStore];

let started = false;
let timer: number | null = null;
let revision = 0;
let syncing = false;

async function runAutoSync() {
  if (syncing) return;
  const status = await getLocalDirectoryStatus().catch(() => ({ state: "disconnected" as const }));
  if (status.state !== "ready") return;
  syncing = true;
  const startedAtRevision = revision;
  try {
    await syncWorkspaceToLocalDirectory({ requestPermission: false });
  } catch {
    // Status is persisted by the sync operation. Editing continues in IndexedDB.
  } finally {
    syncing = false;
    if (revision !== startedAtRevision) scheduleLocalWorkspaceSync();
  }
}

export function scheduleLocalWorkspaceSync() {
  revision += 1;
  void updateLocalSyncMetadata({ dirty: true });
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void runAutoSync();
  }, AUTO_SYNC_DELAY_MS);
}

export function startLocalWorkspaceAutoSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  for (const store of stores) store.subscribe(scheduleLocalWorkspaceSync);
}
