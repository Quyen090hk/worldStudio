import { motion } from "motion/react";
import { Moon, Plus, Search, Sun } from "lucide-react";

import { pressTap } from "../motion/presets";
import { useTheme } from "../theme/ThemeProvider";
import { useEntryStore } from "../../features/entries/stores/useEntryStore";
import { useI18n, type Locale } from "../i18n";

export function Topbar() {
  const openCreateEntry = useEntryStore((state) => state.openCreateEntry);
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const ThemeIcon = theme === "dark" ? Moon : Sun;

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_80%,transparent)] px-8 py-4 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-5">
        <div>
          <div className="text-[0.66rem] font-bold uppercase tracking-[0.24em] text-[var(--text-faint)]">
            {t("topbar.workspace")}
          </div>

          <h1 className="ws-display ws-foil-text mt-1 text-2xl font-semibold leading-none">
            {t("world.name")}
          </h1>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <label className="ws-input hidden h-11 w-full max-w-md items-center gap-3 rounded-full px-4 lg:flex">
            <Search
              size={17}
              strokeWidth={1.7}
              className="text-[var(--text-faint)]"
            />

            <input
              type="search"
              placeholder={t("topbar.search")}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
            />

            <span className="ws-kbd rounded-md px-1.5 py-0.5">⌘K</span>
          </label>

          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={pressTap}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
            aria-label={
              theme === "dark"
                ? t("theme.switchToLight")
                : t("theme.switchToDark")
            }
            aria-pressed={theme === "dark"}
          >
            <motion.span
              initial={false}
              animate={{ rotate: theme === "dark" ? 180 : 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex"
            >
              <ThemeIcon size={17} strokeWidth={1.7} />
            </motion.span>
          </motion.button>

          <label className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs font-semibold text-[var(--text-muted)] 2xl:flex">
            <span className="sr-only">{t("topbar.language")}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              aria-label={t("topbar.language")}
              className="bg-transparent py-2 outline-none"
            >
              <option value="en-US">EN</option>
              <option value="zh-CN">中文</option>
            </select>
          </label>

          <motion.button
            type="button"
            whileTap={pressTap}
            onClick={openCreateEntry}
            className="ws-button-primary flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"
          >
            <Plus size={17} strokeWidth={1.8} />
            {t("topbar.newEntry")}
          </motion.button>
        </div>
      </div>
    </header>
  );
}
