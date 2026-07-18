import { useCanvasStore } from "../../features/canvas/stores/useCanvasStore";
import { useRelationshipStore } from "../../features/graph/stores/useRelationshipStore";
import { useTimelineStore } from "../../features/timeline/stores/useTimelineStore";
import { useUndoStore } from "./useUndoStore";

export function removeRelationshipWithUndo(id: string, label: string) {
  const state = useRelationshipStore.getState();
  const index = state.relationships.findIndex((item) => item.id === id);
  const relationship = state.relationships[index];
  if (!relationship) return;
  state.deleteRelationship(id);
  useUndoStore.getState().show(label, () => {
    useRelationshipStore.setState((current) => {
      if (current.relationships.some((item) => item.id === id)) return current;
      const relationships = [...current.relationships];
      relationships.splice(Math.min(index, relationships.length), 0, relationship);
      return { relationships };
    });
  });
}

export function removeTimelineItemWithUndo(id: string, label: string) {
  const state = useTimelineStore.getState();
  const index = state.items.findIndex((item) => item.id === id);
  const item = state.items[index];
  if (!item) return;
  state.deleteItem(id);
  useUndoStore.getState().show(label, () => {
    useTimelineStore.setState((current) => {
      if (current.items.some((value) => value.id === id)) return current;
      const items = [...current.items];
      items.splice(Math.min(index, items.length), 0, item);
      return { items };
    });
  });
}

export function removeTimelineEraWithUndo(id: string, label: string) {
  const state = useTimelineStore.getState();
  const index = state.eras.findIndex((era) => era.id === id);
  const era = state.eras[index];
  if (!era) return;
  state.deleteEra(id);
  useUndoStore.getState().show(label, () => {
    useTimelineStore.setState((current) => {
      if (current.eras.some((value) => value.id === id)) return current;
      const eras = [...current.eras];
      eras.splice(Math.min(index, eras.length), 0, era);
      return { eras };
    });
  });
}

export function removeCanvasCardsWithUndo(ids: Iterable<string>, label: string) {
  const state = useCanvasStore.getState();
  const removedIds = new Set(ids);
  const cards = state.cards.filter((card) => removedIds.has(card.id));
  if (!cards.length) return;
  const connections = state.connections.filter(
    (connection) => removedIds.has(connection.fromCardId) || removedIds.has(connection.toCardId),
  );
  cards.forEach((card) => state.deleteCard(card.id));
  useUndoStore.getState().show(label, () => {
    useCanvasStore.setState((current) => {
      const restoredCards = [
        ...current.cards,
        ...cards.filter((card) => !current.cards.some((value) => value.id === card.id)),
      ];
      const cardIds = new Set(restoredCards.map((card) => card.id));
      return {
        cards: restoredCards,
        connections: [
          ...current.connections,
          ...connections.filter(
            (connection) =>
              cardIds.has(connection.fromCardId) &&
              cardIds.has(connection.toCardId) &&
              !current.connections.some((value) => value.id === connection.id),
          ),
        ],
      };
    });
  });
}

export function removeCanvasConnectionWithUndo(id: string, label: string) {
  const state = useCanvasStore.getState();
  const connection = state.connections.find((item) => item.id === id);
  if (!connection) return;
  state.deleteConnection(id);
  useUndoStore.getState().show(label, () => {
    useCanvasStore.setState((current) =>
      current.connections.some((item) => item.id === id)
        ? current
        : { connections: [...current.connections, connection] },
    );
  });
}
