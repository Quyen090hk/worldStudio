import { useGraphSettingsStore } from "../graph/stores/useGraphSettingsStore";
import { WORKSPACE_BACKUP_VERSION, createWorkspaceSnapshot, restoreWorkspaceBackup, restoreWorkspaceSnapshot, type WorkspaceBackup } from "../settings/workspaceBackup";
import { useWorldRegistryStore, type WorldRecord } from "./stores/useWorldRegistryStore";
import { useWorldStore } from "./stores/useWorldStore";
import { deleteWorldWorkspace, loadWorldWorkspace, saveWorldWorkspace } from "./workspaceStorage";
import { hydrateWorkspaceStores } from "./hydrateWorkspaceStores";
import { removeAssetFile } from "../assets/assetStorage";
import { removeMapImage } from "../map/utils/mapImageStorage";
import {
  isAssetReferencedByStoredWorld,
  isMapImageReferencedByStoredWorld,
} from "./worldResourceReferences";
import { DEFAULT_TIMELINE_LANES, DEFAULT_WORLD_YEAR_FORMAT } from "../timeline/timelineModel";

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

function record(idValue: string, name: string, description: string): WorldRecord {
  const now = new Date().toISOString();
  return { id: idValue, name, description, createdAt: now, updatedAt: now };
}

function blankBackup(world: WorldRecord): WorkspaceBackup {
  const mapId = id("map");
  const graph = useGraphSettingsStore.getState();
  return {
    format: "world-studio-backup",
    version: WORKSPACE_BACKUP_VERSION,
    storage: "snapshot",
    exportedAt: new Date().toISOString(),
    data: {
      world: { name: world.name, description: world.description, createdAt: world.createdAt, updatedAt: world.updatedAt },
      entries: [], revisions: [], relationships: [],
      timeline: {
        items: [],
        eras: [],
        lanes: DEFAULT_TIMELINE_LANES.map((lane) => ({ ...lane })),
        yearFormat: { ...DEFAULT_WORLD_YEAR_FORMAT },
        viewport: { centerYear: 0, yearsPerScreen: 500 },
      },
      atlas: { maps: [{ id: mapId, name: world.name, scale: "World", description: "", createdAt: world.createdAt }], activeMapId: mapId, layers: [{ id: id("layer"), mapId, name: "Places", color: "#986e36", visible: true }], markers: [], connections: [], images: [] },
      assetLibrary: { items: [], files: [] },
      canvas: { cards: [], connections: [], viewport: { zoom: 1 } },
      graphSettings: {
        visibleTypes: graph.visibleTypes,
        showSecrets: graph.showSecrets,
        showOrphans: graph.showOrphans,
        nodeRepulsion: graph.nodeRepulsion,
        linkDistance: graph.linkDistance,
        linkElasticity: graph.linkElasticity,
        centerGravity: graph.centerGravity,
        animationDuration: graph.animationDuration,
        groups: graph.groups,
      },
    },
  };
}

async function restoreStoredWorkspace(workspace: WorkspaceBackup) {
  if (workspace.storage === "snapshot") {
    restoreWorkspaceSnapshot(workspace);
    return;
  }
  const containsPortableFiles =
    workspace.data.atlas.images.length > 0 ||
    workspace.data.assetLibrary.files.length > 0;
  if (containsPortableFiles) await restoreWorkspaceBackup(workspace);
  else restoreWorkspaceSnapshot(workspace);
}

export async function initializeWorldRegistry() {
  await hydrateWorkspaceStores();
  const registry = useWorldRegistryStore.getState();
  let current = registry.worlds.find((world) => world.id === registry.activeWorldId);
  if (!current) current = registry.worlds.find((world) => !world.archived) ?? registry.worlds[0];
  if (!current) return;
  if (current.id !== registry.activeWorldId) registry.setActive(current.id);
  if (!(await loadWorldWorkspace(current.id)))
    await saveWorldWorkspace(current.id, await createWorkspaceSnapshot());
}

