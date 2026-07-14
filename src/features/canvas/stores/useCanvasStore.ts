import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  updateNoteCard: (
    cardId: string,
    patch: { title: string; body: string; color: CanvasCardColor },
  ) => void;
  moveCard: (cardId: string, x: number, y: number) => void;
  deleteCard: (cardId: string) => void;
  removeEntryCards: (entryId: string) => void;
  addConnection: (fromCardId: string, toCardId: string) => string | null;
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
      addConnection: (fromCardId, toCardId) => {
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
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },
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
      version: 1,
      partialize: (state) => ({
        cards: state.cards,
        connections: state.connections,
        viewport: state.viewport,
      }),
    },
  ),
);
