import { createWorkspaceBackup, parseWorkspaceBackup, restoreWorkspaceBackup, type WorkspaceBackup } from "../settings/workspaceBackup";
import { useWorldRegistryStore, type WorldRecord } from "./stores/useWorldRegistryStore";
import { saveActiveWorld, switchWorld } from "./worldWorkspace";
import { saveWorldWorkspace } from "./workspaceStorage";

export const MULTI_WORLD_BACKUP_FORMAT = "world-studio-multiworld-backup";
export const MULTI_WORLD_BACKUP_VERSION = 1;

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
  const ids = new Set<string>();
  candidate.worlds.forEach((item) => {
    if (!item?.record || typeof item.record.id !== "string" || !item.record.id || ids.has(item.record.id) || typeof item.record.name !== "string") throw new Error("invalid-world");
    ids.add(item.record.id);
  });
  const worlds = candidate.worlds.map((item) => ({ record: item.record, workspace: parseWorkspaceBackup(JSON.stringify(item.workspace)) }));
  const activeWorldId = typeof candidate.activeWorldId === "string" && ids.has(candidate.activeWorldId) ? candidate.activeWorldId : worlds[0].record.id;
  return { format: MULTI_WORLD_BACKUP_FORMAT, version: MULTI_WORLD_BACKUP_VERSION, exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : new Date().toISOString(), activeWorldId, worlds };
}

export async function restoreMultiWorldBackup(backup: MultiWorldBackup) {
  for (const item of backup.worlds) await saveWorldWorkspace(item.record.id, item.workspace);
  const active = backup.worlds.find((item) => item.record.id === backup.activeWorldId) ?? backup.worlds[0];
  await restoreWorkspaceBackup(active.workspace);
  useWorldRegistryStore.getState().replace(backup.worlds.map((item) => item.record), active.record.id);
}
