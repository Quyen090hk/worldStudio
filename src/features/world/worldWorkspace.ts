import { useGraphSettingsStore } from "../graph/stores/useGraphSettingsStore";
import { WORKSPACE_BACKUP_VERSION, createWorkspaceSnapshot, remapWorkspaceBackupWorld, restoreWorkspaceBackup, restoreWorkspaceSnapshot, type WorkspaceBackup } from "../settings/workspaceBackup";
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
import { useManuscriptStore } from "../manuscript/stores/useManuscriptStore";

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
      manuscripts: { items: [], nodes: [], activeManuscriptByWorld: {}, activeNodeByManuscript: {} },
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

async function restoreStoredWorkspace(
  workspace: WorkspaceBackup,
  worldId: string,
  options: { mergePortableManuscripts?: boolean } = {},
) {
  // Manuscripts belong to the writing project, not to an individual reference
  // world. World snapshots still carry them for portable backups, but switching
  // worlds must never replace a manuscript that is already open locally.
  const manuscriptState = useManuscriptStore.getState();
  const existingManuscripts = {
    manuscripts: manuscriptState.manuscripts,
    nodes: manuscriptState.nodes,
    activeManuscriptByWorld: manuscriptState.activeManuscriptByWorld,
    activeNodeByManuscript: manuscriptState.activeNodeByManuscript,
  };
  const localWorkspace = remapWorkspaceBackupWorld(workspace, worldId);
  const portableManuscripts = localWorkspace.data.manuscripts;
  if (localWorkspace.storage === "snapshot") {
    restoreWorkspaceSnapshot(localWorkspace);
  } else {
    const containsPortableFiles =
      localWorkspace.data.atlas.images.length > 0 ||
      localWorkspace.data.assetLibrary.files.length > 0;
    if (containsPortableFiles) await restoreWorkspaceBackup(localWorkspace);
    else restoreWorkspaceSnapshot(localWorkspace);
  }
  if (!options.mergePortableManuscripts) {
    useManuscriptStore.setState(existingManuscripts);
    return;
  }

  const manuscriptIds = new Set(existingManuscripts.manuscripts.map((item) => item.id));
  const manuscripts = [
    ...existingManuscripts.manuscripts,
    ...portableManuscripts.items.filter((item) => !manuscriptIds.has(item.id)),
  ];
  const nodeIds = new Set(existingManuscripts.nodes.map((item) => item.id));
  const nodes = [
    ...existingManuscripts.nodes,
    ...portableManuscripts.nodes.filter((item) => !nodeIds.has(item.id)),
  ];
  const preferredManuscriptId =
    portableManuscripts.activeManuscriptByWorld[worldId] ??
    portableManuscripts.items[0]?.id;
  useManuscriptStore.setState({
    manuscripts,
    nodes,
    activeManuscriptByWorld: {
      ...existingManuscripts.activeManuscriptByWorld,
      ...(preferredManuscriptId ? { [worldId]: preferredManuscriptId } : {}),
    },
    activeNodeByManuscript: {
      ...existingManuscripts.activeNodeByManuscript,
      ...portableManuscripts.activeNodeByManuscript,
    },
  });
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
  await restoreStoredWorkspace(backup, targetId);
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
  await restoreStoredWorkspace(backup, world.id, { mergePortableManuscripts: true });
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
  await saveWorldWorkspace(copy.id, remapWorkspaceBackupWorld(workspace, copy.id));
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
      await restoreStoredWorkspace(backup, target.id);
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