export async function saveActiveWorld() {
  await hydrateWorkspaceStores();
  const registry = useWorldRegistryStore.getState();
  if (!registry.worlds.some((world) => world.id === registry.activeWorldId)) return;
  const profile = useWorldStore.getState().profile;
  registry.upsert({ id: registry.activeWorldId, ...profile });
  await saveWorldWorkspace(registry.activeWorldId, await createWorkspaceSnapshot());
}

export async function switchWorld(targetId: string) {
  await hydrateWorkspaceStores();
  const registry = useWorldRegistryStore.getState();
  if (targetId === registry.activeWorldId) return;
  const backup = await loadWorldWorkspace(targetId);
  if (!backup) throw new Error("World workspace not found");
  await saveActiveWorld();
  await restoreStoredWorkspace(backup);
  registry.setActive(targetId);
  registry.upsert({ ...registry.worlds.find((world) => world.id === targetId)!, updatedAt: new Date().toISOString() });
}

export async function createWorld(name: string, description: string) {
  await hydrateWorkspaceStores();
  await saveActiveWorld();
  const world = record(id("world"), name.trim(), description.trim());
  await saveWorldWorkspace(world.id, blankBackup(world));
  useWorldRegistryStore.getState().upsert(world);
  await switchWorld(world.id);
  return world.id;
}

export async function createWorldFromBackup(backup: WorkspaceBackup) {
  await hydrateWorkspaceStores();
  await saveActiveWorld();
  const profile = backup.data.world;
  const world = record(id("world"), profile.name.trim(), profile.description.trim());
  await restoreStoredWorkspace(backup);
  useWorldRegistryStore.getState().upsert(world);
  useWorldRegistryStore.getState().setActive(world.id);
  await saveWorldWorkspace(world.id, await createWorkspaceSnapshot());
  return world.id;
}

export async function duplicateWorld(worldId: string, copySuffix = "Copy") {
  await saveActiveWorld();
  const source = await loadWorldWorkspace(worldId);
  const sourceRecord = useWorldRegistryStore.getState().worlds.find((world) => world.id === worldId);
  if (!source || !sourceRecord) throw new Error("World workspace not found");
  const copy = record(id("world"), `${sourceRecord.name} ${copySuffix}`, sourceRecord.description);
  const workspace = structuredClone(source);
  workspace.exportedAt = new Date().toISOString();
  workspace.data.world = { name: copy.name, description: copy.description, createdAt: copy.createdAt, updatedAt: copy.updatedAt };
  await saveWorldWorkspace(copy.id, workspace);
  useWorldRegistryStore.getState().upsert(copy);
  return copy.id;
}

export function setWorldArchived(worldId: string, archived: boolean) {
  const registry = useWorldRegistryStore.getState();
  const world = registry.worlds.find((item) => item.id === worldId);
  if (!world || world.id === registry.activeWorldId) return false;
  registry.upsert({ ...world, archived, updatedAt: new Date().toISOString() });
  return true;
}

export async function deleteWorld(worldId: string) {
  const registry = useWorldRegistryStore.getState();
  const deletedWorkspace = await loadWorldWorkspace(worldId);
  if (worldId === registry.activeWorldId) {
    const target = registry.worlds.find((world) => world.id !== worldId);
    if (target) {
      const backup = await loadWorldWorkspace(target.id);
      if (!backup) return false;
      await restoreStoredWorkspace(backup);
      registry.setActive(target.id);
    } else {
      registry.setActive("");
    }
  }
  registry.remove(worldId);
  await deleteWorldWorkspace(worldId);
  if (deletedWorkspace) {
    for (const asset of deletedWorkspace.data.assetLibrary.items) {
      if (!await isAssetReferencedByStoredWorld(asset.id)) await removeAssetFile(asset.id);
    }
    for (const map of deletedWorkspace.data.atlas.maps) {
      if (!await isMapImageReferencedByStoredWorld(map.id)) await removeMapImage(map.id);
    }
  }
  return true;
}
