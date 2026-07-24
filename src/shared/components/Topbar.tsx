import { motion } from "motion/react";
import { Moon, Plus, Sparkles, Sun } from "lucide-react";
import { Link } from "react-router-dom";

import { pressTap } from "../motion/presets";
import { useTheme } from "../theme/ThemeContext";
import { useEntryStore } from "../../features/entries/stores/useEntryStore";
import { WorldSwitcher } from "../../features/world/components/WorldSwitcher";
import { useI18n } from "../i18n";
import { GlobalSearch } from "./GlobalSearch";
import { ModuleSwitcher } from "./ModuleSwitcher";
import { LanguageMenu } from "./LanguageMenu";

export function Topbar() {
  const openCreateEntry = useEntryStore((state) => state.openCreateEntry);
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const ThemeIcon = theme === "dark" ? Moon : Sun;

  return (
    <header className="sticky top-0 z-[45] border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] px-2 py-2.5 backdrop-blur-2xl sm:px-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-[94rem] items-center gap-1.5 sm:gap-3 lg:gap-5">
        <Link to="/manuscript" className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--accent)] md:flex" aria-label="World Studio">
          <Sparkles size={19} strokeWidth={1.65} />
        </Link>
        <WorldSwitcher />
        <span className="hidden text-[var(--border-strong)] md:inline">/</span>
        <ModuleSwitcher />

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <div className="min-w-0 flex-1 sm:flex sm:justify-end">
            <GlobalSearch />
          </div>

          <motion.button
            type="button"
            whileTap={pressTap}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] sm:flex"
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

          <div className="hidden sm:block">
            <LanguageMenu compact />
          </div>

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
