import { Languages } from "lucide-react";
import { motion } from "motion/react";

import { pressTap } from "../motion/presets";
import { useI18n } from "../i18n";

/**
 * Two-language quick toggle. The public component name stays stable so this
 * can return to a menu when a third locale is introduced.
 */
export function LanguageMenu({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const current = locale === "zh-CN" ? "中文" : "EN";
  const compactLabel = locale === "zh-CN" ? "中" : "EN";
  const nextLocale = locale === "zh-CN" ? "en-US" : "zh-CN";
  const currentLabel = locale === "zh-CN" ? "中文" : "English";

  return (
    <motion.button
      type="button"
      whileTap={pressTap}
      onClick={() => setLocale(nextLocale)}
      className={`flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)] ${compact ? "h-10 w-10 shrink-0 justify-center text-xs" : "h-10 w-full gap-3 px-3 text-sm"}`}
      aria-label={`${t("topbar.language")}: ${currentLabel}`}
      title={`${t("topbar.language")}: ${currentLabel}`}
    >
      {!compact ? <Languages size={18} strokeWidth={1.65} className="shrink-0" /> : null}
      {!compact ? <span className="min-w-0 flex-1 text-left">{t("topbar.language")}</span> : null}
      <motion.span
        key={locale}
        className={compact ? "flex h-5 w-6 items-center justify-center whitespace-nowrap" : "flex h-5 w-8 items-center justify-center whitespace-nowrap"}
        initial={{ opacity: 0, rotateY: -80, scale: .88 }}
        animate={{ opacity: 1, rotateY: 0, scale: 1 }}
        transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}
      >
        {compact ? compactLabel : current}
      </motion.span>
    </motion.button>
  );
}
