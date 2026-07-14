import { useEffect, useMemo, useState } from "react";
import type { SyntheticEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Save, Trash2, X } from "lucide-react";

import { useEntryStore } from "../stores/useEntryStore";
import type { EntryType } from "../types";
import { EntryTypeBadge } from "./EntryTypeBadge";
import { useI18n } from "../../../shared/i18n";

const entryTypes: EntryType[] = [
  "Character",
  "Location",
  "Organization",
  "Item",
  "Event",
];

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
  const drawerMode = useEntryStore((state) => state.drawerMode);
  const editingEntryId = useEntryStore((state) => state.editingEntryId);

  const closeDrawer = useEntryStore((state) => state.closeDrawer);
  const createEntry = useEntryStore((state) => state.createEntry);
  const updateEntry = useEntryStore((state) => state.updateEntry);
  const deleteEntry = useEntryStore((state) => state.deleteEntry);
  const { locale, t } = useI18n();

  const editingEntry = useMemo(
    () => entries.find((entry) => entry.id === editingEntryId),
    [entries, editingEntryId]
  );

  const [title, setTitle] = useState("");
  const [type, setType] = useState<EntryType>("Character");
  const [summary, setSummary] = useState("");
  const [tagsText, setTagsText] = useState("");

  useEffect(() => {
    if (!drawerOpen) return;

    if (drawerMode === "edit" && editingEntry) {
      setTitle(editingEntry.title);
      setType(editingEntry.type);
      setSummary(editingEntry.summary);
      setTagsText(editingEntry.tags.join(", "));
      return;
    }

    setTitle("");
    setType("Character");
    setSummary("");
    setTagsText("");
  }, [drawerOpen, drawerMode, editingEntry]);

  function handleSubmit(event: SyntheticEvent) {
    event.preventDefault();

    const input = {
      title: title.trim() || t("entry.untitled"),
      type,
      summary: summary.trim(),
      content: drawerMode === "edit" && editingEntry ? editingEntry.content : "",
      tags: parseTags(tagsText),
    };

    if (drawerMode === "edit" && editingEntry) {
      updateEntry(editingEntry.id, input);
      return;
    }

    createEntry(input);
  }

  function handleDelete() {
    if (!editingEntry) return;

    const confirmed = window.confirm(
      locale === "zh-CN" ? `确定删除“${editingEntry.title}”吗？` : `Delete "${editingEntry.title}"?`,
    );

    if (confirmed) {
      deleteEntry(editingEntry.id);
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
            key="entry-drawer"
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 36 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-4 right-4 top-4 z-50 flex w-[min(31rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface-solid)] shadow-[var(--shadow-raised)]"
          >
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <header className="border-b border-[var(--border)] px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="ws-eyebrow">
                      {drawerMode === "edit" ? t("entry.editEntry") : t("entry.newEntry")}
                    </p>

                    <h2 className="ws-display mt-2 text-3xl font-semibold leading-tight text-[var(--text)]">
                      {drawerMode === "edit"
                        ? editingEntry?.title ?? "Entry"
                        : t("entry.createLore")}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                    aria-label={t("entry.closeDrawer")}
                  >
                    <X size={18} strokeWidth={1.8} />
                  </button>
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
                <label className="block">
                  <div className="mb-2 text-sm font-semibold text-[var(--text)]">
                    {t("common.title")}
                  </div>

                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
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
                          onClick={() => setType(entryType)}
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
                    onChange={(event) => setSummary(event.target.value)}
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
                    onChange={(event) => setTagsText(event.target.value)}
                    placeholder={t("entry.tagsPlaceholder")}
                    className="ws-input h-12 w-full rounded-[1.15rem] px-4 text-sm"
                  />

                  <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                    {t("entry.tagsHelp")}
                  </p>
                </label>
              </div>

              <footer className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-6 py-4">
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

                <div className="flex items-center gap-3">
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
