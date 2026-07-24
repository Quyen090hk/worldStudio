import {
  GripHorizontal,
  Copy,
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
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { MotionPage } from "../../shared/components/MotionPage";
import { useSoftDialog } from "../../shared/components/softDialogContext";
import { useI18n } from "../../shared/i18n";
import { SelectMenu } from "../../shared/components/SelectMenu";
import { useEntryStore } from "../entries/stores/useEntryStore";
import type { Entry } from "../entries/types";
import { AssetThumbnail } from "../assets/components/AssetThumbnail";
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
import {
  removeCanvasCardsWithUndo,
  removeCanvasConnectionWithUndo,
} from "../../shared/undo/workspaceUndoActions";

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
  onPositionPreview,
  onDelete,
}: {
  card: CanvasCard;
  entry?: Entry;
  zoom: number;
  selected: boolean;
  onSelect: (additive?: boolean) => void;
  onPositionPreview: (position: { x: number; y: number } | null) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const updateNoteCard = useCanvasStore((state) => state.updateNoteCard);
  const moveCard = useCanvasStore((state) => state.moveCard);
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
    const unclamped = clampCanvasPosition(
      start.x + (event.clientX - start.clientX) / zoom,
      start.y + (event.clientY - start.clientY) / zoom,
    );
    const nextPosition = {
      x: Math.round(unclamped.x / 12) * 12,
      y: Math.round(unclamped.y / 12) * 12,
    };
    setDragPosition(nextPosition);
    onPositionPreview(nextPosition);
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!dragStartRef.current || !dragPosition) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    moveCard(card.id, dragPosition.x, dragPosition.y);
    dragStartRef.current = null;
    setDragPosition(null);
    onPositionPreview(null);
  }

  function cancelDrag() {
    dragStartRef.current = null;
    setDragPosition(null);
    onPositionPreview(null);
  }

  return (
    <article
      onMouseDown={(event) => onSelect(event.ctrlKey || event.metaKey)}
      style={{
        left: position.x,
        top: position.y,
        width: CANVAS_CARD_WIDTH,
        borderTopColor: CARD_COLORS[card.color],
      }}
      className={`ws-card-interactive group absolute overflow-hidden border-t-[3px] ${
        selected
          ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]"
          : ""
      }`}
    >
      <div className={`ws-floating-control absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full p-1 transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"}`}>
        <button
          type="button"
          onPointerDown={startDrag}
          onPointerMove={continueDrag}
          onPointerUp={finishDrag}
          onPointerCancel={cancelDrag}
          className="flex h-7 w-7 touch-none items-center justify-center rounded-full text-[var(--text-faint)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
          aria-label={t("canvas.dragCard")}
        >
          <GripHorizontal size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-faint)] hover:bg-red-500/10 hover:text-red-500"
          aria-label={t("canvas.deleteCard")}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {card.kind === "note" ? (
        <div className="space-y-2 p-4 pt-5">
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
            className="w-full border-0 bg-transparent text-lg font-semibold leading-snug text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
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
            className="w-full resize-none border-0 bg-transparent text-[0.95rem] leading-6 text-[var(--text-muted)] outline-none placeholder:text-[var(--text-faint)]"
          />
          <div className={`gap-2 pt-1 ${selected ? "flex" : "hidden group-focus-within:flex"}`} aria-label={t("canvas.cardColor")}>
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
        <button type="button" disabled={!entry} onClick={() => entry && navigate(`/entries/${entry.id}`)} className="block w-full text-left">
          {entry?.media?.bannerAssetId || entry?.media?.primaryAssetId ? (
            <AssetThumbnail assetId={(entry.media.bannerAssetId ?? entry.media.primaryAssetId)!} alt={entry.title} className="aspect-[16/9] w-full border-b border-[var(--border)]" />
          ) : null}
          <span className="block p-4 pt-5">
            <strong className="ws-display block line-clamp-2 text-[1.4rem] font-semibold leading-[1.15] text-[var(--text)]">{entry?.title ?? t("entry.notFound")}</strong>
            {entry?.summary ? <small className="mt-2.5 block line-clamp-3 text-sm leading-6 text-[var(--text-muted)]">{entry.summary}</small> : null}
          </span>
        </button>
      )}
    </article>
  );
}

