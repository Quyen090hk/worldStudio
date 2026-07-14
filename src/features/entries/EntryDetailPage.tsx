import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { MotionPage } from "../../shared/components/MotionPage";
import { RichTextEditor } from "./components/RichTextEditor";
import { useEntryStore } from "./stores/useEntryStore";
import {
  formatEntryDateTime,
  formatEntryRelative,
} from "./utils/formatEntryDate";
import { EntryTypeBadge } from "./components/EntryTypeBadge";
import { getEntryTypeMeta } from "./utils/entryTypeMeta";
import { useI18n } from "../../shared/i18n";

type SaveStatus = "idle" | "saving" | "saved";

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
  const navigate = useNavigate();
  const { locale, t } = useI18n();

  const entries = useEntryStore((state) => state.entries);
  const openEditEntry = useEntryStore((state) => state.openEditEntry);
  const updateEntry = useEntryStore((state) => state.updateEntry);
  const deleteEntry = useEntryStore((state) => state.deleteEntry);

  const [isEditingContent, setIsEditingContent] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const entry = useMemo(
    () => entries.find((item) => item.id === entryId),
    [entries, entryId]
  );

  const writingStats = useMemo(
    () => getWritingStats(isEditingContent ? draftContent : entry?.content ?? ""),
    [draftContent, entry?.content, isEditingContent]
  );

  useEffect(() => {
    if (entry) {
      setDraftContent(entry.content);
      setIsEditingContent(false);
      setSaveStatus("saved");
    }
  }, [entry?.id]);

  useEffect(() => {
    if (!entry) return;
    if (!isEditingContent) return;

    if (draftContent === entry.content) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("saving");

    const timer = window.setTimeout(() => {
      updateEntry(entry.id, {
        title: entry.title,
        type: entry.type,
        summary: entry.summary,
        tags: entry.tags,
        content: draftContent,
      });

      setSaveStatus("saved");
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draftContent, entry, isEditingContent, updateEntry]);

  function handleDelete() {
    if (!entry) return;

    const confirmed = window.confirm(
      locale === "zh-CN" ? `确定删除“${entry.title}”吗？` : `Delete "${entry.title}"?`,
    );

    if (confirmed) {
      deleteEntry(entry.id);
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
            Quick Edit
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="flex h-10 items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-4 text-sm font-semibold text-red-500 transition hover:bg-red-500/15"
          >
            <Trash2 size={16} strokeWidth={1.75} />
            Delete
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
                onClick={() => setIsEditingContent((value) => !value)}
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
              onChange={setDraftContent}
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
            <p className="ws-eyebrow">{t("entry.futureLinks")}</p>

            <div className="mt-4 space-y-2">
              {[t("entry.mapMarkers"), t("dashboard.relations"), t("entry.timelineEvents"), t("entry.wikiPreview")].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-[1rem] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm"
                  >
                    <span className="text-[var(--text-muted)]">{item}</span>
                    <span className="text-xs text-[var(--text-faint)]">
                      {t("common.soon")}
                    </span>
                  </div>
                )
              )}
            </div>
          </section>
        </aside>
      </section>
    </MotionPage>
  );
}
