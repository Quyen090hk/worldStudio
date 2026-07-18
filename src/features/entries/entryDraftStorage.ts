import {
  readRecord,
  STORE_ENTRY_DRAFTS,
  writeRecord,
} from "../../shared/storage/database";

export type EntryDraftRecord = {
  entryId: string;
  content: string;
  updatedAt: string;
};

export function readEntryDraft(entryId: string) {
  return readRecord<EntryDraftRecord>(STORE_ENTRY_DRAFTS, entryId);
}

export function writeEntryDraft(entryId: string, content: string) {
  return writeRecord<EntryDraftRecord>(STORE_ENTRY_DRAFTS, entryId, {
    entryId,
    content,
    updatedAt: new Date().toISOString(),
  });
}
