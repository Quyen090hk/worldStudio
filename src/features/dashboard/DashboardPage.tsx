import { motion } from "motion/react";
import { BookOpen, GitBranch, Map, Timer } from "lucide-react";
import { MotionPage } from "../../shared/components/MotionPage";
import {
  cardHover,
  listContainer,
  listItem,
  pressTap,
} from "../../shared/motion/presets";
import { useEntryStore } from "../entries/stores/useEntryStore";
import { formatEntryDate } from "../entries/utils/formatEntryDate";
import { useNavigate } from "react-router-dom";
import { EntryTypeBadge } from "../entries/components/EntryTypeBadge";
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
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/20">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 max-w-3xl"
        >
          <div className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-violet-300">
            Worldbuilding Studio
          </div>

          <h2 className="text-4xl font-semibold tracking-tight text-white">
            Build, connect, and explore your fictional universe locally.
          </h2>

          <p className="mt-4 text-base leading-7 text-stone-400">
            Organize characters, locations, factions, maps, timelines, and lore
            in one local-first creative workspace.
          </p>
        </motion.div>

        <motion.div
          variants={listContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-4 gap-4"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <motion.div
                key={stat.label}
                variants={listItem}
                whileHover={cardHover}
                whileTap={pressTap}
                className="rounded-3xl border border-white/10 bg-black/20 p-5 will-change-transform"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-violet-200">
                  <Icon size={18} />
                </div>

                <div className="text-3xl font-semibold">{stat.value}</div>
                <div className="mt-1 text-sm text-stone-400">{stat.label}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="text-xl font-semibold">Recently Updated</h3>
            <p className="text-sm text-stone-400">
              Continue editing your latest lore entries.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateEntry}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-stone-300 transition hover:bg-white/10 hover:text-white"
          >
            Create Entry
          </button>
        </div>

        {recentEntries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
            <h4 className="text-lg font-semibold">No entries yet</h4>
            <p className="mt-2 text-sm text-stone-400">
              Create your first character, location, item, organization, or
              event.
            </p>
            <button
              type="button"
              onClick={openCreateEntry}
              className="mt-5 rounded-2xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
            >
              New Entry
            </button>
          </div>
        ) : (
          <motion.div
            variants={listContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 gap-4"
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
                    "cursor-pointer rounded-3xl border bg-white/[0.04] p-5 transition-colors hover:bg-white/[0.07] will-change-transform",
                    typeMeta.borderClassName,
                  ].join(" ")}                >
                  <div className="mb-3 flex items-center justify-between">
                    <EntryTypeBadge type={entry.type} />

                    <span className="text-xs text-stone-500">
                      {formatEntryDate(entry.updatedAt)}
                    </span>
                  </div>

                  <h4 className="text-lg font-semibold">{entry.title}</h4>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-400">
                    {entry.summary || "No summary yet."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-stone-400"
                      >
                        #{tag}
                      </span>
                    ))}
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