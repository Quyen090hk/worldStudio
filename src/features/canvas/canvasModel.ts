import type { CanvasCard, CanvasConnection } from "./types";

export const CANVAS_WIDTH = 1800;
export const CANVAS_HEIGHT = 1100;
export const CANVAS_CARD_WIDTH = 272;
export const CANVAS_CARD_CENTER_Y = 86;
export const MIN_CANVAS_ZOOM = 0.6;
export const MAX_CANVAS_ZOOM = 1.4;

export function clampCanvasPosition(x: number, y: number) {
  return {
    x: Math.max(24, Math.min(CANVAS_WIDTH - CANVAS_CARD_WIDTH - 24, x)),
    y: Math.max(24, Math.min(CANVAS_HEIGHT - 190, y)),
  };
}

export function clampCanvasZoom(zoom: number) {
  return Math.max(MIN_CANVAS_ZOOM, Math.min(MAX_CANVAS_ZOOM, zoom));
}

export function sanitizeCanvasData(
  cards: CanvasCard[],
  connections: CanvasConnection[],
) {
  const cardIds = new Set(cards.map((card) => card.id));
  return {
    cards,
    connections: connections.filter(
      (connection) =>
        connection.fromCardId !== connection.toCardId &&
        cardIds.has(connection.fromCardId) &&
        cardIds.has(connection.toCardId),
    ),
  };
}
