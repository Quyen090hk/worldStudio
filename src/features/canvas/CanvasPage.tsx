import {
  BookOpen,
  GitBranch,
  GripHorizontal,
  Link2,
  MousePointer2,
  Scan,
  Plus,
  StickyNote,
  Trash2,
  Unlink,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useMemo, useRef, useState, type PointerEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { MotionPage } from "../../shared/components/MotionPage";
import { useI18n } from "../../shared/i18n";
import { useEntryStore } from "../entries/stores/useEntryStore";
import type { Entry } from "../entries/types";
import {
  CANVAS_CARD_CENTER_Y,
  CANVAS_CARD_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_CANVAS_ZOOM,
  MIN_CANVAS_ZOOM,
  clampCanvasPosition,
  clampCanvasZoom,
} from "./canvasModel";
import { useCanvasStore } from "./stores/useCanvasStore";
import type { CanvasCard, CanvasCardColor } from "./types";

const CARD_COLORS: Record<CanvasCardColor, string> = {
  parchment: "#c8a96b",
  sage: "#7f9670",
  slate: "#718b98",
  rose: "#a87870",
};

function CanvasCardView({
  card,
  entry,
  zoom,
  selected,
  onSelect,
}: {
  card: CanvasCard;
  entry?: Entry;
  zoom: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const updateNoteCard = useCanvasStore((state) => state.updateNoteCard);
  const moveCard = useCanvasStore((state) => state.moveCard);
  const deleteCard = useCanvasStore((state) => state.deleteCard);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    x: number;
    y: number;
  } | null>(null);
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const position = dragPosition ?? card;

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: card.x,
      y: card.y,
    };
    setDragPosition({ x: card.x, y: card.y });
    onSelect();
  }

  function continueDrag(event: PointerEvent<HTMLButtonElement>) {
    const start = dragStartRef.current;
    if (!start) return;
    setDragPosition(
      clampCanvasPosition(
        start.x + (event.clientX - start.clientX) / zoom,
        start.y + (event.clientY - start.clientY) / zoom,
      ),
    );
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!dragStartRef.current || !dragPosition) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    moveCard(card.id, dragPosition.x, dragPosition.y);
    dragStartRef.current = null;
    setDragPosition(null);
  }

  function removeCard() {
    if (window.confirm(t("canvas.deleteCardConfirm"))) deleteCard(card.id);
  }

  return (
    <article
      onMouseDown={onSelect}
      style={{
        left: position.x,
        top: position.y,
        width: CANVAS_CARD_WIDTH,
        borderTopColor: CARD_COLORS[card.color],
      }}
      className={`absolute overflow-hidden rounded-[1.25rem] border border-t-[3px] bg-[var(--surface-solid)] shadow-[0_18px_50px_rgba(0,0,0,.16)] transition-shadow ${
        selected
          ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]"
          : "hover:shadow-[0_22px_60px_rgba(0,0,0,.22)]"
      }`}
    >
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <button
          type="button"
          onPointerDown={startDrag}
          onPointerMove={continueDrag}
          onPointerUp={finishDrag}
          onPointerCancel={() => {
            dragStartRef.current = null;
            setDragPosition(null);
          }}
          className="flex h-8 flex-1 touch-none items-center gap-2 rounded-lg px-2 text-left text-[0.68rem] font-semibold uppercase tracking-[.12em] text-[var(--text-faint)] hover:bg-[var(--surface-muted)]"
          aria-label={t("canvas.dragCard")}
        >
          <GripHorizontal size={15} />
          {card.kind === "note" ? t("canvas.note") : t("canvas.entryCard")}
        </button>
        <button
          type="button"
          onClick={removeCard}
          className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:bg-red-500/10"
          aria-label={t("canvas.deleteCard")}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {card.kind === "note" ? (
        <div className="space-y-2 p-4">
          <input
            value={card.title}
            onChange={(event) =>
              updateNoteCard(card.id, {
                title: event.target.value,
                body: card.body,
                color: card.color,
              })
            }
            placeholder={t("canvas.noteTitle")}
            className="w-full border-0 bg-transparent text-base font-semibold text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
          />
          <textarea
            value={card.body}
            onChange={(event) =>
              updateNoteCard(card.id, {
                title: card.title,
                body: event.target.value,
                color: card.color,
              })
            }
            placeholder={t("canvas.noteBody")}
            rows={4}
            className="w-full resize-none border-0 bg-transparent text-sm leading-6 text-[var(--text-muted)] outline-none placeholder:text-[var(--text-faint)]"
          />
          <div className="flex gap-2 pt-1" aria-label={t("canvas.cardColor")}>
            {(Object.keys(CARD_COLORS) as CanvasCardColor[]).map((color) => (
              <button
                key={color}
                type="button"
                onClick={() =>
                  updateNoteCard(card.id, {
                    title: card.title,
                    body: card.body,
                    color,
                  })
                }
                aria-label={t(`canvas.color.${color}`)}
                aria-pressed={card.color === color}
                className={`h-5 w-5 rounded-full border-2 ${
                  card.color === color
                    ? "border-[var(--text)]"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: CARD_COLORS[color] }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-[.9rem] bg-[var(--accent-soft)] text-[var(--accent)]">
            <BookOpen size={18} />
          </div>
          <h3 className="ws-display mt-4 text-2xl font-semibold text-[var(--text)]">
            {entry?.title ?? t("entry.notFound")}
          </h3>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--text-muted)]">
            {entry?.summary || t("common.noSummary")}
          </p>
          {entry ? (
            <button
              type="button"
              onClick={() => navigate(`/entries/${entry.id}`)}
              className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              {t("canvas.openEntry")}
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}

export function CanvasPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const viewportRef = useRef<HTMLDivElement>(null);
  const cards = useCanvasStore((state) => state.cards);
  const connections = useCanvasStore((state) => state.connections);
  const zoom = useCanvasStore((state) => state.viewport.zoom);
  const addNoteCard = useCanvasStore((state) => state.addNoteCard);
  const addEntryCard = useCanvasStore((state) => state.addEntryCard);
  const addConnection = useCanvasStore((state) => state.addConnection);
  const deleteConnection = useCanvasStore((state) => state.deleteConnection);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const clearCanvas = useCanvasStore((state) => state.clearCanvas);
  const entries = useEntryStore((state) => state.entries);
  const requestedCard = cards.find(
    (card) =>
      card.kind === "entry" && card.entryId === searchParams.get("entry"),
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    requestedCard?.id ?? null,
  );
  const [entryToAdd, setEntryToAdd] = useState("");
  const [connectionTarget, setConnectionTarget] = useState("");

  const entriesById = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry])),
    [entries],
  );
  const cardsById = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  );
  const selectedCard = selectedCardId
    ? cardsById.get(selectedCardId) ?? null
    : null;
  const selectedConnections = selectedCard
    ? connections.filter(
        (connection) =>
          connection.fromCardId === selectedCard.id ||
          connection.toCardId === selectedCard.id,
      )
    : [];

  function nextCardPosition() {
    const viewport = viewportRef.current;
    if (!viewport) return { x: 80, y: 80 };
    const offset = (cards.length % 6) * 24;
    return clampCanvasPosition(
      (viewport.scrollLeft + viewport.clientWidth / 2) / zoom -
        CANVAS_CARD_WIDTH / 2 +
        offset,
      (viewport.scrollTop + viewport.clientHeight / 2) / zoom - 100 + offset,
    );
  }

  function createNote() {
    const position = nextCardPosition();
    const id = addNoteCard(position.x, position.y);
    setSelectedCardId(id);
    setConnectionTarget("");
  }

  function createEntryCard() {
    if (!entryToAdd) return;
    const position = nextCardPosition();
    const id = addEntryCard(entryToAdd, position.x, position.y);
    setSelectedCardId(id);
    setEntryToAdd("");
    setConnectionTarget("");
  }

  function cardLabel(card: CanvasCard | undefined) {
    if (!card) return t("canvas.unknownCard");
    if (card.kind === "note") return card.title || t("canvas.untitledNote");
    return entriesById.get(card.entryId)?.title ?? t("entry.notFound");
  }

  function connectSelected() {
    if (!selectedCard || !connectionTarget) return;
    addConnection(selectedCard.id, connectionTarget);
    setConnectionTarget("");
  }

  function resetCanvas() {
    if (!cards.length || window.confirm(t("canvas.clearConfirm"))) {
      clearCanvas();
      setSelectedCardId(null);
      setConnectionTarget("");
    }
  }

  function changeZoom(nextZoom: number) {
    const viewport = viewportRef.current;
    const clamped = clampCanvasZoom(nextZoom);
    if (!viewport || clamped === zoom) {
      setZoom(clamped);
      return;
    }
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / zoom;
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / zoom;
    setZoom(clamped);
    window.requestAnimationFrame(() => {
      viewport.scrollLeft = centerX * clamped - viewport.clientWidth / 2;
      viewport.scrollTop = centerY * clamped - viewport.clientHeight / 2;
    });
  }

  function fitCanvasContent() {
    const viewport = viewportRef.current;
    if (!viewport || !cards.length) return;
    const minX = Math.min(...cards.map((card) => card.x));
    const minY = Math.min(...cards.map((card) => card.y));
    const maxX = Math.max(...cards.map((card) => card.x + CANVAS_CARD_WIDTH));
    const maxY = Math.max(...cards.map((card) => card.y + 220));
    const contentWidth = Math.max(1, maxX - minX);
    const contentHeight = Math.max(1, maxY - minY);
    const targetZoom = clampCanvasZoom(
      Math.min(
        (viewport.clientWidth - 120) / contentWidth,
        (viewport.clientHeight - 120) / contentHeight,
        1,
      ),
    );
    setZoom(targetZoom);
    window.requestAnimationFrame(() => {
      viewport.scrollTo({
        left: ((minX + maxX) / 2) * targetZoom - viewport.clientWidth / 2,
        top: ((minY + maxY) / 2) * targetZoom - viewport.clientHeight / 2,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  }

  return (
    <MotionPage className="space-y-5">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="ws-page-title">
            {t("nav.canvas")}
          </h2>
          <p className="ws-page-status">
            {t("canvas.headerStatus", {
              cards: cards.length,
              connections: connections.length,
              zoom: Math.round(zoom * 100),
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={createNote}
            className="ws-button-primary flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold"
          >
            <StickyNote size={16} />
            {t("canvas.addNote")}
          </button>
          {cards.length > 0 ? (
            <button
              type="button"
              onClick={resetCanvas}
              className="flex min-h-11 items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-5 text-sm font-semibold text-red-500 transition hover:bg-red-500/15"
            >
              <Trash2 size={16} />
              {t("canvas.clear")}
            </button>
          ) : null}
        </div>
      </header>

      <section className="ws-compact-surface p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <select
              value={entryToAdd}
              onChange={(event) => setEntryToAdd(event.target.value)}
              className="ws-input h-10 min-w-0 flex-1 rounded-xl px-3 text-sm xl:max-w-sm"
              aria-label={t("canvas.chooseEntry")}
            >
              <option value="">{t("canvas.chooseEntry")}</option>
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={createEntryCard}
              disabled={!entryToAdd}
              className="ws-button-secondary flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold"
            >
              <Plus size={15} />
              {t("canvas.addEntry")}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 xl:justify-end">
            <div className="flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] p-1">
              <button
                type="button"
                onClick={() => changeZoom(zoom - 0.1)}
                disabled={zoom <= MIN_CANVAS_ZOOM}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--surface-raised)]"
                aria-label={t("canvas.zoomOut")}
              >
                <ZoomOut size={15} />
              </button>
              <span className="w-14 text-center text-xs font-semibold text-[var(--text-muted)]">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => changeZoom(zoom + 0.1)}
                disabled={zoom >= MAX_CANVAS_ZOOM}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--surface-raised)]"
                aria-label={t("canvas.zoomIn")}
              >
                <ZoomIn size={15} />
              </button>
            </div>
            {cards.length ? (
              <button
                type="button"
                onClick={fitCanvasContent}
                className="flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
              >
                <Scan size={15} />
                {t("canvas.fitContent")}
              </button>
            ) : null}
          </div>
        </div>

        {selectedCard ? (
          <div className="mt-3 flex flex-col gap-3 border-t border-[var(--border)] pt-3 xl:flex-row xl:items-center">
            <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
              <MousePointer2 size={14} className="text-[var(--accent)]" />
              <span className="truncate">{cardLabel(selectedCard)}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row xl:justify-end">
              <select
                value={connectionTarget}
                onChange={(event) => setConnectionTarget(event.target.value)}
                className="ws-input min-h-10 min-w-0 flex-1 rounded-full px-4 text-xs xl:max-w-xs"
                aria-label={t("canvas.connectTo")}
              >
                <option value="">{t("canvas.connectTo")}</option>
                {cards
                  .filter((card) => card.id !== selectedCard.id)
                  .map((card) => (
                    <option key={card.id} value={card.id}>
                      {cardLabel(card)}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={connectSelected}
                disabled={!connectionTarget}
                className="ws-button-secondary flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold"
              >
                <Link2 size={14} />
                {t("canvas.connect")}
              </button>
            </div>

            {selectedConnections.length ? (
              <div className="flex max-w-full gap-2 overflow-x-auto">
                {selectedConnections.map((connection) => {
                  const otherId =
                    connection.fromCardId === selectedCard.id
                      ? connection.toCardId
                      : connection.fromCardId;
                  return (
                    <button
                      key={connection.id}
                      type="button"
                      onClick={() => deleteConnection(connection.id)}
                      className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-3 py-2 text-[0.68rem] text-[var(--text-muted)] hover:text-red-500"
                      aria-label={t("canvas.removeConnection", {
                        name: cardLabel(cardsById.get(otherId)),
                      })}
                    >
                      <Unlink size={12} />
                      {cardLabel(cardsById.get(otherId))}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="relative overflow-hidden rounded-xl border border-[var(--border)]">
        <div
          ref={viewportRef}
          className="h-[72vh] min-h-[32rem] overflow-auto bg-[var(--bg-subtle)]"
          aria-label={t("canvas.workspace")}
        >
          <div
            style={{ width: CANVAS_WIDTH * zoom, height: CANVAS_HEIGHT * zoom }}
            className="relative"
          >
            <div
              style={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                backgroundImage:
                  "radial-gradient(circle, color-mix(in srgb, var(--text-faint) 24%, transparent) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
              className="absolute left-0 top-0"
            >
              <svg
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
              >
                {connections.map((connection) => {
                  const from = cardsById.get(connection.fromCardId);
                  const to = cardsById.get(connection.toCardId);
                  if (!from || !to) return null;
                  return (
                    <line
                      key={connection.id}
                      x1={from.x + CANVAS_CARD_WIDTH / 2}
                      y1={from.y + CANVAS_CARD_CENTER_Y}
                      x2={to.x + CANVAS_CARD_WIDTH / 2}
                      y2={to.y + CANVAS_CARD_CENTER_Y}
                      stroke="var(--accent)"
                      strokeOpacity="0.52"
                      strokeWidth="2"
                      strokeDasharray="6 6"
                    />
                  );
                })}
              </svg>

              {cards.map((card) => (
                <CanvasCardView
                  key={card.id}
                  card={card}
                  entry={
                    card.kind === "entry"
                      ? entriesById.get(card.entryId)
                      : undefined
                  }
                  zoom={zoom}
                  selected={selectedCardId === card.id}
                  onSelect={() => {
                    setSelectedCardId(card.id);
                    setConnectionTarget("");
                  }}
                />
              ))}

            </div>
          </div>
        </div>
        {!cards.length ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="w-full max-w-md">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                <GitBranch size={24} />
              </span>
              <h3 className="ws-display mt-5 text-3xl font-semibold text-[var(--text)]">{t("canvas.empty")}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{t("canvas.emptyHelp")}</p>
            </div>
          </div>
        ) : null}
      </section>
    </MotionPage>
  );
}
