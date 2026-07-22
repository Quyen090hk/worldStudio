import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  GitBranch,
  Image,
  Map,
  CalendarDays,
  CheckCircle2,
  Circle,
  Plus,
  Timer,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { DailyQuote } from "../../shared/components/DailyQuote";
import { MotionPage } from "../../shared/components/MotionPage";
import { useI18n } from "../../shared/i18n";
import { pressTap } from "../../shared/motion/presets";
import { useAssetStore } from "../assets/stores/useAssetStore";
import { useCanvasStore } from "../canvas/stores/useCanvasStore";
import { EntryTypeBadge } from "../entries/components/EntryTypeBadge";
import { useEntryStore } from "../entries/stores/useEntryStore";
import { formatEntryDate } from "../entries/utils/formatEntryDate";
import { useRelationshipStore } from "../graph/stores/useRelationshipStore";
import { useMapStore } from "../map/stores/useMapStore";
import { useTimelineStore } from "../timeline/stores/useTimelineStore";
import { useWorldStore } from "../world/stores/useWorldStore";

export function DashboardPage() {
  const [taskDraft, setTaskDraft] = useState("");
  const entries = useEntryStore((state) => state.entries);
  const openCreateEntry = useEntryStore((state) => state.openCreateEntry);
  const markers = useMapStore((state) => state.markers);
  const relationships = useRelationshipStore((state) => state.relationships);
  const timelineItems = useTimelineStore((state) => state.items);
  const canvasCards = useCanvasStore((state) => state.cards);
  const assets = useAssetStore((state) => state.assets);
  const profile = useWorldStore((state) => state.profile);
  const addDailyTask = useWorldStore((state) => state.addDailyTask);
  const toggleDailyTask = useWorldStore((state) => state.toggleDailyTask);
  const deleteDailyTask = useWorldStore((state) => state.deleteDailyTask);
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const todayKey = useMemo(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }, []);
  const todayTasks = profile.dailyTasks?.[todayKey] ?? [];
  const completedTasks = todayTasks.filter((task) => task.completed).length;
  const todayLabel = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${todayKey}T12:00:00`));
  const submitTask = (event: FormEvent) => {
    event.preventDefault();
    if (!taskDraft.trim()) return;
    addDailyTask(todayKey, taskDraft);
    setTaskDraft("");
  };

  const recentEntries = [...entries]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);
  const latestEntry = recentEntries[0] ?? null;
  const modules = [
    { icon: BookOpen, label: t("nav.entries"), value: entries.length, detail: t("dashboard.entries"), path: "/entries" },
    { icon: Map, label: t("nav.map"), value: markers.length, detail: t("dashboard.mapMarkers"), path: "/map" },
    { icon: GitBranch, label: t("nav.graph"), value: relationships.length, detail: t("dashboard.relations"), path: "/graph" },
    { icon: Timer, label: t("nav.timeline"), value: timelineItems.length, detail: t("dashboard.timelineEvents"), path: "/timeline" },
    { icon: Boxes, label: t("nav.canvas"), value: canvasCards.length, detail: t("settings.canvasCards"), path: "/canvas" },
    { icon: Image, label: t("nav.assets"), value: assets.length, detail: t("settings.assets"), path: "/assets" },
  ];

  return (
    <MotionPage className="space-y-12 pb-12 pt-4">
      <header className="grid items-end gap-8 border-b border-[var(--border)] pb-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <p className="mb-3 truncate text-sm font-medium text-[var(--text-muted)]">{profile.name}</p>
          <h1 className="ws-page-title">{latestEntry ? t("dashboard.continueTitle") : t("dashboard.readyTitle")}</h1>
          <p className="ws-page-status">
            {latestEntry
              ? t("dashboard.resumeEntry", { title: latestEntry.title, date: formatEntryDate(latestEntry.updatedAt, locale) })
              : t("dashboard.readyDescription")}
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {latestEntry ? (
              <motion.button type="button" whileTap={pressTap} onClick={() => navigate(`/entries/${latestEntry.id}`)} className="ws-button-primary flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold">
                <BookOpen size={16} />{t("dashboard.continueEntry")}
              </motion.button>
            ) : null}
            <button type="button" onClick={openCreateEntry} className="ws-button-secondary flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold"><Plus size={16} />{t("topbar.newEntry")}</button>
          </div>
        </div>
        <DailyQuote compact />
      </header>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="ws-display text-3xl font-semibold">{t("dashboard.exploreWorld")}</h2>
        </div>
        <div className="grid border-y border-[var(--border)] md:grid-cols-2">
          {modules.map((item, index) => {
            const Icon = item.icon;
            return <motion.button type="button" key={item.path} onClick={() => navigate(item.path)} whileHover={{ y: -3 }} whileTap={pressTap} transition={{ duration: .2, ease: [0.22, 1, 0.36, 1] }} className={`group relative flex items-center gap-4 overflow-hidden py-5 text-left transition-colors hover:bg-[var(--surface-muted)] hover:shadow-[0_12px_28px_-22px_var(--shadow-color)] md:px-5 ${index > 0 ? "border-t border-[var(--border)]" : ""} ${index === 1 ? "md:border-t-0" : ""} ${index % 2 ? "md:border-l" : ""}`}>
              <span className="absolute inset-y-3 left-0 w-0.5 origin-center scale-y-0 rounded-full bg-[var(--accent)] transition-transform duration-300 group-hover:scale-y-100" />
              <Icon size={19} className="text-[var(--accent)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" />
              <span className="min-w-0 flex-1"><b className="block text-sm">{item.label}</b><small className="mt-1 block text-[var(--text-faint)]">{item.value} {item.detail}</small></span>
              <ArrowRight size={15} className="text-[var(--text-faint)] transition group-hover:translate-x-1 group-hover:text-[var(--text)]" />
            </motion.button>;
          })}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,.7fr)]">
        <section>
          <div className="mb-4 flex items-center justify-between"><h2 className="ws-display text-3xl font-semibold">{t("dashboard.recentlyUpdated")}</h2><button type="button" onClick={() => navigate("/entries")} className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">{t("common.browseArchive")}</button></div>
          {recentEntries.length ? <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">{recentEntries.map((entry) => <button type="button" key={entry.id} onClick={() => navigate(`/entries/${entry.id}`)} className="group relative grid w-full gap-2 px-3 py-4 text-left transition-colors hover:bg-[var(--surface-muted)] sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4"><span className="absolute inset-y-3 left-0 w-0.5 origin-center scale-y-0 rounded-full bg-[var(--accent)] transition-transform group-hover:scale-y-100" /><EntryTypeBadge type={entry.type} /><span className="min-w-0"><b className="block truncate text-sm">{entry.title}</b><small className="mt-1 block truncate text-[var(--text-faint)]">{entry.summary || t("common.noSummary")}</small></span><time className="text-xs text-[var(--text-faint)]">{formatEntryDate(entry.updatedAt, locale)}</time></button>)}</div> : <button type="button" onClick={openCreateEntry} className="w-full border-y border-dashed border-[var(--border)] py-12 text-sm text-[var(--text-muted)]">{t("dashboard.readyDescription")}</button>}
        </section>

        <aside className="self-start rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_48%,transparent)] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><CalendarDays size={15} /></span>
              <div><h2 className="ws-display text-xl font-semibold">{t("dashboard.todayPlan")}</h2><p className="mt-1 text-xs leading-5 text-[var(--text-faint)]">{todayLabel}</p></div>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[0.68rem] text-[var(--text-faint)]">{t("dashboard.taskProgress", { completed: completedTasks, total: todayTasks.length })}</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--text-faint)]">{t("dashboard.todayPlanHint")}</p>
          <form onSubmit={submitTask} className="mt-4 flex gap-2">
            <input value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} maxLength={160} placeholder={t("dashboard.taskPlaceholder")} className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-solid)] px-3 py-2.5 text-sm outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]" />
            <motion.button type="submit" whileTap={pressTap} disabled={!taskDraft.trim()} className="ws-button-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-40" aria-label={t("dashboard.addTask")} title={t("dashboard.addTask")}><Plus size={16} /></motion.button>
          </form>
          <div className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {todayTasks.length ? todayTasks.map((task) => (
              <div key={task.id} className="group flex items-start gap-2 py-3">
                <button type="button" onClick={() => toggleDailyTask(todayKey, task.id)} className="mt-0.5 shrink-0 text-[var(--text-faint)] transition-colors hover:text-[var(--accent)]" aria-label={task.completed ? t("dashboard.markIncomplete") : t("dashboard.markComplete")}>{task.completed ? <CheckCircle2 size={17} className="text-[var(--accent)]" /> : <Circle size={17} />}</button>
                <span className={`min-w-0 flex-1 text-sm leading-5 ${task.completed ? "text-[var(--text-faint)] line-through" : "text-[var(--text)]"}`}>{task.text}</span>
                <button type="button" onClick={() => deleteDailyTask(todayKey, task.id)} className="shrink-0 rounded-md p-1 text-[var(--text-faint)] opacity-60 transition hover:bg-red-500/10 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100" aria-label={t("dashboard.deleteTask")} title={t("dashboard.deleteTask")}><Trash2 size={14} /></button>
              </div>
            )) : <p className="py-6 text-center text-xs leading-5 text-[var(--text-faint)]">{t("dashboard.noTasksToday")}</p>}
          </div>
        </aside>
      </div>
    </MotionPage>
  );
}
