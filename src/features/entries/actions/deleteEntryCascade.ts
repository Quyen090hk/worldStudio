import { useUndoStore } from "../../../shared/undo/useUndoStore";
import { useCanvasStore } from "../../canvas/stores/useCanvasStore";
import { useRelationshipStore } from "../../graph/stores/useRelationshipStore";
import { useMapStore } from "../../map/stores/useMapStore";
import { useTimelineStore } from "../../timeline/stores/useTimelineStore";
import { useEntryStore } from "../stores/useEntryStore";

export function deleteEntryCascade(entryId: string) {
  const entryState = useEntryStore.getState();
  const entryIndex = entryState.entries.findIndex((entry) => entry.id === entryId);
  const entry = entryState.entries[entryIndex];
  if (!entry) return;

  const relationships = useRelationshipStore.getState().relationships.filter(
    (item) => item.sourceEntryId === entryId || item.targetEntryId === entryId,
  );
  const timelineItems = useTimelineStore.getState().items.filter(
    (item) => item.entryId === entryId,
  );
  const markerIds = useMapStore.getState().markers
    .filter((marker) => marker.entryIds.includes(entryId))
    .map((marker) => marker.id);
  const canvasCards = useCanvasStore.getState().cards.filter(
    (card) => card.kind === "entry" && card.entryId === entryId,
  );
  const removedCardIds = new Set(canvasCards.map((card) => card.id));
  const canvasConnections = useCanvasStore.getState().connections.filter(
    (item) => removedCardIds.has(item.fromCardId) || removedCardIds.has(item.toCardId),
  );

  useRelationshipStore.getState().deleteRelationshipsForEntry(entryId);
  useTimelineStore.getState().deleteItemsForEntry(entryId);
  useMapStore.getState().removeEntryReferences(entryId);
  useCanvasStore.getState().removeEntryCards(entryId);
  useEntryStore.getState().deleteEntry(entryId);

  useUndoStore.getState().show(entry.title, () => {
    useEntryStore.setState((state) => {
      if (state.entries.some((item) => item.id === entry.id)) return state;
      const entries = [...state.entries];
      entries.splice(Math.min(entryIndex, entries.length), 0, entry);
      return { entries };
    });
    useRelationshipStore.setState((state) => ({
      relationships: [...state.relationships, ...relationships.filter((item) => !state.relationships.some((current) => current.id === item.id))],
    }));
    useTimelineStore.setState((state) => ({
      items: [...state.items, ...timelineItems.filter((item) => !state.items.some((current) => current.id === item.id))],
    }));
    useMapStore.setState((state) => ({
      markers: state.markers.map((marker) =>
        markerIds.includes(marker.id) && !marker.entryIds.includes(entryId)
          ? { ...marker, entryIds: [...marker.entryIds, entryId] }
          : marker,
      ),
    }));
    useCanvasStore.setState((state) => {
      const cards = [...state.cards, ...canvasCards.filter((card) => !state.cards.some((current) => current.id === card.id))];
      const cardIds = new Set(cards.map((card) => card.id));
      return {
        cards,
        connections: [...state.connections, ...canvasConnections.filter((item) => cardIds.has(item.fromCardId) && cardIds.has(item.toCardId) && !state.connections.some((current) => current.id === item.id))],
      };
    });
  });
}
