import { useGraphSettingsStore } from "../graph/stores/useGraphSettingsStore";
import { createWorkspaceBackup, restoreWorkspaceBackup, type WorkspaceBackup } from "../settings/workspaceBackup";
import { useWorldRegistryStore, type WorldRecord } from "./stores/useWorldRegistryStore";
import { useWorldStore } from "./stores/useWorldStore";
import { deleteWorldWorkspace, loadWorldWorkspace, saveWorldWorkspace } from "./workspaceStorage";

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
    version: 4,
    exportedAt: new Date().toISOString(),
    data: {
      world: { name: world.name, description: world.description, createdAt: world.createdAt, updatedAt: world.updatedAt },
      entries: [], relationships: [],
      timeline: { items: [], eras: [], viewport: { centerYear: 0, yearsPerScreen: 500 } },
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

export async function initializeWorldRegistry() {
  const registry = useWorldRegistryStore.getState();
  const profile = useWorldStore.getState().profile;
  let current = registry.worlds.find((world) => world.id === registry.activeWorldId);
  if (!current) {
    current = { id: registry.activeWorldId, ...profile };
    registry.upsert(current);
  }
  if (!(await loadWorldWorkspace(current.id))) await saveWorldWorkspace(current.id, await createWorkspaceBackup());
}

export async function saveActiveWorld() {
  const registry = useWorldRegistryStore.getState();
  const profile = useWorldStore.getState().profile;
  registry.upsert({ id: registry.activeWorldId, ...profile });
  await saveWorldWorkspace(registry.activeWorldId, await createWorkspaceBackup());
}

export async function switchWorld(targetId: string) {
  const registry = useWorldRegistryStore.getState();
  if (targetId === registry.activeWorldId) return;
  const backup = await loadWorldWorkspace(targetId);
  if (!backup) throw new Error("World workspace not found");
  await saveActiveWorld();
  await restoreWorkspaceBackup(backup);
  registry.setActive(targetId);
}

export async function createWorld(name: string, description: string) {
  await initializeWorldRegistry();
  await saveActiveWorld();
  const world = record(id("world"), name.trim(), description.trim());
  await saveWorldWorkspace(world.id, blankBackup(world));
  useWorldRegistryStore.getState().upsert(world);
  await switchWorld(world.id);
  return world.id;
}

export async function duplicateWorld(worldId: string) {
  await saveActiveWorld();
  const source = await loadWorldWorkspace(worldId);
  const sourceRecord = useWorldRegistryStore.getState().worlds.find((world) => world.id === worldId);
  if (!source || !sourceRecord) throw new Error("World workspace not found");
  const copy = record(id("world"), `${sourceRecord.name} Copy`, sourceRecord.description);
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
  if (registry.worlds.length <= 1) return false;
  if (worldId === registry.activeWorldId) {
    const target = registry.worlds.find((world) => world.id !== worldId);
    if (!target) return false;
    const backup = await loadWorldWorkspace(target.id);
    if (!backup) return false;
    await restoreWorkspaceBackup(backup);
    registry.setActive(target.id);
  }
  registry.remove(worldId);
  await deleteWorldWorkspace(worldId);
  return true;
}
