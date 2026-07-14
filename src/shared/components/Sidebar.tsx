import {
  BookOpen,
  Boxes,
  GitBranch,
  Home,
  Image,
  Map,
  Settings,
  Sparkles,
  Timer,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useI18n } from "../i18n";

const navItems = [
  {
    label: "nav.dashboard",
    path: "/dashboard",
    icon: Home,
  },
  {
    label: "nav.entries",
    path: "/entries",
    icon: BookOpen,
  },
  {
    label: "nav.map",
    path: "/map",
    icon: Map,
  },
  {
    label: "nav.graph",
    path: "/graph",
    icon: GitBranch,
  },
  {
    label: "nav.timeline",
    path: "/timeline",
    icon: Timer,
  },
  {
    label: "nav.canvas",
    path: "/canvas",
    icon: Boxes,
  },
  {
    label: "nav.assets",
    path: "/assets",
    icon: Image,
  },
];

export function Sidebar() {
  const { t } = useI18n();

  return (
    <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_78%,transparent)] px-4 py-5 backdrop-blur-2xl">
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]">
            <Sparkles size={18} strokeWidth={1.65} />
          </div>

          <div>
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--text-faint)]">
              World
            </div>

            <div className="ws-display ws-foil-text text-xl font-bold leading-none">
              Studio
            </div>
          </div>
        </div>

        <div className="mt-5 h-px bg-gradient-to-r from-transparent via-[var(--border)] to-transparent" />
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  "group relative flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold transition",
                  isActive
                    ? "bg-[var(--accent-soft)] text-[var(--text)] ring-1 ring-[var(--border-strong)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition",
                      isActive
                        ? "bg-[var(--accent)] opacity-100"
                        : "bg-transparent opacity-0",
                    ].join(" ")}
                  />

                  <Icon
                    size={18}
                    strokeWidth={1.65}
                    className={isActive ? "text-[var(--accent)]" : ""}
                  />

              <span>{t(item.label)}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="ws-surface-soft rounded-[1.5rem] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--text-faint)]">
              {t("common.currentWorld")}
            </div>

            <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          </div>

          <div className="ws-display ws-foil-text text-lg font-bold leading-tight">
            {t("world.name")}
          </div>

          <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
            {t("world.description")}
          </p>
        </div>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            [
              "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-semibold transition",
              isActive
                ? "bg-[var(--accent-soft)] text-[var(--text)] ring-1 ring-[var(--border-strong)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
            ].join(" ")
          }
        >
          <Settings size={18} strokeWidth={1.65} />
          <span>{t("nav.settings")}</span>
        </NavLink>
      </div>
    </aside>
  );
}
