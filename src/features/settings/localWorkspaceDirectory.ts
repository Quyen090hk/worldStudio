import { readRecord, STORE_STATE, writeRecord } from "../../shared/storage/database";
import { createWorkspaceBackup, serializeWorkspaceBackup } from "./workspaceBackup";
import { createReadableMirrorFiles } from "./workspaceReadableMirror";

const DIRECTORY_HANDLE_KEY = "world-studio.local-workspace-directory.v1";
const SYNC_METADATA_KEY = "world-studio.local-workspace-sync.v1";
export const LOCAL_SYNC_EVENT = "world-studio:local-sync-status";
export const MAX_LOCAL_SNAPSHOTS = 10;

type PermissionState = "granted" | "denied" | "prompt";
type WritableDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission: (options: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission: (options: { mode: "readwrite" }) => Promise<PermissionState>;
};
type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
};

export type LocalDirectoryStatus =
  | { state: "unsupported" }
  | { state: "disconnected" }
  | { state: "permission-required"; name: string }
  | { state: "ready"; name: string };

export type LocalSyncMetadata = {
  dirty: boolean;
  syncing: boolean;
  lastSyncedAt: string | null;
  lastError: boolean;
};

const defaultMetadata: LocalSyncMetadata = { dirty: false, syncing: false, lastSyncedAt: null, lastError: false };

function emitStatus() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LOCAL_SYNC_EVENT));
}

export async function getLocalSyncMetadata() {
  return (await readRecord<LocalSyncMetadata>(STORE_STATE, SYNC_METADATA_KEY)) ?? defaultMetadata;
}

export async function updateLocalSyncMetadata(patch: Partial<LocalSyncMetadata>) {
  const next = { ...await getLocalSyncMetadata(), ...patch };
  await writeRecord(STORE_STATE, SYNC_METADATA_KEY, next);
  emitStatus();
  return next;
}

function supportsDirectoryAccess() {
  return typeof window !== "undefined" && typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function";
}

async function readHandle() {
  return readRecord<WritableDirectoryHandle>(STORE_STATE, DIRECTORY_HANDLE_KEY);
}

async function permissionFor(handle: WritableDirectoryHandle, request: boolean) {
  const current = await handle.queryPermission({ mode: "readwrite" });
  if (current === "granted" || !request) return current;
  return handle.requestPermission({ mode: "readwrite" });
}

export async function getLocalDirectoryStatus(): Promise<LocalDirectoryStatus> {
  if (!supportsDirectoryAccess()) return { state: "unsupported" };
  const handle = await readHandle();
  if (!handle) return { state: "disconnected" };
  const permission = await permissionFor(handle, false);
  return permission === "granted"
    ? { state: "ready", name: handle.name }
    : { state: "permission-required", name: handle.name };
}

export async function chooseLocalWorkspaceDirectory() {
  if (!supportsDirectoryAccess()) throw new Error("directory-access-unsupported");
  const handle = await (window as DirectoryPickerWindow).showDirectoryPicker?.({ id: "world-studio-workspace", mode: "readwrite" });
  if (!handle) throw new Error("directory-selection-cancelled");
  const writableHandle = handle as WritableDirectoryHandle;
  if (await permissionFor(writableHandle, true) !== "granted") throw new Error("directory-permission-denied");
  await writeRecord(STORE_STATE, DIRECTORY_HANDLE_KEY, writableHandle);
  return { state: "ready", name: writableHandle.name } as const;
}

async function writeTextFile(directory: FileSystemDirectoryHandle, name: string, content: string) {
  const fileHandle = await directory.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(content);
  } finally {
    await writable.close();
  }
}

async function readTextFile(directory: FileSystemDirectoryHandle, name: string) {
  try {
    return await (await directory.getFileHandle(name)).getFile().then((file) => file.text());
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return null;
    throw error;
  }
}

async function directoryForPath(root: FileSystemDirectoryHandle, segments: string[], create: boolean) {
  let directory = root;
  for (const segment of segments) directory = await directory.getDirectoryHandle(segment, { create });
  return directory;
}

