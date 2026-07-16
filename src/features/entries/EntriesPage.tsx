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
import { deleteEntryCascade } from "./actions/deleteEntryCascade";
import { formatEntryDate } from "./utils/formatEntryDate";
import type { EntryType } from "./types";
import { EntryTypeBadge } from "./components/EntryTypeBadge";
import { getEntryTypeMeta } from "./utils/entryTypeMeta";
import { useI18n } from "../../shared/i18n";

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

  const navigate = useNavigate();
  const { locale, t } = useI18n();

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
    const confirmed = window.confirm(
      locale === "zh-CN" ? `确定删除“${entryTitle}”吗？` : `Delete "${entryTitle}"?`,
    );

    if (confirmed) {
      deleteEntryCascade(entryId);
    }
  }

  return (
    <MotionPage className="space-y-6">
      <section className="space-y-2">
        <h2 className="ws-page-title">
          {t("nav.entries")}
        </h2>

        <p className="ws-page-status">
          {t("entries.headerStatus", { count: entries.length })}
        </p>
      </section>

      <section className="ws-compact-surface p-3 md:p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_12rem_12rem_auto]">
          <label className="ws-input flex h-10 items-center gap-3 rounded-xl px-3">
            <Search
              size={17}
              strokeWidth={1.7}
              className="text-[var(--text-faint)]"
            />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("entries.search")}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
            />

            {query.trim() !== "" ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-faint)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                aria-label={t("entries.clearSearch")}
              >
                <X size={15} strokeWidth={1.8} />
              </button>
            ) : null}
          </label>

          <label className="ws-input flex h-10 items-center gap-3 rounded-xl px-3">
            <SlidersHorizontal
              size={16}
              strokeWidth={1.7}
              className="text-[var(--text-faint)]"
            />

            <select
              value={selectedType}
              onChange={(event) =>
                setSelectedType(event.target.value as EntryTypeFilter)
              }
              className="h-full min-w-0 flex-1 appearance-none bg-transparent text-sm text-[var(--text)] outline-none"
            >
              {entryTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "All" ? t("entries.allTypes") : t(`type.${type}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="ws-input flex h-10 items-center gap-3 rounded-xl px-3">
            <select
              value={selectedTag}
              onChange={(event) => setSelectedTag(event.target.value)}
              className="h-full min-w-0 flex-1 appearance-none bg-transparent text-sm text-[var(--text)] outline-none"
            >
              <option value="All">{t("entries.allTags")}</option>

              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end">
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="ws-button-secondary h-10 rounded-xl px-4 text-sm font-medium"
              >
                {t("common.clearFilters")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--border)] pt-4">
          <span className="text-sm font-medium text-[var(--text-muted)]">
            {t("entries.showing", {
              shown: filteredEntries.length,
              total: entries.length,
            })}
          </span>

          {selectedTag !== "All" ? (
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
              {t("entries.tag", { tag: selectedTag })}
            </span>
          ) : null}
        </div>
      </section>

      <section className="ws-compact-surface overflow-hidden">
        <div className="hidden grid-cols-[1.5fr_0.78fr_1fr_0.72fr_auto] gap-4 border-b border-[var(--border)] px-5 py-4 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--text-faint)] lg:grid">
          <div>{t("common.title")}</div>
          <div>{t("common.type")}</div>
          <div>{t("common.tags")}</div>
          <div>{t("common.updated")}</div>
          <div className="text-right">{t("common.actions")}</div>
        </div>

        {entries.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <h3 className="ws-display text-3xl font-semibold text-[var(--text)]">
              {t("dashboard.noEntries")}
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-muted)]">
              {t("dashboard.startFirst")}
            </p>

            <button
              type="button"
              onClick={openCreateEntry}
              className="ws-button-primary mt-6 rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              {t("common.createEntry")}
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <h3 className="ws-display text-3xl font-semibold text-[var(--text)]">
              {t("entries.noMatching")}
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-muted)]">
              {t("entries.tryAnother")}
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="ws-button-secondary mt-6 rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              {t("common.clearFilters")}
            </button>
          </div>
        ) : (
          <motion.div
            variants={listContainer}
            initial="initial"
            animate="animate"
            className="divide-y divide-[var(--border)]"
          >
            {filteredEntries.map((entry) => {
              const typeMeta = getEntryTypeMeta(entry.type);

              return (
                <motion.article
                  key={entry.id}
                  variants={listItem}
                  onClick={() => navigate(`/entries/${entry.id}`)}
                  className={[
                    "group relative cursor-pointer px-5 py-4 transition-colors",
                    "hover:bg-[var(--surface-muted)]",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "pointer-events-none absolute inset-y-3 left-0 w-1 rounded-r-full opacity-0 transition-opacity group-hover:opacity-100",
                      typeMeta.dotClassName,
                    ].join(" ")}
                  />

                  <div className="grid gap-4 lg:grid-cols-[1.5fr_0.78fr_1fr_0.72fr_auto] lg:items-center">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-[var(--text)]">
                        {entry.title}
                      </h3>

                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
                        {entry.summary || t("common.noSummary")}
                      </p>
                    </div>

                    <div>
                      <EntryTypeBadge
                        type={entry.type}
                        onClick={(event?: never) => {
                          void event;
                          setSelectedType(entry.type);
                        }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {entry.tags.slice(0, 4).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedTag(tag);
                          }}
                          className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                        >
                          #{tag}
                        </button>
                      ))}

                      {entry.tags.length === 0 ? (
                        <span className="text-xs text-[var(--text-faint)]">
                          {t("common.noTags")}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-sm text-[var(--text-muted)]">
                      {formatEntryDate(entry.updatedAt, locale)}
                    </div>

                    <div className="flex items-center justify-start gap-2 lg:justify-end">
                      <motion.button
                        type="button"
                        whileTap={pressTap}
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditEntry(entry.id);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                        aria-label={t("entries.editAria", { title: entry.title })}
                      >
                        <Pencil size={16} strokeWidth={1.75} />
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={pressTap}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(entry.id, entry.title);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-300"
                        aria-label={t("entries.deleteAria", { title: entry.title })}
                      >
                        <Trash2 size={16} strokeWidth={1.75} />
                      </motion.button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </section>
    </MotionPage>
  );
}
