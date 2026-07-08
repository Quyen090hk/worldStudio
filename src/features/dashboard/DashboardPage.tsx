import { motion } from "motion/react";
import { BookOpen, GitBranch, Map, Plus, Sparkles, Timer } from "lucide-react";
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
import { formatEntryDate } from "../entries/utils/formatEntryDate";
import { getEntryTypeMeta } from "../entries/utils/entryTypeMeta";

export function DashboardPage() {
  const entries = useEntryStore((state) => state.entries);
  const openCreateEntry = useEntryStore((state) => state.openCreateEntry);

  const navigate = useNavigate();

  const recentEntries = [...entries]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 4);

  const stats = [
    {
      label: "Entries",
      value: String(entries.length),
      icon: BookOpen,
    },
    {
      label: "Map Markers",
      value: "0",
      icon: Map,
    },
    {
      label: "Relations",
      value: "0",
      icon: GitBranch,
    },
    {
      label: "Timeline Events",
      value: "0",
      icon: Timer,
    },
  ];

  return (
    <MotionPage className="space-y-8">
      <section className="ws-surface-raised relative overflow-hidden rounded-[2.25rem] p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,var(--accent-soft),transparent_25rem)]" />

        <div className="relative grid gap-8 xl:grid-cols-[1fr_22rem]">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            <div className="ws-eyebrow mb-5">Worldbuilding Studio</div>

            <h2 className="ws-display-tight text-5xl font-semibold leading-[0.98] text-[var(--text)] md:text-6xl">
              Build a private atlas for every world you imagine.
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--text-muted)]">
              Collect characters, places, factions, relics, events, maps, and
              timelines inside a quiet local-first studio.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <motion.button
                type="button"
                whileTap={pressTap}
                onClick={openCreateEntry}
                className="ws-button-primary flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold"
              >
                <Plus size={17} strokeWidth={1.9} />
                Create Entry
              </motion.button>

              <button
                type="button"
                onClick={() => navigate("/entries")}
                className="ws-button-secondary h-11 rounded-full px-5 text-sm font-semibold"
              >
                Browse Archive
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="ws-surface-soft rounded-[1.75rem] p-5"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--text-faint)]">
                  Current World
                </div>

                <div className="ws-display mt-2 text-2xl font-semibold text-[var(--text)]">
                  The Ashen Archive
                </div>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                <Sparkles size={18} strokeWidth={1.7} />
              </div>
            </div>

            <div className="space-y-3">
              {[
                ["Mode", "Local-first"],
                ["Structure", "Entries / Maps / Timeline"],
                ["Aesthetic", "Black Gold Editorial"],
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
          </motion.div>
        </div>

        <motion.div
          variants={listContainer}
          initial="initial"
          animate="animate"
          className="relative mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <motion.div
                key={stat.label}
                variants={listItem}
                whileHover={cardHover}
                whileTap={pressTap}
                className="ws-surface-soft rounded-[1.5rem] p-5 will-change-transform"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon size={18} strokeWidth={1.7} />
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
            <p className="ws-eyebrow">Latest Work</p>

            <h3 className="ws-display mt-2 text-3xl font-semibold text-[var(--text)]">
              Recently Updated
            </h3>

            <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
              Continue editing your latest lore entries.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateEntry}
            className="ws-button-secondary rounded-full px-4 py-2 text-sm font-semibold"
          >
            Create Entry
          </button>
        </div>

        {recentEntries.length === 0 ? (
          <div className="ws-surface rounded-[2rem] border-dashed p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              <BookOpen size={20} strokeWidth={1.7} />
            </div>

            <h4 className="ws-display mt-5 text-2xl font-semibold text-[var(--text)]">
              No entries yet
            </h4>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-muted)]">
              Create your first character, location, item, organization, or
              event to start shaping this world.
            </p>

            <button
              type="button"
              onClick={openCreateEntry}
              className="ws-button-primary mt-6 rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              New Entry
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
                    "ws-surface group relative cursor-pointer overflow-hidden rounded-[1.75rem] p-5 transition will-change-transform",
                    typeMeta.borderClassName,
                  ].join(" ")}
                >
                  <div
                    className={[
                      "pointer-events-none absolute inset-0 opacity-60",
                      typeMeta.glowClassName,
                    ].join(" ")}
                  />

                  <div className="relative">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <EntryTypeBadge type={entry.type} />

                      <span className="text-xs font-medium text-[var(--text-faint)]">
                        {formatEntryDate(entry.updatedAt)}
                      </span>
                    </div>

                    <h4 className="ws-display text-2xl font-semibold leading-tight text-[var(--text)]">
                      {entry.title}
                    </h4>

                    <p className="mt-3 line-clamp-2 text-sm leading-7 text-[var(--text-muted)]">
                      {entry.summary || "No summary yet."}
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