import { createWorkspaceBackup, parseWorkspaceBackup, restoreWorkspaceBackup, restoreWorkspaceSnapshot, type WorkspaceBackup } from "../settings/workspaceBackup";
import { useWorldRegistryStore, type WorldRecord } from "./stores/useWorldRegistryStore";
import { saveActiveWorld, switchWorld } from "./worldWorkspace";
import { deleteWorldWorkspace, loadWorldWorkspace, saveWorldWorkspace } from "./workspaceStorage";

export const MULTI_WORLD_BACKUP_FORMAT = "world-studio-multiworld-backup";
export const MULTI_WORLD_BACKUP_VERSION = 1;
export const MAX_MULTI_WORLD_COUNT = 100;

export type MultiWorldImportMode = "merge" | "replace";

export type MultiWorldBackup = {
  format: typeof MULTI_WORLD_BACKUP_FORMAT;
  version: typeof MULTI_WORLD_BACKUP_VERSION;
  exportedAt: string;
  activeWorldId: string;
  worlds: Array<{ record: WorldRecord; workspace: WorkspaceBackup }>;
};

export async function createMultiWorldBackup(): Promise<MultiWorldBackup> {
  await saveActiveWorld();
  const registry = useWorldRegistryStore.getState();
  const originalWorldId = registry.activeWorldId;
  const worlds = [];
  try {
    for (const record of registry.worlds) {
      if (useWorldRegistryStore.getState().activeWorldId !== record.id) {
        await switchWorld(record.id);
      }
      worlds.push({ record, workspace: await createWorkspaceBackup() });
    }
  } finally {
    if (useWorldRegistryStore.getState().activeWorldId !== originalWorldId) {
      await switchWorld(originalWorldId);
    }
  }
  return { format: MULTI_WORLD_BACKUP_FORMAT, version: MULTI_WORLD_BACKUP_VERSION, exportedAt: new Date().toISOString(), activeWorldId: originalWorldId, worlds };
}

export function parseMultiWorldBackup(text: string): MultiWorldBackup {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("invalid-json"); }
  if (!value || typeof value !== "object") throw new Error("invalid-data");
  const candidate = value as Partial<MultiWorldBackup>;
  if (candidate.format !== MULTI_WORLD_BACKUP_FORMAT || candidate.version !== MULTI_WORLD_BACKUP_VERSION || !Array.isArray(candidate.worlds) || !candidate.worlds.length) throw new Error("invalid-format");
  if (candidate.worlds.length > MAX_MULTI_WORLD_COUNT) throw new Error("too-many-worlds");
  const ids = new Set<string>();
  candidate.worlds.forEach((item) => {
    if (!item?.record || typeof item.record.id !== "string" || !item.record.id || ids.has(item.record.id) || typeof item.record.name !== "string") throw new Error("invalid-world");
    ids.add(item.record.id);
  });
  const worlds = candidate.worlds.map((item) => {
    const workspace = parseWorkspaceBackup(JSON.stringify(item.workspace));
    return {
      record: {
        id: item.record.id,
        name: workspace.data.world.name,
        description: workspace.data.world.description,
        createdAt: workspace.data.world.createdAt,
        updatedAt: workspace.data.world.updatedAt,
        ...(item.record.archived === true ? { archived: true } : {}),
      },
      workspace,
    };
  });
  const activeWorldId = typeof candidate.activeWorldId === "string" && ids.has(candidate.activeWorldId) ? candidate.activeWorldId : worlds[0].record.id;
  return { format: MULTI_WORLD_BACKUP_FORMAT, version: MULTI_WORLD_BACKUP_VERSION, exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : new Date().toISOString(), activeWorldId, worlds };
}

function newWorldId() {
  return `world-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

/** Gives every imported world a local identity so foreign ids can never overwrite stored workspaces. */
export function prepareMultiWorldImport(backup: MultiWorldBackup) {
  const idMap = new Map<string, string>();
  const worlds = backup.worlds.map((item) => {
    const id = newWorldId();
    idMap.set(item.record.id, id);
    const profile = item.workspace.data.world;
    return {
      record: {
        ...item.record,
        id,
        name: profile.name,
        description: profile.description,
      },
      workspace: structuredClone(item.workspace),
    };
  });
  return {
    worlds,
    activeWorldId: idMap.get(backup.activeWorldId) ?? worlds[0].record.id,
  };
}

export async function restoreMultiWorldBackup(
  backup: MultiWorldBackup,
  mode: MultiWorldImportMode = "replace",
) {
  await saveActiveWorld();
  const registry = useWorldRegistryStore.getState();
  const previousWorlds = [...registry.worlds];
  const previousActiveWorldId = registry.activeWorldId;
  const previousActiveWorkspace = previousActiveWorldId
    ? await loadWorldWorkspace(previousActiveWorldId)
    : undefined;
  const prepared = prepareMultiWorldImport(backup);
  const createdIds: string[] = [];

  try {
    for (const item of prepared.worlds) {
      await saveWorldWorkspace(item.record.id, item.workspace);
      createdIds.push(item.record.id);
    }

    if (mode === "merge" && previousWorlds.length) {
      registry.replace(
        [...previousWorlds, ...prepared.worlds.map((item) => item.record)],
        previousActiveWorldId,
      );
      return { imported: prepared.worlds.length, activeWorldId: previousActiveWorldId };
    }

    const active = prepared.worlds.find(
      (item) => item.record.id === prepared.activeWorldId,
    ) ?? prepared.worlds[0];
    await restoreWorkspaceBackup(active.workspace);
    registry.replace(prepared.worlds.map((item) => item.record), active.record.id);

    if (mode === "replace") {
      await Promise.allSettled(previousWorlds.map((world) => deleteWorldWorkspace(world.id)));
    }
    return { imported: prepared.worlds.length, activeWorldId: active.record.id };
  } catch (error) {
    await Promise.allSettled(createdIds.map((id) => deleteWorldWorkspace(id)));
    registry.replace(previousWorlds, previousActiveWorldId);
    if (previousActiveWorkspace) restoreWorkspaceSnapshot(previousActiveWorkspace);
    throw error;
  }
}