export function CanvasPage() {
  const { t } = useI18n();
  const dialog = useSoftDialog();
  const [searchParams] = useSearchParams();
  const viewportRef = useRef<HTMLDivElement>(null);
  const cards = useCanvasStore((state) => state.cards);
  const connections = useCanvasStore((state) => state.connections);
  const zoom = useCanvasStore((state) => state.viewport.zoom);
  const addNoteCard = useCanvasStore((state) => state.addNoteCard);
  const addEntryCard = useCanvasStore((state) => state.addEntryCard);
  const addConnection = useCanvasStore((state) => state.addConnection);
  const duplicateCard = useCanvasStore((state) => state.duplicateCard);
  const arrangeCards = useCanvasStore((state) => state.arrangeCards);
  const moveCard = useCanvasStore((state) => state.moveCard);
  const updateConnectionLabel = useCanvasStore((state) => state.updateConnectionLabel);
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
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    () => new Set(requestedCard ? [requestedCard.id] : []),
  );
  const [entryToAdd, setEntryToAdd] = useState("");
  const [connectionTarget, setConnectionTarget] = useState("");
  const [connectionLabel, setConnectionLabel] = useState("");
  const [previewPositions, setPreviewPositions] = useState<Record<string, { x: number; y: number }>>({});

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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (!selectedCard || target?.matches("input, textarea, select, [contenteditable=true]")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "d") {
        event.preventDefault();
        const ids = [...selectedCardIds].map((cardId) => duplicateCard(cardId)).filter((id): id is string => Boolean(id));
        if (ids.length) { setSelectedCardId(ids.at(-1)!); setSelectedCardIds(new Set(ids)); }
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeCanvasCardsWithUndo(selectedCardIds, t("canvas.cardsCount", { count: selectedCardIds.size }));
        setSelectedCardId(null);
        setSelectedCardIds(new Set());
        return;
      }
      const delta = event.shiftKey ? 24 : 6;
      const movement: Record<string, [number, number]> = {
        ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, -delta], ArrowDown: [0, delta],
      };
      const offset = movement[event.key];
      if (!offset) return;
      event.preventDefault();
      selectedCardIds.forEach((id) => {
        const card = cardsById.get(id);
        if (!card) return;
        const next = clampCanvasPosition(card.x + offset[0], card.y + offset[1]);
        moveCard(id, next.x, next.y);
      });
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cardsById, duplicateCard, moveCard, selectedCard, selectedCardIds, t]);

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
    setSelectedCardIds(new Set([id]));
    setConnectionTarget("");
  }

  function createEntryCard() {
    if (!entryToAdd) return;
    const position = nextCardPosition();
    const id = addEntryCard(entryToAdd, position.x, position.y);
    setSelectedCardId(id);
    setSelectedCardIds(new Set([id]));
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
    addConnection(selectedCard.id, connectionTarget, connectionLabel);
    setConnectionTarget("");
    setConnectionLabel("");
  }

  async function resetCanvas() {
    if (!cards.length || await dialog.confirm({ message: t("canvas.clearConfirm"), danger: true, confirmLabel: t("canvas.clear") })) {
      clearCanvas();
      setSelectedCardId(null);
      setSelectedCardIds(new Set());
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
    <MotionPage className="space-y-4">
      <div className="ws-workbench flex-wrap">
        <div className="ws-workbench-meta">
          <p>
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
              onClick={() => void resetCanvas()}
              className="flex min-h-11 items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-5 text-sm font-semibold text-red-500 transition hover:bg-red-500/15"
            >
              <Trash2 size={16} />
              {t("canvas.clear")}
            </button>
          ) : null}
        </div>
      </div>

      <section className="ws-compact-surface p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
            <SelectMenu
              value={entryToAdd}
              onChange={setEntryToAdd}
              className="h-10 min-w-0 flex-1 xl:max-w-sm"
              ariaLabel={t("canvas.chooseEntry")}
              options={[{ value: "", label: t("canvas.chooseEntry") }, ...entries.map((entry) => ({ value: entry.id, label: entry.title }))]}
            />
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
            <button type="button" onClick={() => { const ids = [...selectedCardIds].map((id) => duplicateCard(id)).filter((id): id is string => Boolean(id)); if (ids.length) { setSelectedCardId(ids.at(-1)!); setSelectedCardIds(new Set(ids)); } }} className="flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"><Copy size={14} />{t("canvas.duplicate")}</button>
            {selectedCardIds.size > 1 ? <div className="flex gap-1"><button type="button" onClick={() => arrangeCards([...selectedCardIds], "left")} className="h-9 rounded-lg px-2 text-[0.68rem] hover:bg-[var(--surface-muted)]">{t("canvas.alignLeft")}</button><button type="button" onClick={() => arrangeCards([...selectedCardIds], "top")} className="h-9 rounded-lg px-2 text-[0.68rem] hover:bg-[var(--surface-muted)]">{t("canvas.alignTop")}</button>{selectedCardIds.size > 2 ? <><button type="button" onClick={() => arrangeCards([...selectedCardIds], "horizontal")} className="h-9 rounded-lg px-2 text-[0.68rem] hover:bg-[var(--surface-muted)]">{t("canvas.distributeHorizontal")}</button><button type="button" onClick={() => arrangeCards([...selectedCardIds], "vertical")} className="h-9 rounded-lg px-2 text-[0.68rem] hover:bg-[var(--surface-muted)]">{t("canvas.distributeVertical")}</button></> : null}</div> : null}
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row xl:justify-end">
              <SelectMenu
                value={connectionTarget}
                onChange={setConnectionTarget}
                className="min-h-10 min-w-0 flex-1 xl:max-w-xs"
                ariaLabel={t("canvas.connectTo")}
                buttonClassName="rounded-full px-4 text-xs"
                options={[{ value: "", label: t("canvas.connectTo") }, ...cards
                  .filter((card) => card.id !== selectedCard.id)
                  .map((card) => ({ value: card.id, label: cardLabel(card) }))]}
              />
              <input
                value={connectionLabel}
                onChange={(event) => setConnectionLabel(event.target.value.slice(0, 48))}
                placeholder={t("canvas.connectionLabelPlaceholder")}
                className="ws-input min-h-10 min-w-0 flex-1 rounded-full px-4 text-xs xl:max-w-[13rem]"
                aria-label={t("canvas.connectionLabel")}
              />
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
                    <span
                      key={connection.id}
                      className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] p-1 pl-3"
                    >
                      <span className="max-w-24 truncate text-[0.68rem] text-[var(--text-faint)]">{cardLabel(cardsById.get(otherId))}</span>
                      <input value={connection.label ?? ""} onChange={(event) => updateConnectionLabel(connection.id, event.target.value)} placeholder={t("canvas.connectionLabelShort")} className="w-24 bg-transparent px-1 text-[0.68rem] font-semibold text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]" aria-label={t("canvas.connectionLabel")} />
                      <button type="button" onClick={() => removeCanvasConnectionWithUndo(connection.id, cardLabel(cardsById.get(otherId)))} className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-faint)] hover:bg-red-500/10 hover:text-red-500" aria-label={t("canvas.removeConnection", { name: cardLabel(cardsById.get(otherId)) })}><Unlink size={12} /></button>
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="ws-viewport">
        <div
          ref={viewportRef}
          className="h-[68dvh] min-h-[28rem] overflow-auto bg-[var(--bg-subtle)] lg:h-[72vh] lg:min-h-[32rem]"
          aria-label={t("canvas.workspace")}
          aria-describedby="canvas-keyboard-help"
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
                <defs>
                  <marker id="canvas-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
                  </marker>
                </defs>
                {connections.map((connection) => {
                  const storedFrom = cardsById.get(connection.fromCardId);
                  const storedTo = cardsById.get(connection.toCardId);
                  if (!storedFrom || !storedTo) return null;
                  const from = { ...storedFrom, ...previewPositions[storedFrom.id] };
                  const to = { ...storedTo, ...previewPositions[storedTo.id] };
                  const x1 = from.x + CANVAS_CARD_WIDTH / 2;
                  const y1 = from.y + CANVAS_CARD_CENTER_Y;
                  const x2 = to.x + CANVAS_CARD_WIDTH / 2;
                  const y2 = to.y + CANVAS_CARD_CENTER_Y;
                  const label = connection.label?.trim();
                  const labelWidth = Math.min(180, Math.max(42, (label?.length ?? 0) * 7 + 18));
                  return (
                    <g key={connection.id}>
                    <line
                      x1={from.x + CANVAS_CARD_WIDTH / 2}
                      y1={from.y + CANVAS_CARD_CENTER_Y}
                      x2={to.x + CANVAS_CARD_WIDTH / 2}
                      y2={to.y + CANVAS_CARD_CENTER_Y}
                      stroke="var(--accent)"
                      strokeOpacity="0.68"
                      strokeWidth="2"
                      markerEnd="url(#canvas-arrow)"
                    />
                    {label ? <g transform={`translate(${(x1 + x2) / 2} ${(y1 + y2) / 2})`}>
                      <rect x={-labelWidth / 2} y="-12" width={labelWidth} height="24" rx="12" fill="var(--surface-solid)" stroke="var(--border-strong)" />
                      <text textAnchor="middle" dominantBaseline="central" fill="var(--text-muted)" fontSize="11" fontWeight="600">{label.length > 22 ? `${label.slice(0, 21)}…` : label}</text>
                    </g> : null}
                    </g>
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
                  selected={selectedCardIds.has(card.id)}
                  onSelect={(additive = false) => {
                    setSelectedCardIds((current) => {
                      if (!additive) { setSelectedCardId(card.id); return new Set([card.id]); }
                      const next = new Set(current);
                      if (next.has(card.id)) next.delete(card.id); else next.add(card.id);
                      setSelectedCardId(next.has(card.id) ? card.id : (next.values().next().value ?? null));
                      return next;
                    });
                    setConnectionTarget("");
                  }}
                  onPositionPreview={(position) => setPreviewPositions((current) => {
                    if (position) return { ...current, [card.id]: position };
                    const next = { ...current };
                    delete next[card.id];
                    return next;
                  })}
                  onDelete={() => {
                    removeCanvasCardsWithUndo([card.id], cardLabel(card));
                    setSelectedCardIds((current) => {
                      const next = new Set(current);
                      next.delete(card.id);
                      return next;
                    });
                    if (selectedCardId === card.id) setSelectedCardId(null);
                  }}
                />
              ))}

            </div>
          </div>
        </div>
        <p id="canvas-keyboard-help" className="sr-only">{t("canvas.keyboardHelp")}</p>
        {!cards.length ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
            <div className="ws-empty-state w-full max-w-md">
              <h3 className="text-sm font-semibold text-[var(--text-muted)]">{t("canvas.empty")}</h3>
            </div>
          </div>
        ) : null}
      </section>
    </MotionPage>
  );
}