async function writePath(root: FileSystemDirectoryHandle, path: string, content: string) {
  const segments = path.split("/");
  const name = segments.pop();
  if (!name) return;
  await writeTextFile(await directoryForPath(root, segments, true), name, content);
}

async function removeManagedPath(root: FileSystemDirectoryHandle, path: string) {
  if (!path.startsWith("entries/") || path.includes("../")) return;
  const segments = path.split("/");
  const name = segments.pop();
  if (!name) return;
  try {
    const directory = await directoryForPath(root, segments, false);
    await directory.removeEntry(name);
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== "NotFoundError") throw error;
  }
}

async function writeReadableMirror(root: FileSystemDirectoryHandle, internalDirectory: FileSystemDirectoryHandle, backup: Awaited<ReturnType<typeof createWorkspaceBackup>>) {
  const files = createReadableMirrorFiles(backup);
  const previousManifestText = await readTextFile(internalDirectory, "readable-mirror.json");
  let previousPaths: string[] = [];
  try {
    const parsed = JSON.parse(previousManifestText ?? "null") as { paths?: unknown } | null;
    if (Array.isArray(parsed?.paths)) previousPaths = parsed.paths.filter((item): item is string => typeof item === "string");
  } catch {
    // A user-edited manifest is ignored; only known files from a valid list are removed.
  }

  for (const file of files) await writePath(root, file.path, file.content);
  const nextPaths = new Set(files.map((file) => file.path));
  for (const oldPath of previousPaths) if (!nextPaths.has(oldPath)) await removeManagedPath(root, oldPath);
  await writeTextFile(internalDirectory, "readable-mirror.json", JSON.stringify({ generatedAt: backup.exportedAt, paths: [...nextPaths] }, null, 2));
}

async function rotateSnapshots(directory: FileSystemDirectoryHandle) {
  const iterable = directory as unknown as {
    entries: () => AsyncIterableIterator<[string, FileSystemHandle]>;
  };
  const names: string[] = [];
  for await (const [name, handle] of iterable.entries()) {
    if (handle.kind === "file" && /^\d{4}-\d{2}-\d{2}T.*\.json$/u.test(name)) names.push(name);
  }
  names.sort().reverse();
  await Promise.all(names.slice(MAX_LOCAL_SNAPSHOTS).map((name) => directory.removeEntry(name)));
}

export async function syncWorkspaceToLocalDirectory(options: { requestPermission?: boolean } = {}) {
  const handle = await readHandle();
  if (!handle) throw new Error("directory-not-selected");
  if (await permissionFor(handle, options.requestPermission ?? true) !== "granted") throw new Error("directory-permission-denied");

  await updateLocalSyncMetadata({ syncing: true, lastError: false });

  try {
    const backup = await createWorkspaceBackup();
    const serialized = serializeWorkspaceBackup(backup);
    const internalDirectory = await handle.getDirectoryHandle(".world-studio", { create: true });
    const backupDirectory = await internalDirectory.getDirectoryHandle("backups", { create: true });

    await writeTextFile(backupDirectory, `${backup.exportedAt.replace(/[:.]/gu, "-")}.json`, serialized);
    await writeTextFile(internalDirectory, "latest-backup.json", serialized);
    await writeTextFile(handle, "world.json", JSON.stringify({
      format: "world-studio-workspace",
      version: 1,
      updatedAt: backup.exportedAt,
      world: backup.data.world,
      counts: {
        entries: backup.data.entries.length,
        relationships: backup.data.relationships.length,
        timelineItems: backup.data.timeline.items.length,
        maps: backup.data.atlas.maps.length,
        assets: backup.data.assetLibrary.items.length,
        canvasCards: backup.data.canvas.cards.length,
      },
    }, null, 2));
    await writeReadableMirror(handle, internalDirectory, backup);
    await rotateSnapshots(backupDirectory);
    await updateLocalSyncMetadata({ dirty: false, syncing: false, lastSyncedAt: backup.exportedAt, lastError: false });

    return { name: handle.name, syncedAt: backup.exportedAt };
  } catch (error) {
    await updateLocalSyncMetadata({ syncing: false, lastError: true });
    throw error;
  }
}
