import type { StateStorage } from "zustand/middleware";

import {
  deleteRecord,
  indexedDbStateStorage,
  readAllRecords,
  STORE_ENTRIES,
  STORE_ENTRY_REVISIONS,
  writeRecord,
} from "../../../shared/storage/database";
import type { Entry, EntryRevision } from "../types";

type PersistedEnvelope = {
  state?: {
    entries?: Entry[];
    revisions?: EntryRevision[];
    _entryIds?: string[];
    _revisionIds?: string[];
    _normalized?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

let queue = Promise.resolve();
let entryFingerprints = new Map<string, string>();
let revisionFingerprints = new Map<string, string>();

function fingerprint(value: unknown) {
  return JSON.stringify(value);
}

async function writeChanges<T extends { id: string }>(
  store: typeof STORE_ENTRIES | typeof STORE_ENTRY_REVISIONS,
  values: T[],
  previous: Map<string, string>,
) {
  const next = new Map(values.map((value) => [value.id, fingerprint(value)]));
  await Promise.all(values.map((value) =>
    previous.get(value.id) === next.get(value.id)
      ? Promise.resolve()
      : writeRecord(store, value.id, value),
  ));
  await Promise.all([...previous.keys()]
    .filter((id) => !next.has(id))
    .map((id) => deleteRecord(store, id)));
  return next;
}

export const normalizedEntryStateStorage: StateStorage = {
  async getItem(name) {
    const raw = await indexedDbStateStorage.getItem(name);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as PersistedEnvelope;
    if (!envelope.state?._normalized) return raw;

    const [allEntries, allRevisions] = await Promise.all([
      readAllRecords<Entry>(STORE_ENTRIES),
      readAllRecords<EntryRevision>(STORE_ENTRY_REVISIONS),
    ]);
    const entryIds = new Set(envelope.state._entryIds ?? []);
    const revisionIds = new Set(envelope.state._revisionIds ?? []);
    const entries = allEntries.filter((entry) => entryIds.has(entry.id));
    const revisions = allRevisions.filter((revision) => revisionIds.has(revision.id));
    entryFingerprints = new Map(entries.map((entry) => [entry.id, fingerprint(entry)]));
    revisionFingerprints = new Map(revisions.map((revision) => [revision.id, fingerprint(revision)]));
    envelope.state.entries = entries;
    envelope.state.revisions = revisions;
    return JSON.stringify(envelope);
  },

  setItem(name, value) {
    const operation = queue.catch(() => undefined).then(async () => {
      const envelope = JSON.parse(value) as PersistedEnvelope;
      const state = envelope.state ?? {};
      const entries = Array.isArray(state.entries) ? state.entries : [];
      const revisions = Array.isArray(state.revisions) ? state.revisions : [];
      entryFingerprints = await writeChanges(STORE_ENTRIES, entries, entryFingerprints);
      revisionFingerprints = await writeChanges(STORE_ENTRY_REVISIONS, revisions, revisionFingerprints);
      state._entryIds = entries.map((entry) => entry.id);
      state._revisionIds = revisions.map((revision) => revision.id);
      state._normalized = true;
      state.entries = [];
      state.revisions = [];
      envelope.state = state;
      await indexedDbStateStorage.setItem(name, JSON.stringify(envelope));
    });
    queue = operation;
    return operation;
  },

  async removeItem(name) {
    entryFingerprints = new Map();
    revisionFingerprints = new Map();
    await indexedDbStateStorage.removeItem(name);
  },
};
