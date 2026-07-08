import { motion } from "motion/react";
import { Monitor, Moon, Plus, Search, Sun } from "lucide-react";

import { pressTap } from "../motion/presets";
import { useTheme, type Theme } from "../theme/ThemeProvider";
import { useEntryStore } from "../../features/entries/stores/useEntryStore";

const themeOptions: Array<{
  value: Theme;
  label: string;
  icon: typeof Monitor;
}> = [
  {
    value: "system",
    label: "System",
    icon: Monitor,
  },
  {
    value: "light",
    label: "Light",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
  },
];

export function Topbar() {
  const openCreateEntry = useEntryStore((state) => state.openCreateEntry);
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_72%,transparent)] px-8 py-4 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-5">
        <div>
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-faint)]">
            Workspace
          </div>

          <h1 className="ws-display mt-1 text-2xl font-semibold leading-none text-[var(--text)]">
            The Ashen Archive
          </h1>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <label className="ws-input hidden h-11 w-full max-w-md items-center gap-3 rounded-full px-4 lg:flex">
            <Search size={17} strokeWidth={1.7} className="text-[var(--text-faint)]" />

            <input
              type="search"
              placeholder="Search entries, places, events..."
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
            />

            <span className="ws-kbd rounded-md px-1.5 py-0.5">⌘K</span>
          </label>

          <div className="hidden items-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] p-1 xl:flex">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={[
                    "flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition",
                    isActive
                      ? "bg-[var(--surface-raised)] text-[var(--text)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text)]",
                  ].join(" ")}
                  aria-pressed={isActive}
                >
                  <Icon size={14} strokeWidth={1.7} />
                  {option.label}
                </button>
              );
            })}
          </div>

          <motion.button
            type="button"
            whileTap={pressTap}
            onClick={openCreateEntry}
            className="ws-button-primary flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"
          >
            <Plus size={17} strokeWidth={1.9} />
            New Entry
          </motion.button>
        </div>
      </div>
    </header>
  );
}