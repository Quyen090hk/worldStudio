import { motion } from "motion/react";
import { Menu, Moon, Plus, Sun } from "lucide-react";

import { pressTap } from "../motion/presets";
import { useTheme } from "../theme/ThemeContext";
import { useEntryStore } from "../../features/entries/stores/useEntryStore";
import { WorldSwitcher } from "../../features/world/components/WorldSwitcher";
import { useI18n, type Locale } from "../i18n";
import { GlobalSearch } from "./GlobalSearch";

export function Topbar({
  navigationOpen,
  onOpenNavigation,
}: {
  navigationOpen: boolean;
  onOpenNavigation: () => void;
}) {
  const openCreateEntry = useEntryStore((state) => state.openCreateEntry);
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const ThemeIcon = theme === "dark" ? Moon : Sun;

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_80%,transparent)] px-4 py-3 backdrop-blur-2xl sm:py-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 lg:gap-5">
        <button
          id="mobile-navigation-trigger"
          type="button"
          onClick={onOpenNavigation}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)] lg:hidden"
          aria-label={t("navigation.open")}
          title={t("navigation.open")}
          aria-controls="mobile-navigation"
          aria-expanded={navigationOpen}
        >
          <Menu size={19} />
        </button>

        <WorldSwitcher />

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <div className="min-w-0 flex-1 sm:flex sm:justify-end">
            <GlobalSearch />
          </div>

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
            title={
              theme === "dark"
                ? t("theme.switchToLight")
                : t("theme.switchToDark")
            }
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
            className="ws-button-primary flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full text-sm font-semibold sm:h-11 sm:w-auto sm:px-4"
            aria-label={t("topbar.newEntry")}
            title={t("topbar.newEntry")}
          >
            <Plus size={17} strokeWidth={1.8} />
            <span className="hidden sm:inline">{t("topbar.newEntry")}</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
