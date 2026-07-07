import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { MotionPage } from "../../shared/components/MotionPage";
import {
  listContainer,
  listItem,
  pressTap,
} from "../../shared/motion/presets";
import { useEntryStore } from "./stores/useEntryStore";
import { formatEntryDate } from "./utils/formatEntryDate";
import type { EntryType } from "./types";
import { EntryTypeBadge } from "./components/EntryTypeBadge";
import { getEntryTypeMeta } from "./utils/entryTypeMeta";

type EntryTypeFilter = EntryType | "All";

const entryTypes: EntryTypeFilter[] = [
  "All",
  "Character",
  "Location",
  "Organization",
  "Item",
  "Event",
];

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export function EntriesPage() {
  const entries = useEntryStore((state) => state.entries);
  const openCreateEntry = useEntryStore((state) => state.openCreateEntry);
  const openEditEntry = useEntryStore((state) => state.openEditEntry);
  const deleteEntry = useEntryStore((state) => state.deleteEntry);
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<EntryTypeFilter>("All");
  const [selectedTag, setSelectedTag] = useState("All");

  const allTags = useMemo(() => {
    const tags = entries.flatMap((entry) => entry.tags);

    return Array.from(new Set(tags)).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const keyword = normalizeText(query);

    return [...entries]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .filter((entry) => {
        const matchesType =
          selectedType === "All" ? true : entry.type === selectedType;

        const matchesTag =
          selectedTag === "All" ? true : entry.tags.includes(selectedTag);

        const searchableText = normalizeText(
          [
            entry.title,
            entry.summary,
            entry.content,
            entry.type,
            entry.tags.join(" "),
          ].join(" ")
        );

        const matchesKeyword = keyword
          ? searchableText.includes(keyword)
          : true;

        return matchesType && matchesTag && matchesKeyword;
      });
  }, [entries, query, selectedType, selectedTag]);

  const hasFilters =
    query.trim() !== "" || selectedType !== "All" || selectedTag !== "All";

  function clearFilters() {
    setQuery("");
    setSelectedType("All");
    setSelectedTag("All");
  }

  function handleDelete(entryId: string, entryTitle: string) {
    const confirmed = window.confirm(`Delete "${entryTitle}"?`);

    if (confirmed) {
      deleteEntry(entryId);
    }
  }

  return (
    <MotionPage className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-semibold">Entries</h2>
          <p className="mt-2 text-sm text-stone-400">
            Manage characters, locations, organizations, items, and events.
          </p>
        </div>


      </div>

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 min-w-[320px] flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-stone-400 transition focus-within:border-violet-400/60 focus-within:bg-white/[0.06]">
            <Search size={17} />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, summary, content, tags..."
              className="h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-stone-600"
            />

            {query.trim() !== "" && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-lg p-1 text-stone-500 transition hover:bg-white/10 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3">
            <SlidersHorizontal size={16} className="text-stone-500" />

            <select
              value={selectedType}
              onChange={(event) =>
                setSelectedType(event.target.value as EntryTypeFilter)
              }
              className="h-full bg-transparent text-sm text-stone-200 outline-none"
            >
              {entryTypes.map((type) => (
                <option key={type} value={type} className="bg-[#101116]">
                  {type === "All" ? "All Types" : type}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedTag}
            onChange={(event) => setSelectedTag(event.target.value)}
            className="h-11 rounded-2xl border border-white/10 bg-black/20 px-3 text-sm text-stone-200 outline-none transition hover:border-white/20"
          >
            <option value="All" className="bg-[#101116]">
              All Tags
            </option>

            {allTags.map((tag) => (
              <option key={tag} value={tag} className="bg-[#101116]">
                {tag}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-11 rounded-2xl border border-white/10 px-4 text-sm text-stone-300 transition hover:bg-white/10 hover:text-white"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <div className="text-sm text-stone-400">
            Showing{" "}
            <span className="font-medium text-white">
              {filteredEntries.length}
            </span>{" "}
            of <span className="font-medium text-white">{entries.length}</span>{" "}
            entries
          </div>

          {selectedTag !== "All" && (
            <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
              Tag: #{selectedTag}
            </div>
          )}
        </div>
      </section>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
        <div className="grid grid-cols-[1.4fr_0.8fr_1fr_0.7fr_auto] border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-stone-500">
          <div>Title</div>
          <div>Type</div>
          <div>Tags</div>
          <div>Updated</div>
          <div className="text-right">Actions</div>
        </div>

        {entries.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <h3 className="text-lg font-semibold">No entries yet</h3>
            <p className="mt-2 text-sm text-stone-400">
              Start by creating your first lore entry.
            </p>

            <motion.button
              type="button"
              onClick={openCreateEntry}
              whileTap={pressTap}
              whileHover={{ y: -1 }}
              className="mt-5 rounded-2xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
            >
              Create Entry
            </motion.button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <h3 className="text-lg font-semibold">No matching entries</h3>
            <p className="mt-2 text-sm text-stone-400">
              Try another keyword, type, or tag.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-stone-300 transition hover:bg-white/10 hover:text-white"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <motion.div
            variants={listContainer}
            initial="initial"
            animate="animate"
            className="divide-y divide-white/10"
          >
            {filteredEntries.map((entry) => {
              const typeMeta = getEntryTypeMeta(entry.type);

              return (
                <motion.div
                  key={entry.id}
                  variants={listItem}
                  whileTap={pressTap}
                  onClick={() => navigate(`/entries/${entry.id}`)}
                  className={[
                    "group relative grid cursor-pointer grid-cols-[1.4fr_0.8fr_1fr_0.7fr_auto] items-center px-4 py-4 transition-colors hover:bg-white/[0.04]",
                    "before:absolute before:left-0 before:top-3 before:h-[calc(100%-1.5rem)] before:w-1 before:rounded-full before:opacity-0 before:transition-opacity group-hover:before:opacity-100",
                    typeMeta.softBgClassName,
                  ].join(" ")}                >
                  <div>
                    <div className="font-medium text-white transition-colors group-hover:text-violet-100">
                      {entry.title}
                    </div>

                    <div className="mt-1 line-clamp-1 text-sm text-stone-400">
                      {entry.summary || "No summary yet."}
                    </div>
                  </div>

                  <div
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <EntryTypeBadge
                      type={entry.type}
                      onClick={() => setSelectedType(entry.type)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {entry.tags.slice(0, 3).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedTag(tag);
                        }}
                        className="rounded-full border border-white/10 px-2 py-1 text-xs text-stone-400 transition hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-violet-100"
                      >
                        {tag}
                      </button>
                    ))}

                    {entry.tags.length === 0 && (
                      <span className="text-xs text-stone-600">No tags</span>
                    )}
                  </div>

                  <div className="text-sm text-stone-500">
                    {formatEntryDate(entry.updatedAt)}
                  </div>

                  <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditEntry(entry.id);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition hover:bg-white/10 hover:text-white"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(entry.id, entry.title);
                      }}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition hover:bg-red-500/15 hover:text-red-200"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </MotionPage>
  );
}