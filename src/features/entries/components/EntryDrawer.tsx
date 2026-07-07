import { useEffect, useMemo, useState } from "react";
import type { SyntheticEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Save, Trash2, X } from "lucide-react";
import { useEntryStore } from "../stores/useEntryStore";
import type { EntryType } from "../types";

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

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = {
      title: title.trim() || "Untitled Entry",
      type,
      summary: summary.trim(),
      content:
        drawerMode === "edit" && editingEntry ? editingEntry.content : "",
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

    const confirmed = window.confirm(`Delete "${editingEntry.title}"?`);

    if (confirmed) {
      deleteEntry(editingEntry.id);
    }
  }

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
          />

          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-screen w-[520px] flex-col border-l border-white/10 bg-[#101116]/95 shadow-2xl shadow-black/40 backdrop-blur-2xl"
            initial={{ x: "100%", opacity: 0.8 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.8 }}
            transition={{
              duration: 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <header className="flex h-20 items-center justify-between border-b border-white/10 px-6">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-violet-300">
                  {drawerMode === "edit" ? "Edit Entry" : "New Entry"}
                </div>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {drawerMode === "edit"
                    ? editingEntry?.title ?? "Entry"
                    : "Create lore entry"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                className="flex h-10 w-10 items-center justify-center rounded-2xl text-stone-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
                <label className="block">
                  <div className="mb-2 text-sm font-medium text-stone-300">
                    Title
                  </div>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Entry title"
                    className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-stone-600 focus:border-violet-400/60 focus:bg-white/[0.06]"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-stone-300">
                    Type
                  </div>
                  <select
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value as EntryType)
                    }
                    className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition focus:border-violet-400/60 focus:bg-white/[0.06]"
                  >
                    {entryTypes.map((entryType) => (
                      <option key={entryType} value={entryType}>
                        {entryType}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-stone-300">
                    Summary
                  </div>
                  <textarea
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                    placeholder="Short description for lists, cards, and wiki previews."
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-stone-600 focus:border-violet-400/60 focus:bg-white/[0.06]"
                  />
                </label>

                <label className="block">
                  <div className="mb-2 text-sm font-medium text-stone-300">
                    Tags
                  </div>
                  <input
                    value={tagsText}
                    onChange={(event) => setTagsText(event.target.value)}
                    placeholder="city, north ridge, map marker"
                    className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition placeholder:text-stone-600 focus:border-violet-400/60 focus:bg-white/[0.06]"
                  />
                  <p className="mt-2 text-xs text-stone-500">
                    Use commas to separate tags.
                  </p>
                </label>
              </div>

              <footer className="flex items-center justify-between border-t border-white/10 px-6 py-4">
                {drawerMode === "edit" ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex h-11 items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="h-11 rounded-2xl border border-white/10 px-4 text-sm font-medium text-stone-300 transition hover:bg-white/10 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="flex h-11 items-center gap-2 rounded-2xl bg-violet-500 px-4 text-sm font-medium text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-400"
                  >
                    <Save size={16} />
                    {drawerMode === "edit" ? "Save Changes" : "Create Entry"}
                  </button>
                </div>
              </footer>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}