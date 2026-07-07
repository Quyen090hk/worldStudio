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
import { formatEntryDateTime, formatEntryRelative, } from "./utils/formatEntryDate";
import { EntryTypeBadge } from "./components/EntryTypeBadge";
import { getEntryTypeMeta } from "./utils/entryTypeMeta";

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

    const confirmed = window.confirm(`Delete "${entry.title}"?`);

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
          className="flex items-center gap-2 text-sm text-stone-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Entries
        </button>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-10 text-center">
          <h2 className="text-2xl font-semibold">Entry not found</h2>
          <p className="mt-3 text-sm text-stone-400">
            This entry may have been deleted.
          </p>
        </div>
      </MotionPage>
    );
  }

  const typeMeta = getEntryTypeMeta(entry.type);

  return (
    <MotionPage className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/entries")}
          className="flex items-center gap-2 text-sm text-stone-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Entries
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openEditEntry(entry.id)}
            className="flex h-10 items-center gap-2 rounded-2xl border border-white/10 px-4 text-sm text-stone-300 transition hover:bg-white/10 hover:text-white"
          >
            <Pencil size={15} />
            Quick Edit
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="flex h-10 items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 text-sm text-red-200 transition hover:bg-red-500/20"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>

      <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20">
        <header className="relative overflow-hidden border-b border-white/10 p-8">
          <div
            className={[
              "pointer-events-none absolute inset-0",
              typeMeta.glowClassName,
            ].join(" ")}
          />
          <div className="relative">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <EntryTypeBadge type={entry.type} />

              <span className="flex items-center gap-1.5 text-xs text-stone-500">
                <Calendar size={14} />
                Updated {formatEntryRelative(entry.updatedAt)}
              </span>
            </div>

            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white">
              {entry.title}
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-7 text-stone-400">
              {entry.summary || "No summary yet."}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {entry.tags.length > 0 ? (
                entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-stone-400"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-stone-600">No tags</span>
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-0">
          <section className="min-h-[520px] border-r border-white/10 p-8">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-stone-300">
                  <FileText size={16} />
                  Lore Notes
                </div>

                <div className="mt-1 text-xs text-stone-500">
                  {writingStats.words} words · {writingStats.characters} characters
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isEditingContent && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    {saveStatus === "saving" ? (
                      <>
                        <Clock3 size={14} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        Saved locally · {formatEntryDateTime(entry.updatedAt)}
                      </>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditingContent((value) => !value)}
                  className="flex h-10 items-center gap-2 rounded-2xl border border-white/10 px-4 text-sm text-stone-300 transition hover:bg-white/10 hover:text-white"
                >
                  <Pencil size={15} />
                  {isEditingContent ? "Done" : "Edit Notes"}
                </button>
              </div>
            </div>

            {isEditingContent ? (
              <RichTextEditor
                key={entry.id}
                value={draftContent}
                onChange={setDraftContent}
                placeholder="Write character history, location details, faction rules, timeline notes..."
              />
            ) : entry.content ? (
              <RichTextEditor
                key={`${entry.id}-viewer-${entry.updatedAt}`}
                value={entry.content}
                editable={false}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
                <h3 className="text-lg font-semibold">No content yet</h3>
                <p className="mt-2 text-sm text-stone-400">
                  Add detailed lore notes, background, rules, history, or
                  references.
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditingContent(true)}
                  className="mt-5 rounded-2xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
                >
                  Start Writing
                </button>
              </div>
            )}
          </section>

          <aside className="space-y-5 p-6">
            <div
              className={[
                "rounded-3xl border bg-black/20 p-5",
                typeMeta.borderClassName,
              ].join(" ")}
            >
              <div className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Type
              </div>

              <div className="mt-3">
                <EntryTypeBadge type={entry.type} />
              </div>

              <p className="mt-3 text-xs leading-5 text-stone-500">
                {typeMeta.description}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Created
              </div>
              <div className="mt-2 text-sm text-stone-200">
                {formatEntryDateTime(entry.createdAt)}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Updated
              </div>
              <div className="mt-2 text-sm text-stone-200">
                {formatEntryDateTime(entry.updatedAt)}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Tags
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {entry.tags.length > 0 ? (
                  entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-stone-400"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-stone-600">No tags</span>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Future Links
              </div>
              <div className="mt-3 space-y-2 text-sm text-stone-400">
                <div>Map markers</div>
                <div>Relations</div>
                <div>Timeline events</div>
                <div>Wiki preview</div>
              </div>
            </div>
          </aside>
        </div>
      </article>
    </MotionPage>
  );
}