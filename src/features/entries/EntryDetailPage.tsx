import {
  ArrowLeft,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  GitBranch,
  History,
  LayoutDashboard,
  MapPin,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { MotionPage } from "../../shared/components/MotionPage";
import { useSoftDialog } from "../../shared/components/softDialogContext";
import { RichTextReadView } from "./components/RichTextReadView";
import { deleteEntryCascade } from "./actions/deleteEntryCascade";
import { useEntryStore } from "./stores/useEntryStore";
import {
  formatEntryDateTime,
  formatEntryRelative,
} from "./utils/formatEntryDate";
import { EntryTypeBadge } from "./components/EntryTypeBadge";
import { AdvancedEditorSurface } from "./components/AdvancedEditorSurface";
import { getEntryTypeMeta } from "./utils/entryTypeMeta";
import { normalizeEntryContent } from "./utils/normalizeEntryContent";
import { getReferencedEntryIds } from "./utils/entryReferences";
import { useI18n } from "../../shared/i18n";
import { useRelationshipStore } from "../graph/stores/useRelationshipStore";
import { useMapStore } from "../map/stores/useMapStore";
import { useTimelineStore } from "../timeline/stores/useTimelineStore";
import { useCanvasStore } from "../canvas/stores/useCanvasStore";
import { EntryGallery, EntryHeroMedia } from "./components/EntryMediaView";
import { EntryPropertiesView } from "./components/EntryPropertiesView";
import { readEntryDraft, writeEntryDraft } from "./entryDraftStorage";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type PendingContentSave = { entryId: string; content: string };

function htmlToPlainText(html: string) {
  if (!html) return "";

  const element = document.createElement("div");
  element.innerHTML = html;

  return element.textContent ?? "";
}

function getWritingStats(html: string) {
  const text = htmlToPlainText(normalizeEntryContent(html)).trim();

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
  const dialog = useSoftDialog();

  const entries = useEntryStore((state) => state.entries);
  const openEditEntry = useEntryStore((state) => state.openEditEntry);
  const updateEntryContent = useEntryStore(
    (state) => state.updateEntryContent,
  );
  const revisions = useEntryStore((state) => state.revisions);
  const createRevision = useEntryStore((state) => state.createRevision);
  const restoreRevision = useEntryStore((state) => state.restoreRevision);
  const relationships = useRelationshipStore((state) => state.relationships);
  const maps = useMapStore((state) => state.maps);
  const markers = useMapStore((state) => state.markers);
  const timelineItems = useTimelineStore((state) => state.items);
  const canvasCards = useCanvasStore((state) => state.cards);

  const entry = useMemo(
    () => entries.find((item) => item.id === entryId),
    [entries, entryId]
  );
  const entryContent = useMemo(
    () => entry?.content ?? "",
    [entry?.content],
  );
  const referenceEntries = useMemo(
    () =>
      entries
        .filter((item) => item.id !== entryId)
        .map(({ id, title, type }) => ({ id, title, type })),
    [entries, entryId],
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
  const backlinks = useMemo(
    () =>
      entryId
        ? entries.filter(
            (item) =>
              item.id !== entryId &&
              getReferencedEntryIds(normalizeEntryContent(item.content)).has(entryId),
          )
        : [],
    [entries, entryId],
  );
  const entryRevisions = useMemo(
    () => revisions.filter((revision) => revision.entryId === entryId),
    [entryId, revisions],
  );

  const [isEditingContent, setIsEditingContent] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draftContent, setDraftContent] = useState(entryContent);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    entry ? "saved" : "idle",
  );
  const pendingContentSaveRef = useRef<PendingContentSave | null>(null);
  const draftWriteSequenceRef = useRef(0);

  const writingStats = useMemo(
    () => getWritingStats(isEditingContent ? draftContent : entryContent),
    [draftContent, entryContent, isEditingContent]
  );
  const currentEntryId = entry?.id;
  const savedContent = entryContent;

  useEffect(() => {
    if (!currentEntryId) return;
    let cancelled = false;
    void readEntryDraft(currentEntryId).then(async (draft) => {
      if (cancelled || !draft || draft.content === savedContent) return;
      const restore = await dialog.confirm({
        message: t("entry.restoreDraftConfirm"),
        confirmLabel: t("entry.restoreDraft"),
      });
      if (cancelled || !restore) return;
      setDraftContent(draft.content);
      pendingContentSaveRef.current = {
        entryId: currentEntryId,
        content: draft.content,
      };
      setSaveStatus("saving");
      setIsEditingContent(true);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [currentEntryId, dialog, savedContent, t]);

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
      const sequence = ++draftWriteSequenceRef.current;
      void writeEntryDraft(pending.entryId, pending.content)
        .then(() => {
          if (draftWriteSequenceRef.current === sequence) setSaveStatus("saved");
        })
        .catch(() => {
          if (draftWriteSequenceRef.current === sequence) setSaveStatus("error");
        });
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

  useEffect(() => {
    function flushPending() {
      const pending = pendingContentSaveRef.current;
      if (!pending) return;
      useEntryStore.getState().updateEntryContent(pending.entryId, pending.content);
      void writeEntryDraft(pending.entryId, pending.content);
      pendingContentSaveRef.current = null;
    }
    function handleVisibility() {
      if (document.visibilityState === "hidden") flushPending();
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!pendingContentSaveRef.current) return;
      flushPending();
      event.preventDefault();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  function handleContentChange(content: string) {
    setDraftContent(content);

    if (!entry || content === entryContent) {
      pendingContentSaveRef.current = null;
      setSaveStatus("saved");
      return;
    }

    pendingContentSaveRef.current = { entryId: entry.id, content };
    setSaveStatus("saving");
    const sequence = ++draftWriteSequenceRef.current;
    void writeEntryDraft(entry.id, content)
      .then(() => {
        if (draftWriteSequenceRef.current === sequence) setSaveStatus("saved");
      })
      .catch(() => {
        if (draftWriteSequenceRef.current === sequence) setSaveStatus("error");
      });
  }

  function startEditingContent() {
    if (!entry) return;
    createRevision(entry.id, entryContent);
    setDraftContent(entryContent);
    setHistoryOpen(false);
    setIsEditingContent(true);
  }

  async function handleRestoreRevision(revisionId: string) {
    if (!entry) return;
    const revision = entryRevisions.find((item) => item.id === revisionId);
    if (!revision) return;
    if (!await dialog.confirm({ message: t("entry.restoreRevisionConfirm") })) return;
    restoreRevision(entry.id, revision.id);
    setDraftContent(revision.content);
    setHistoryOpen(false);
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

  async function handleDelete() {
    if (!entry) return;

    const confirmed = await dialog.confirm({ message: t("entry.deleteConfirm", { title: entry.title }), danger: true, confirmLabel: t("common.delete") });

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

        <section className="ws-surface rounded-[2rem] p-6 sm:p-8">
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
    <MotionPage className={isEditingContent ? "space-y-4" : "space-y-6"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/entries")}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          {t("entry.back")}
        </button>

        <div className={isEditingContent ? "hidden" : "flex items-center gap-2"}>
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
          "relative border-b border-[var(--border)] px-1",
          isEditingContent ? "pb-4 pt-0" : "pb-8 pt-2",
          typeMeta.borderClassName,
        ].join(" ")}
      >
        {!isEditingContent ? <EntryHeroMedia entry={entry} /> : null}
        <div className="relative">
          <div>
            <div className={isEditingContent ? "mb-3 flex flex-wrap items-center gap-3" : "mb-5 flex flex-wrap items-center gap-3"}>
              <EntryTypeBadge type={entry.type} />

              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                <Clock3 size={13} strokeWidth={1.8} />
                {t("common.updated")} {formatEntryRelative(entry.updatedAt, locale)}
              </span>
            </div>

            <h1 className={[
              "ws-display-tight max-w-4xl font-semibold leading-[1.02] text-[var(--text)]",
              isEditingContent ? "text-2xl md:text-3xl" : "text-4xl md:text-5xl",
            ].join(" ")}>
              {entry.title}
            </h1>

            {!isEditingContent ? (
              <>
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
                  ) : null}
                </div>
                <div className="mt-7 max-w-4xl">
                  <EntryPropertiesView properties={entry.properties} entries={entries} />
                </div>
                <EntryGallery entry={entry} />
              </>
            ) : null}
          </div>

        </div>
      </section>

      <section className={isEditingContent ? "block" : "grid gap-6 xl:grid-cols-[1fr_20rem]"}>
        <article
          className={isEditingContent
            ? "bg-transparent p-0"
            : "ws-compact-surface p-5 md:p-6"}
        >
          <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={[
                "ws-display font-semibold text-[var(--text)]",
                isEditingContent ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl",
              ].join(" ")}>
                {t("entry.mainText")}
              </h2>

              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {t("entry.wordsCharacters", writingStats)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isEditingContent ? (
                <span role="status" aria-live="polite" aria-atomic="true" className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--text-muted)]">
                  {saveStatus === "saving" ? (
                    <>
                      <Clock3 size={15} strokeWidth={1.8} />
                      {t("entry.saving")}
                    </>
                  ) : saveStatus === "error" ? (
                    <>
                      <Clock3 size={15} strokeWidth={1.8} />
                      {t("entry.saveFailed")}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} strokeWidth={1.8} />
                      {t("entry.savedLocally")}
                    </>
                  )}
                </span>
              ) : null}

              {!isEditingContent ? (
                <button
                  type="button"
                  onClick={() => setHistoryOpen((open) => !open)}
                  className="flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                  aria-expanded={historyOpen}
                >
                  <History size={16} strokeWidth={1.75} />
                  {t("entry.versionHistory")}
                  {entryRevisions.length ? (
                    <span className="rounded-full bg-[var(--surface-solid)] px-2 py-0.5 text-xs">{entryRevisions.length}</span>
                  ) : null}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() =>
                  isEditingContent
                    ? finishEditingContent()
                    : startEditingContent()
                }
                className="ws-button-secondary flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold"
              >
                <FileText size={16} strokeWidth={1.75} />
                {isEditingContent ? t("entry.done") : t("entry.editNotes")}
              </button>
            </div>
          </div>

          {historyOpen && !isEditingContent ? (
            <section className="mb-6 rounded-[1.5rem] border border-[var(--border-strong)] bg-[var(--surface-muted)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{t("entry.versionHistory")}</p>
                  <p className="mt-1 text-xs text-[var(--text-faint)]">{t("entry.versionHistoryHelp")}</p>
                </div>
                <button type="button" onClick={() => setHistoryOpen(false)} className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">
                  {t("common.close")}
                </button>
              </div>
              {entryRevisions.length ? (
                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {entryRevisions.map((revision, index) => {
                    const stats = getWritingStats(revision.content);
                    return (
                      <div key={revision.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] p-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--text)]">
                            {index === 0 ? t("entry.latestSnapshot") : t("entry.olderSnapshot")}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-faint)]">
                            {formatEntryDateTime(revision.createdAt, locale)} · {t("entry.wordsCharacters", stats)}
                          </p>
                        </div>
                        <button type="button" onClick={() => handleRestoreRevision(revision.id)} className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-[var(--border)] px-3 text-xs font-semibold transition hover:bg-[var(--surface-muted)]">
                          <RotateCcw size={14} />
                          {t("entry.restoreRevision")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--text-faint)]">
                  {t("entry.noRevisions")}
                </p>
              )}
            </section>
          ) : null}

          {isEditingContent ? (
            <AdvancedEditorSurface
              entryId={entry.id}
              value={draftContent}
              onChange={handleContentChange}
              placeholder={t("entry.writePlaceholder")}
              referenceEntries={referenceEntries}
            />
          ) : entryContent ? (
            <RichTextReadView value={entryContent} />
          ) : (
            <div className="border-y border-dashed border-[var(--border)] px-6 py-10 text-center">
              <h3 className="text-base font-semibold text-[var(--text)]">
                {t("common.noContent")}
              </h3>

              <button
                type="button"
                onClick={startEditingContent}
                className="ws-button-primary mt-6 rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                {t("entry.startWriting")}
              </button>
            </div>
          )}
          </div>
        </article>

        <aside className={isEditingContent ? "hidden" : "ws-compact-surface divide-y divide-[var(--border)] px-5"}>
          <section className="py-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold text-[var(--text-muted)]">{t("entry.backlinks")}</h2>
              <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)]">
                {backlinks.length}
              </span>
            </div>

            {backlinks.length ? (
              <div className="mt-4 space-y-2">
                {backlinks.map((backlink) => (
                  <button
                    key={backlink.id}
                    type="button"
                    onClick={() => navigate(`/entries/${encodeURIComponent(backlink.id)}`)}
                    className="group flex w-full items-center gap-3 rounded-[1rem] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-solid)] text-[var(--accent)]">
                      <BookOpen size={16} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm text-[var(--text)]">{backlink.title}</b>
                      <span className="block truncate text-xs text-[var(--text-faint)]">
                        {t(`type.${backlink.type}`)}
                      </span>
                    </span>
                    <ChevronRight size={15} className="text-[var(--text-faint)] transition group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs leading-5 text-[var(--text-faint)]">
                {t("entry.noBacklinks")}
              </p>
            )}
          </section>

          <section className="py-5">
            <h2 className="text-xs font-semibold text-[var(--text-muted)]">{t("entry.linkedRecords")}</h2>

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
