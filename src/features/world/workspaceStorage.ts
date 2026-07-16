import type { WorkspaceBackup } from "../settings/workspaceBackup";
import { deleteRecord, readRecord, STORE_WORKSPACES, writeRecord } from "../../shared/storage/database";

export function saveWorldWorkspace(id: string, backup: WorkspaceBackup) {
  return writeRecord(STORE_WORKSPACES, id, backup);
}

export function loadWorldWorkspace(id: string) {
  return readRecord<WorkspaceBackup>(STORE_WORKSPACES, id);
}

export function deleteWorldWorkspace(id: string) {
  return deleteRecord(STORE_WORKSPACES, id);
}
