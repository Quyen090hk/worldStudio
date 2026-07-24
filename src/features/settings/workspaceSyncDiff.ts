export type SyncVersion = {
  id: string;
  path: string;
  baseHash: string | null;
  browserHash: string | null;
  localHash: string | null;
};

export type SyncChangeKind = "clean" | "browser-only" | "local-only" | "conflict";

export type SyncChange = SyncVersion & { kind: SyncChangeKind };

export function contentHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function classifySyncChange(version: SyncVersion): SyncChange {
  const { baseHash, browserHash, localHash } = version;
  let kind: SyncChangeKind;
  if (browserHash === localHash) kind = "clean";
  else if (baseHash === null && localHash === null) kind = "browser-only";
  else if (baseHash === null && browserHash === null) kind = "local-only";
  else if (baseHash !== null && localHash === baseHash) kind = "browser-only";
  else if (baseHash !== null && browserHash === baseHash) kind = "local-only";
  else kind = "conflict";
  return { ...version, kind };
}

export function summarizeSyncChanges(changes: SyncChange[]) {
  return changes.reduce((summary, change) => {
    summary[change.kind] += 1;
    return summary;
  }, { clean: 0, "browser-only": 0, "local-only": 0, conflict: 0 });
}
