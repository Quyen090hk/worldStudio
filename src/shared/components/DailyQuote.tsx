import { ArrowRight, Heart, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { useOpeningQuotes } from "../opening/useOpeningQuotes";

export function DailyQuote({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { quote, index, next, favorite, toggleFavorite } = useOpeningQuotes();
  return (
    <section className={compact ? "py-1" : "ws-compact-surface p-5 sm:p-6"}>
      <div className="flex items-center justify-between gap-3">
        <p className="ws-eyebrow">{t("inspiration.today")}</p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={toggleFavorite} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-faint)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--accent)]" aria-label={t("inspiration.favorite")}>
            <Heart size={15} fill={favorite ? "currentColor" : "none"} />
          </button>
          <motion.button type="button" onClick={next} whileTap={{ rotate: 150, scale: .88 }} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-faint)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]" aria-label={t("inspiration.another")}>
            <RefreshCw size={15} />
          </motion.button>
        </div>
      </div>
      <div className={compact ? "min-h-[11.5rem]" : "min-h-[13rem]"}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={index} initial={{ opacity: 0, y: 10, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8, filter: "blur(3px)" }} transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}>
          <blockquote
            className={`${compact ? "mt-3 text-xl" : "mt-5 text-2xl sm:text-3xl"} ws-display leading-relaxed text-[var(--text)]`}
            style={{ viewTransitionName: "daily-quote" }}
          >
            {quote.text}
          </blockquote>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{quote.translation}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <cite className="text-xs not-italic text-[var(--text-faint)]">{quote.source}</cite>
            {!compact ? <button type="button" onClick={() => navigate("/inspiration")} className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">{t("inspiration.openPage")}<ArrowRight size={13} /></button> : null}
          </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
