import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { indexedDbStateStorage } from "../../../shared/storage/database";

import {
  clampCanvasPosition,
  clampCanvasZoom,
} from "../canvasModel";
import type {
  CanvasCard,
  CanvasCardColor,
  CanvasConnection,
  CanvasViewport,
} from "../types";

type CanvasStore = {
  cards: CanvasCard[];
  connections: CanvasConnection[];
  viewport: CanvasViewport;
  addNoteCard: (x: number, y: number) => string;
  addEntryCard: (entryId: string, x: number, y: number) => string;
  duplicateCard: (cardId: string) => string | null;
  arrangeCards: (cardIds: string[], mode: "left" | "top" | "horizontal" | "vertical") => void;
  updateNoteCard: (
    cardId: string,
    patch: { title: string; body: string; color: CanvasCardColor },
  ) => void;
  moveCard: (cardId: string, x: number, y: number) => void;
  deleteCard: (cardId: string) => void;
  removeEntryCards: (entryId: string) => void;
  addConnection: (fromCardId: string, toCardId: string, label?: string) => string | null;
  updateConnectionLabel: (connectionId: string, label: string) => void;
  deleteConnection: (connectionId: string) => void;
  setZoom: (zoom: number) => void;
  clearCanvas: () => void;
};

function createId(prefix: string) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      cards: [],
      connections: [],
      viewport: { zoom: 1 },
      addNoteCard: (x, y) => {
        const id = createId("canvas-note");
        const now = new Date().toISOString();
        set((state) => ({
          cards: [
            ...state.cards,
            {
              id,
              kind: "note",
              ...clampCanvasPosition(x, y),
              title: "",
              body: "",
              color: "parchment",
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        return id;
      },
      addEntryCard: (entryId, x, y) => {
        const id = createId("canvas-entry");
        const now = new Date().toISOString();
        set((state) => ({
          cards: [
            ...state.cards,
            {
              id,
              kind: "entry",
              entryId,
              ...clampCanvasPosition(x, y),
              color: "slate",
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        return id;
      },
      duplicateCard: (cardId) => {
        const source = get().cards.find((card) => card.id === cardId);
        if (!source) return null;
        const id = createId(source.kind === "note" ? "canvas-note" : "canvas-entry");
        const now = new Date().toISOString();
        const position = clampCanvasPosition(source.x + 32, source.y + 32);
        const copy = source.kind === "note"
          ? { ...source, ...position, id, title: source.title, createdAt: now, updatedAt: now }
          : { ...source, ...position, id, createdAt: now, updatedAt: now };
        set((state) => ({ cards: [...state.cards, copy] }));
        return id;
      },
      arrangeCards: (cardIds, mode) => set((state) => {
        const selected = state.cards.filter((card) => cardIds.includes(card.id));
        if (selected.length < 2) return state;
        const positions = new Map<string, { x: number; y: number }>();
        if (mode === "left" || mode === "top") {
          const value = Math.min(...selected.map((card) => mode === "left" ? card.x : card.y));
          selected.forEach((card) => positions.set(card.id, mode === "left" ? { x: value, y: card.y } : { x: card.x, y: value }));
        } else {
          const axis = mode === "horizontal" ? "x" : "y";
          const sorted = [...selected].sort((a, b) => a[axis] - b[axis]);
          const start = sorted[0][axis];
          const end = sorted[sorted.length - 1][axis];
          const step = (end - start) / Math.max(1, sorted.length - 1);
          sorted.forEach((card, index) => positions.set(card.id, axis === "x" ? { x: start + step * index, y: card.y } : { x: card.x, y: start + step * index }));
        }
        return { cards: state.cards.map((card) => positions.has(card.id) ? { ...card, ...positions.get(card.id)!, updatedAt: new Date().toISOString() } : card) };
      }),
      updateNoteCard: (cardId, patch) =>
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === cardId && card.kind === "note"
              ? { ...card, ...patch, updatedAt: new Date().toISOString() }
              : card,
          ),
        })),
      moveCard: (cardId, x, y) =>
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === cardId
              ? {
                  ...card,
                  ...clampCanvasPosition(x, y),
                  updatedAt: new Date().toISOString(),
                }
              : card,
          ),
        })),
      deleteCard: (cardId) =>
        set((state) => ({
          cards: state.cards.filter((card) => card.id !== cardId),
          connections: state.connections.filter(
            (connection) =>
              connection.fromCardId !== cardId &&
              connection.toCardId !== cardId,
          ),
        })),
      removeEntryCards: (entryId) =>
        set((state) => {
          const removedIds = new Set(
            state.cards
              .filter(
                (card) => card.kind === "entry" && card.entryId === entryId,
              )
              .map((card) => card.id),
          );
          return {
            cards: state.cards.filter((card) => !removedIds.has(card.id)),
            connections: state.connections.filter(
              (connection) =>
                !removedIds.has(connection.fromCardId) &&
                !removedIds.has(connection.toCardId),
            ),
          };
        }),
      addConnection: (fromCardId, toCardId, label = "") => {
        if (fromCardId === toCardId) return null;
        const state = get();
        const cardIds = new Set(state.cards.map((card) => card.id));
        const exists = state.connections.some(
          (connection) =>
            (connection.fromCardId === fromCardId &&
              connection.toCardId === toCardId) ||
            (connection.fromCardId === toCardId &&
              connection.toCardId === fromCardId),
        );
        if (!cardIds.has(fromCardId) || !cardIds.has(toCardId) || exists) {
          return null;
        }
        const id = createId("canvas-link");
        set((current) => ({
          connections: [
            ...current.connections,
            {
              id,
              fromCardId,
              toCardId,
              label: label.trim(),
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },
      updateConnectionLabel: (connectionId, label) => set((state) => ({
        connections: state.connections.map((connection) => connection.id === connectionId
          ? { ...connection, label: label.slice(0, 48) }
          : connection),
      })),
      deleteConnection: (connectionId) =>
        set((state) => ({
          connections: state.connections.filter(
            (connection) => connection.id !== connectionId,
          ),
        })),
      setZoom: (zoom) =>
        set({ viewport: { zoom: clampCanvasZoom(zoom) } }),
      clearCanvas: () => set({ cards: [], connections: [] }),
    }),
    {
      name: "world-studio.canvas.v1",
      storage: createJSONStorage(() => indexedDbStateStorage),
      version: 1,
      partialize: (state) => ({
        cards: state.cards,
        connections: state.connections,
        viewport: state.viewport,
      }),
    },
  ),
);
