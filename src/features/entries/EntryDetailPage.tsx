import {
  ArrowLeft,
  Calendar,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  GitBranch,
  LayoutDashboard,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { MotionPage } from "../../shared/components/MotionPage";
import { RichTextEditor } from "./components/RichTextEditor";
import { deleteEntryCascade } from "./actions/deleteEntryCascade";
import { useEntryStore } from "./stores/useEntryStore";
import {
  formatEntryDateTime,
  formatEntryRelative,
} from "./utils/formatEntryDate";
import { EntryTypeBadge } from "./components/EntryTypeBadge";
import { getEntryTypeMeta } from "./utils/entryTypeMeta";
import { useI18n } from "../../shared/i18n";
import { useRelationshipStore } from "../graph/stores/useRelationshipStore";
import { useMapStore } from "../map/stores/useMapStore";
import { useTimelineStore } from "../timeline/stores/useTimelineStore";
import { useCanvasStore } from "../canvas/stores/useCanvasStore";

type SaveStatus = "idle" | "saving" | "saved";
type PendingContentSave = { entryId: string; content: string };

function htmlToPlainText(html: string) {
  if (!html) return "";

  const element = document.createElement("div");
  element.innerHTML = html;

  return element.textContent ?? "";
}

function getWritingStats(html: string) {
  const text = htmlToPlainText(html).trim();

  const cjkCount = text.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const englishWordCount =
    text
      .replace(/[\u4e00-\u9fff]/g, " ")
      .match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0;

  return {
    characters: text.length,
    words: cjkCount + englishWordCount,
  };
}

export function EntryDetailPage() {
  const { entryId } = useParams();
  return (
    <EntryDetailPageContent
      key={entryId ?? "missing-entry"}
      entryId={entryId}
    />
  );
}

function EntryDetailPageContent({ entryId }: { entryId: string | undefined }) {
  const navigate = useNavigate();
  const { locale, t } = useI18n();

  const entries = useEntryStore((state) => state.entries);
  const openEditEntry = useEntryStore((state) => state.openEditEntry);
  const updateEntryContent = useEntryStore(
    (state) => state.updateEntryContent,
  );
  const relationships = useRelationshipStore((state) => state.relationships);
  const maps = useMapStore((state) => state.maps);
  const markers = useMapStore((state) => state.markers);
  const timelineItems = useTimelineStore((state) => state.items);
  const canvasCards = useCanvasStore((state) => state.cards);

  const entry = useMemo(
    () => entries.find((item) => item.id === entryId),
    [entries, entryId]
  );
  const linkedRelationships = useMemo(
    () =>
      relationships.filter(
        (item) =>
          item.sourceEntryId === entryId || item.targetEntryId === entryId,
      ),
    [entryId, relationships],
  );
  const linkedMarkers = useMemo(
    () => markers.filter((marker) => entryId && marker.entryIds.includes(entryId)),
    [entryId, markers],
  );
  const linkedTimelineItems = useMemo(
    () => timelineItems.filter((item) => item.entryId === entryId),
    [entryId, timelineItems],
  );
  const linkedCanvasCards = useMemo(
    () =>
      canvasCards.filter(
        (card) => card.kind === "entry" && card.entryId === entryId,
      ),
    [canvasCards, entryId],
  );

  const [isEditingContent, setIsEditingContent] = useState(false);
  const [draftContent, setDraftContent] = useState(entry?.content ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    entry ? "saved" : "idle",
  );
  const pendingContentSaveRef = useRef<PendingContentSave | null>(null);

  const writingStats = useMemo(
    () => getWritingStats(isEditingContent ? draftContent : entry?.content ?? ""),
    [draftContent, entry?.content, isEditingContent]
  );
  const currentEntryId = entry?.id;
  const savedContent = entry?.content;

  useEffect(() => {
    if (!currentEntryId) return;
    if (!isEditingContent) return;
    if (draftContent === savedContent) return;

    const timer = window.setTimeout(() => {
      const pending = pendingContentSaveRef.current;
      if (
        !pending ||
        pending.entryId !== currentEntryId ||
        pending.content !== draftContent
      )
        return;

      updateEntryContent(pending.entryId, pending.content);
      pendingContentSaveRef.current = null;
      setSaveStatus("saved");
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    currentEntryId,
    draftContent,
    isEditingContent,
    savedContent,
    updateEntryContent,
  ]);

  useEffect(
    () => () => {
      const pending = pendingContentSaveRef.current;
      if (!pending) return;

      useEntryStore
        .getState()
        .updateEntryContent(pending.entryId, pending.content);
      pendingContentSaveRef.current = null;
    },
    [],
  );

  function handleContentChange(content: string) {
    setDraftContent(content);

    if (!entry || content === entry.content) {
      pendingContentSaveRef.current = null;
      setSaveStatus("saved");
      return;
    }

    pendingContentSaveRef.current = { entryId: entry.id, content };
    setSaveStatus("saving");
  }

  function finishEditingContent() {
    const pending = pendingContentSaveRef.current;
    if (pending) {
      updateEntryContent(pending.entryId, pending.content);
      pendingContentSaveRef.current = null;
    }

    setSaveStatus("saved");
    setIsEditingContent(false);
  }

  function handleDelete() {
    if (!entry) return;

    const confirmed = window.confirm(
      t("entry.deleteConfirm", { title: entry.title }),
    );

    if (confirmed) {
      pendingContentSaveRef.current = null;
      deleteEntryCascade(entry.id);
      navigate("/entries");
    }
  }

  if (!entry) {
    return (
      <MotionPage className="space-y-6">
        <button
          type="button"
          onClick={() => navigate("/entries")}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          {t("entry.back")}
        </button>

        <section className="ws-surface rounded-[2rem] p-8">
          <p className="ws-eyebrow">{t("entry.missingRecord")}</p>

          <h2 className="ws-display mt-4 text-4xl font-semibold text-[var(--text)]">
            {t("entry.notFound")}
          </h2>

          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            {t("entry.deleted")}
          </p>
        </section>
      </MotionPage>
    );
  }

  const typeMeta = getEntryTypeMeta(entry.type);

  return (
    <MotionPage className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/entries")}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          {t("entry.back")}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditEntry(entry.id)}
            className="ws-button-secondary flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold"
          >
            <Pencil size={16} strokeWidth={1.75} />
            {t("entry.quickEdit")}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="flex h-10 items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-4 text-sm font-semibold text-red-500 transition hover:bg-red-500/15"
          >
            <Trash2 size={16} strokeWidth={1.75} />
            {t("common.delete")}
          </button>
        </div>
      </div>

      <section
        className={[
          "ws-surface-raised relative overflow-hidden rounded-[2.25rem] p-7 md:p-8",
          typeMeta.borderClassName,
        ].join(" ")}
      >
        <div
          className={[
            "pointer-events-none absolute inset-0 opacity-70",
            typeMeta.glowClassName,
          ].join(" ")}
        />

        <div className="relative grid gap-8 xl:grid-cols-[1fr_20rem]">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <EntryTypeBadge type={entry.type} />

              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                <Clock3 size={13} strokeWidth={1.8} />
                {t("common.updated")} {formatEntryRelative(entry.updatedAt, locale)}
              </span>
            </div>

            <h1 className="ws-display-tight max-w-4xl text-5xl font-semibold leading-[0.98] text-[var(--text)] md:text-6xl">
              {entry.title}
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--text-muted)]">
              {entry.summary || t("common.noSummary")}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {entry.tags.length > 0 ? (
                entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]"
                  >
                    #{tag}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text-faint)]">
                  {t("common.noTags")}
                </span>
              )}
            </div>
          </div>

          <aside className="ws-surface-soft rounded-[1.75rem] p-5">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--text-faint)]">
              {t("entry.recordDetails")}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">
                  {t("common.type")}
                </div>
                <EntryTypeBadge type={entry.type} />
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                  {t(`type.${entry.type}.description`)}
                </p>
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">
                  <Calendar size={14} strokeWidth={1.7} />
                  {t("common.created")}
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {formatEntryDateTime(entry.createdAt, locale)}
                </p>
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-faint)]">
                  <Clock3 size={14} strokeWidth={1.7} />
                  {t("common.updated")}
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {formatEntryDateTime(entry.updatedAt, locale)}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <article className="ws-surface rounded-[2rem] p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="ws-eyebrow">{t("entry.loreNotes")}</p>

              <h2 className="ws-display mt-2 text-3xl font-semibold text-[var(--text)]">
                {t("entry.mainText")}
              </h2>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {t("entry.wordsCharacters", writingStats)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isEditingContent ? (
                <span className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--text-muted)]">
                  {saveStatus === "saving" ? (
                    <>
                      <Clock3 size={15} strokeWidth={1.8} />
                      {t("entry.saving")}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} strokeWidth={1.8} />
                      {t("entry.savedLocally")}
                    </>
                  )}
                </span>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  isEditingContent
                    ? finishEditingContent()
                    : setIsEditingContent(true)
                }
                className="ws-button-secondary flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold"
              >
                <FileText size={16} strokeWidth={1.75} />
                {isEditingContent ? t("entry.done") : t("entry.editNotes")}
              </button>
            </div>
          </div>

          {isEditingContent ? (
            <RichTextEditor
              value={draftContent}
              onChange={handleContentChange}
              editable
              placeholder={t("entry.writePlaceholder")}
            />
          ) : entry.content ? (
            <RichTextEditor value={entry.content} editable={false} />
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] px-6 py-12 text-center">
              <h3 className="ws-display text-3xl font-semibold text-[var(--text)]">
                {t("common.noContent")}
              </h3>

              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-muted)]">
                {t("entry.addNotes")}
              </p>

              <button
                type="button"
                onClick={() => setIsEditingContent(true)}
                className="ws-button-primary mt-6 rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                {t("entry.startWriting")}
              </button>
            </div>
          )}
        </article>

        <aside className="space-y-6">
          <section className="ws-surface rounded-[2rem] p-5">
            <p className="ws-eyebrow">{t("common.tags")}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {entry.tags.length > 0 ? (
                entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)]"
                  >
                    #{tag}
                  </span>
                ))
              ) : (
                <p className="text-sm text-[var(--text-muted)]">{t("common.noTags")}</p>
              )}
            </div>
          </section>

          <section className="ws-surface rounded-[2rem] p-5">
            <p className="ws-eyebrow">{t("entry.linkedRecords")}</p>

            <div className="mt-4 space-y-2">
              {[
                {
                  key: "relationships",
                  label: t("dashboard.relations"),
                  count: linkedRelationships.length,
                  icon: GitBranch,
                  target: `/graph?mode=local&focus=${entry.id}`,
                },
                {
                  key: "markers",
                  label: t("entry.mapMarkers"),
                  count: linkedMarkers.length,
                  icon: MapPin,
                  target: linkedMarkers[0]
                    ? `/map?map=${linkedMarkers[0].mapId}&marker=${linkedMarkers[0].id}`
                    : "/map",
                },
                {
                  key: "timeline",
                  label: t("entry.timelineEvents"),
                  count: linkedTimelineItems.length,
                  icon: CalendarRange,
                  target: `/timeline?entry=${entry.id}`,
                },
                {
                  key: "canvas",
                  label: t("entry.canvasCards"),
                  count: linkedCanvasCards.length,
                  icon: LayoutDashboard,
                  target: `/canvas?entry=${entry.id}`,
                },
              ].map(({ key, label, count, icon: Icon, target }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => navigate(target)}
                  className="flex w-full items-center gap-3 rounded-[1rem] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-left text-sm transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                >
                  <Icon size={16} className="text-[var(--accent)]" />
                  <span className="min-w-0 flex-1 text-[var(--text-muted)]">
                    {label}
                  </span>
                  <span className="rounded-full bg-[var(--surface-solid)] px-2 py-0.5 text-xs font-semibold text-[var(--text)]">
                    {count}
                  </span>
                  <ChevronRight size={15} className="text-[var(--text-faint)]" />
                </button>
              ))}
            </div>

            {linkedMarkers.length > 0 ? (
              <p className="mt-4 text-xs leading-5 text-[var(--text-faint)]">
                {t("entry.firstMapMarker", {
                  marker: linkedMarkers[0].title,
                  map:
                    maps.find((map) => map.id === linkedMarkers[0].mapId)?.name ??
                    t("entry.unknownMap"),
                })}
              </p>
            ) : (
              <p className="mt-4 text-xs leading-5 text-[var(--text-faint)]">
                {t("entry.noLinkedRecords")}
              </p>
            )}
          </section>
        </aside>
      </section>
    </MotionPage>
  );
}
