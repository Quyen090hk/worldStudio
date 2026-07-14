import { motion } from "motion/react";
import { BookOpen, GitBranch, Map, Plus, Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { MotionPage } from "../../shared/components/MotionPage";
import {
  cardHover,
  listContainer,
  listItem,
  pressTap,
} from "../../shared/motion/presets";
import { EntryTypeBadge } from "../entries/components/EntryTypeBadge";
import { useEntryStore } from "../entries/stores/useEntryStore";
import { useRelationshipStore } from "../graph/stores/useRelationshipStore";
import { useMapStore } from "../map/stores/useMapStore";
import { useTimelineStore } from "../timeline/stores/useTimelineStore";
import { useWorldStore } from "../world/stores/useWorldStore";
import { formatEntryDate } from "../entries/utils/formatEntryDate";
import { getEntryTypeMeta } from "../entries/utils/entryTypeMeta";
import { useI18n } from "../../shared/i18n";

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
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 4);

  const stats = [
    {
      label: t("dashboard.entries"),
      value: String(entries.length),
      icon: BookOpen,
    },
    {
      label: t("dashboard.mapMarkers"),
      value: String(mapMarkerCount),
      icon: Map,
    },
    {
      label: t("dashboard.relations"),
      value: String(relationshipCount),
      icon: GitBranch,
    },
    {
      label: t("dashboard.timelineEvents"),
      value: String(timelineEventCount),
      icon: Timer,
    },
  ];

  return (
    <MotionPage className="space-y-8">
      <section className="ws-surface-raised overflow-hidden rounded-[2rem] p-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_20rem]">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            <div className="ws-eyebrow mb-5">{t("dashboard.eyebrow")}</div>

            <h2 className="ws-display-tight max-w-4xl text-5xl font-semibold leading-[0.98] text-[var(--text)] md:text-6xl">
              {t("dashboard.title")}
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-muted)]">
              {t("dashboard.description")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {entries.length > 0 ? (
                <motion.button
                  type="button"
                  whileTap={pressTap}
                  onClick={openCreateEntry}
                  className="ws-button-primary flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold"
                >
                  <Plus size={17} strokeWidth={1.8} />
                  {t("common.createEntry")}
                </motion.button>
              ) : null}

              <button
                type="button"
                onClick={() => navigate("/entries")}
                className="ws-button-secondary h-11 rounded-full px-5 text-sm font-semibold"
              >
                {t("common.browseArchive")}
              </button>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-muted)] p-5"
          >
            <p className="text-[0.66rem] font-bold uppercase tracking-[0.24em] text-[var(--text-faint)]">
              {t("common.currentWorld")}
            </p>

            <h3 className="ws-display mt-3 text-2xl font-semibold text-[var(--text)]">
              {profile.name}
            </h3>

            {profile.description ? (
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                {profile.description}
              </p>
            ) : null}

            <div className="mt-5 space-y-3">
              {[
                [t("dashboard.mode"), t("dashboard.localFirst")],
                [t("dashboard.structure"), t("dashboard.structureValue")],
                [t("dashboard.aesthetic"), t("dashboard.aestheticValue")],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-sm"
                >
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className="font-medium text-[var(--text)]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </motion.aside>
        </div>

        <motion.div
          variants={listContainer}
          initial="initial"
          animate="animate"
          className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <motion.div
                key={stat.label}
                variants={listItem}
                whileHover={cardHover}
                className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-muted)] p-5 will-change-transform"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)]">
                  <Icon size={18} strokeWidth={1.65} />
                </div>

                <div className="ws-display text-4xl font-semibold leading-none text-[var(--text)]">
                  {stat.value}
                </div>

                <div className="mt-2 text-sm font-medium text-[var(--text-muted)]">
                  {stat.label}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="ws-eyebrow">{t("dashboard.latestWork")}</p>

            <h3 className="ws-display mt-2 text-3xl font-semibold text-[var(--text)]">
              {t("dashboard.recentlyUpdated")}
            </h3>

            <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
              {t("dashboard.continueEditing")}
            </p>
          </div>

          {recentEntries.length > 0 ? (
            <button
              type="button"
              onClick={() => navigate("/entries")}
              className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
            >
              {t("common.browseArchive")}
            </button>
          ) : null}
        </div>

        {recentEntries.length === 0 ? (
          <div className="ws-surface rounded-[2rem] border-dashed p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)]">
              <BookOpen size={20} strokeWidth={1.65} />
            </div>

            <h4 className="ws-display mt-5 text-2xl font-semibold text-[var(--text)]">
              {t("dashboard.noEntries")}
            </h4>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-muted)]">
              {t("dashboard.startFirst")}
            </p>

            <button
              type="button"
              onClick={openCreateEntry}
              className="ws-button-primary mt-6 rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              {t("topbar.newEntry")}
            </button>
          </div>
        ) : (
          <motion.div
            variants={listContainer}
            initial="initial"
            animate="animate"
            className="grid gap-4 lg:grid-cols-2"
          >
            {recentEntries.map((entry) => {
              const typeMeta = getEntryTypeMeta(entry.type);

              return (
                <motion.article
                  key={entry.id}
                  variants={listItem}
                  whileHover={cardHover}
                  whileTap={pressTap}
                  onClick={() => navigate(`/entries/${entry.id}`)}
                  className={[
                    "ws-surface group cursor-pointer overflow-hidden rounded-[1.5rem] p-5 transition will-change-transform",
                    typeMeta.borderClassName,
                  ].join(" ")}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <EntryTypeBadge type={entry.type} />

                    <span className="text-xs font-medium text-[var(--text-faint)]">
                      {formatEntryDate(entry.updatedAt, locale)}
                    </span>
                  </div>

                  <h4 className="ws-display text-2xl font-semibold leading-tight text-[var(--text)]">
                    {entry.title}
                  </h4>

                  <p className="mt-3 line-clamp-2 text-sm leading-7 text-[var(--text-muted)]">
                    {entry.summary || t("common.noSummary")}
                  </p>

                  {entry.tags.length > 0 ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </section>
    </MotionPage>
  );
}
