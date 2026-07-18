import { useEffect, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Save, Trash2, X } from "lucide-react";

import { useEntryStore } from "../stores/useEntryStore";
import { deleteEntryCascade } from "../actions/deleteEntryCascade";
import type { EntryMedia, EntryProperty, EntryType } from "../types";
import { EntryTypeBadge } from "./EntryTypeBadge";
import { useI18n } from "../../../shared/i18n";
import { useSoftDialog } from "../../../shared/components/softDialogContext";
import { EntryPropertiesEditor } from "./EntryPropertiesEditor";
import { EntryMediaEditor } from "./EntryMediaEditor";

const entryTypes: EntryType[] = [
  "Character",
  "Location",
  "Organization",
  "Item",
  "Event",
];

type EntryDrawerDraft = {
  key: string;
  title: string;
  type: EntryType;
  summary: string;
  tagsText: string;
  properties: EntryProperty[];
  media: EntryMedia;
};

function parseTags(value: string) {
  const tags = value
    .split(/[,，]/)
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean);

  return Array.from(new Set(tags));
}

export function EntryDrawer() {
  const entries = useEntryStore((state) => state.entries);
  const drawerOpen = useEntryStore((state) => state.drawerOpen);
  const drawerSession = useEntryStore((state) => state.drawerSession);
  const drawerMode = useEntryStore((state) => state.drawerMode);
  const editingEntryId = useEntryStore((state) => state.editingEntryId);

  const closeDrawer = useEntryStore((state) => state.closeDrawer);
  const createEntry = useEntryStore((state) => state.createEntry);
  const updateEntry = useEntryStore((state) => state.updateEntry);
  const { t } = useI18n();
  const dialog = useSoftDialog();

  const editingEntry = useMemo(
    () => entries.find((entry) => entry.id === editingEntryId),
    [entries, editingEntryId]
  );

  const draftKey = `${drawerSession}:${drawerMode}:${editingEntryId ?? "new"}`;
  const initialDraft: EntryDrawerDraft = {
    key: draftKey,
    title: drawerMode === "edit" ? (editingEntry?.title ?? "") : "",
    type:
      drawerMode === "edit" ? (editingEntry?.type ?? "Character") : "Character",
    summary: drawerMode === "edit" ? (editingEntry?.summary ?? "") : "",
    tagsText:
      drawerMode === "edit" ? (editingEntry?.tags.join(", ") ?? "") : "",
    properties: drawerMode === "edit" ? structuredClone(editingEntry?.properties ?? []) : [],
    media: drawerMode === "edit" ? structuredClone(editingEntry?.media ?? {}) : {},
  };
  const [draft, setDraft] = useState<EntryDrawerDraft>(initialDraft);
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const activeDraft = draft.key === draftKey ? draft : initialDraft;
  const { title, type, summary, tagsText, properties, media } = activeDraft;

  useEffect(() => {
    if (!drawerOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      window.requestAnimationFrame(() => previousFocusRef.current?.focus({ preventScroll: true }));
    };
  }, [closeDrawer, drawerOpen]);

  function updateDraft(patch: Partial<Omit<EntryDrawerDraft, "key">>) {
    setDraft({ ...activeDraft, ...patch });
  }

  function handleSubmit(event: SyntheticEvent) {
    event.preventDefault();

    const input = {
      title: title.trim() || t("entry.untitled"),
      type,
      summary: summary.trim(),
      content: drawerMode === "edit" && editingEntry ? editingEntry.content : "",
      tags: parseTags(tagsText),
      properties,
      media,
    };

    if (drawerMode === "edit" && editingEntry) {
      updateEntry(editingEntry.id, input);
      return;
    }

    createEntry(input);
  }

  async function handleDelete() {
    if (!editingEntry) return;

    const confirmed = await dialog.confirm({ message: t("entry.deleteConfirm", { title: editingEntry.title }), danger: true, confirmLabel: t("common.delete") });

    if (confirmed) {
      deleteEntryCascade(editingEntry.id);
    }
  }

  return (
    <AnimatePresence>
      {drawerOpen ? (
        <>
          <motion.div
            key="entry-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm"
          />

          <motion.aside
            ref={drawerRef}
            key="entry-drawer"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 36 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="entry-drawer-title"
            className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-solid)] shadow-[var(--shadow-raised)] sm:bottom-4 sm:left-auto sm:right-4 sm:top-4 sm:w-[min(40rem,calc(100vw-2rem))] sm:rounded-[2rem]"
          >
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <header className="border-b border-[var(--border)] px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="ws-eyebrow">
                      {drawerMode === "edit" ? t("entry.editEntry") : t("entry.newEntry")}
                    </p>

                    <h2 id="entry-drawer-title" className="ws-display mt-2 text-2xl font-semibold leading-tight text-[var(--text)] sm:text-3xl">
                      {drawerMode === "edit"
                        ? editingEntry?.title ?? "Entry"
                        : t("entry.createLore")}
                    </h2>
                  </div>

                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={closeDrawer}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                    aria-label={t("entry.closeDrawer")}
                  >
                    <X size={18} strokeWidth={1.8} />
                  </button>
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-[var(--text)]">
                    {t("common.title")}
                  </div>

                  <input
                    value={title}
                    onChange={(event) => updateDraft({ title: event.target.value })}
                    placeholder={t("entry.entryTitle")}
                    className="ws-input h-12 w-full rounded-[1.15rem] px-4 text-sm"
                  />
                </label>

                <div>
                  <div className="mb-2 text-sm font-semibold text-[var(--text)]">
                    {t("common.type")}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {entryTypes.map((entryType) => {
                      const selected = type === entryType;

                      return (
                        <button
                          key={entryType}
                          type="button"
                          onClick={() => updateDraft({ type: entryType })}
                          className={[
                            "rounded-[1.15rem] border px-3 py-3 text-left transition",
                            selected
                              ? "border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[var(--accent-soft)]"
                              : "border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--border-strong)]",
                          ].join(" ")}
                        >
                          <EntryTypeBadge type={entryType} />

                          <div className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                            {t(`entry.type${entryType}`)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-[var(--text)]">
                    {t("entry.summary")}
                  </div>

                  <textarea
                    value={summary}
                    onChange={(event) =>
                      updateDraft({ summary: event.target.value })
                    }
                    placeholder={t("entry.summaryPlaceholder")}
                    rows={4}
                    className="ws-input w-full resize-none rounded-[1.15rem] px-4 py-3 text-sm leading-6"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-[var(--text)]">
                    {t("common.tags")}
                  </div>

                  <input
                    value={tagsText}
                    onChange={(event) =>
                      updateDraft({ tagsText: event.target.value })
                    }
                    placeholder={t("entry.tagsPlaceholder")}
                    className="ws-input h-12 w-full rounded-[1.15rem] px-4 text-sm"
                  />

                  <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                    {t("entry.tagsHelp")}
                  </p>
                </label>

                {(type === "Character" || type === "Location" || type === "Organization") ? <>
                  <EntryMediaEditor type={type} media={media} onChange={(value) => updateDraft({ media: value })} />
                  <EntryPropertiesEditor type={type} properties={properties} entries={entries.filter((entry) => entry.id !== editingEntryId)} onChange={(value) => updateDraft({ properties: value })} />
                </> : null}
              </div>

              <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
                {drawerMode === "edit" ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex h-11 items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-4 text-sm font-semibold text-red-500 transition hover:bg-red-500/15"
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                    {t("common.delete")}
                  </button>
                ) : (
                  <div />
                )}

                <div className="ml-auto flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="ws-button-secondary h-11 rounded-full px-4 text-sm font-semibold"
                  >
                    {t("common.cancel")}
                  </button>

                  <button
                    type="submit"
                    className="ws-button-primary flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"
                  >
                    <Save size={16} strokeWidth={1.75} />
                    {drawerMode === "edit" ? t("common.saveChanges") : t("common.createEntry")}
                  </button>
                </div>
              </footer>
            </form>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
