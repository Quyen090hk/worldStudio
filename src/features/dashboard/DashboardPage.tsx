import { motion } from "motion/react";
import { BookOpen, CheckCircle2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { MotionPage } from "../../shared/components/MotionPage";
import { listContainer, listItem, pressTap } from "../../shared/motion/presets";
import { useI18n } from "../../shared/i18n";
import { EntryTypeBadge } from "../entries/components/EntryTypeBadge";
import { useEntryStore } from "../entries/stores/useEntryStore";
import { formatEntryDate } from "../entries/utils/formatEntryDate";
import { useRelationshipStore } from "../graph/stores/useRelationshipStore";
import { useMapStore } from "../map/stores/useMapStore";
import { useTimelineStore } from "../timeline/stores/useTimelineStore";
import { useWorldStore } from "../world/stores/useWorldStore";

export function DashboardPage() {
  const entries = useEntryStore((state) => state.entries);
  const openCreateEntry = useEntryStore((state) => state.openCreateEntry);
  const mapMarkerCount = useMapStore((state) => state.markers.length);
  const relationshipCount = useRelationshipStore(
    (state) => state.relationships.length,
  );
  const timelineEventCount = useTimelineStore((state) => state.items.length);
  const profile = useWorldStore((state) => state.profile);
  const navigate = useNavigate();
  const { t, locale } = useI18n();

  const recentEntries = [...entries]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 5);
  const latestEntry = recentEntries[0] ?? null;
  const stats = [
    { label: t("dashboard.entries"), value: entries.length, path: "/entries" },
    { label: t("dashboard.mapMarkers"), value: mapMarkerCount, path: "/map" },
    { label: t("dashboard.relations"), value: relationshipCount, path: "/graph" },
    { label: t("dashboard.timelineEvents"), value: timelineEventCount, path: "/timeline" },
  ];

  return (
    <MotionPage className="space-y-10">
      <header className="flex flex-col gap-6 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="ws-eyebrow mb-3 truncate">{profile.name}</p>
          <h2 className="ws-page-title">
            {latestEntry
              ? t("dashboard.continueTitle")
              : t("dashboard.readyTitle")}
          </h2>
          <p className="ws-page-status">
            {latestEntry
              ? t("dashboard.resumeEntry", {
                  title: latestEntry.title,
                  date: formatEntryDate(latestEntry.updatedAt, locale),
                })
              : t("dashboard.readyDescription")}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {latestEntry ? (
              <motion.button
                type="button"
                whileTap={pressTap}
                onClick={() => navigate(`/entries/${latestEntry.id}`)}
                className="ws-button-primary flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold"
              >
                <BookOpen size={16} strokeWidth={1.8} />
                {t("dashboard.continueEntry")}
              </motion.button>
            ) : null}
            <button
              type="button"
              onClick={openCreateEntry}
              className="flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
            >
              <Plus size={16} strokeWidth={1.8} />
              {t("topbar.newEntry")}
            </button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pb-1 text-xs text-[var(--text-faint)]">
          <CheckCircle2 size={15} strokeWidth={1.7} />
          {t("entry.savedLocally")}
        </div>
      </header>

      <nav
        aria-label={t("dashboard.workspaceStatus")}
        className="grid border-y border-[var(--border)] sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat, index) => (
          <button
            key={stat.label}
            type="button"
            onClick={() => navigate(stat.path)}
            className={`flex items-baseline justify-between gap-4 px-1 py-4 text-left transition hover:text-[var(--accent)] sm:px-5 ${index ? "border-t border-[var(--border)] sm:border-t-0 lg:border-l" : ""} ${index === 2 ? "sm:border-l-0 lg:border-l" : "sm:border-l"}`}
          >
            <span className="ws-display text-3xl font-semibold">{stat.value}</span>
            <span className="text-xs font-medium text-[var(--text-muted)]">{stat.label}</span>
          </button>
        ))}
      </nav>

      {recentEntries.length ? (
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="ws-display text-2xl font-semibold text-[var(--text)]">
              {t("dashboard.recentlyUpdated")}
            </h3>
            <button
              type="button"
              onClick={() => navigate("/entries")}
              className="rounded-lg px-2.5 py-2 text-xs font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
            >
              {t("common.browseArchive")}
            </button>
          </div>
          <motion.div
            variants={listContainer}
            initial="initial"
            animate="animate"
            className="ws-compact-surface divide-y divide-[var(--border)] overflow-hidden"
          >
            {recentEntries.map((entry) => (
              <motion.article
                key={entry.id}
                variants={listItem}
                onClick={() => navigate(`/entries/${entry.id}`)}
                className="grid cursor-pointer gap-2 px-4 py-4 transition-colors hover:bg-[var(--surface-muted)] sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4"
              >
                <EntryTypeBadge type={entry.type} />
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-[var(--text)]">
                    {entry.title}
                  </h4>
                  <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                    {entry.summary || t("common.noSummary")}
                  </p>
                </div>
                <time className="text-xs text-[var(--text-faint)]">
                  {formatEntryDate(entry.updatedAt, locale)}
                </time>
              </motion.article>
            ))}
          </motion.div>
        </section>
      ) : null}
    </MotionPage>
  );
}
