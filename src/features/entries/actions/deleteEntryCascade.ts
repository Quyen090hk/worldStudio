import { useRelationshipStore } from "../../graph/stores/useRelationshipStore";
import { useMapStore } from "../../map/stores/useMapStore";
import { useTimelineStore } from "../../timeline/stores/useTimelineStore";
import { useEntryStore } from "../stores/useEntryStore";

export function deleteEntryCascade(entryId: string) {
  useRelationshipStore.getState().deleteRelationshipsForEntry(entryId);
  useTimelineStore.getState().deleteItemsForEntry(entryId);
  useMapStore.getState().removeEntryReferences(entryId);
  useCanvasStore.getState().removeEntryCards(entryId);
  useEntryStore.getState().deleteEntry(entryId);
}
import { useCanvasStore } from "../../canvas/stores/useCanvasStore";
