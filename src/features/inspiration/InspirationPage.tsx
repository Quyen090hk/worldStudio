import { ChevronLeft, ChevronRight, Heart, Plus, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { MotionPage } from "../../shared/components/MotionPage";
import { useI18n } from "../../shared/i18n";
import { useOpeningQuotes } from "../../shared/opening/useOpeningQuotes";

export function InspirationPage() {
  const { t } = useI18n();
  const { quote, index, total, previous, next, favorite, toggleFavorite, collection, choose, favorites, addQuote, removeQuote, isCustom } = useOpeningQuotes();
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [source, setSource] = useState("");

  function submitQuote(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || !source.trim()) return;
    addQuote({ text, translation, source });
    setText("");
    setTranslation("");
    setSource("");
    setComposing(false);
  }
  return (
    <MotionPage className="mx-auto max-w-5xl py-3 sm:py-6">
      <section className="relative border-y border-[var(--border)] px-6 py-12 text-center sm:py-16">
        <div className="relative mx-auto h-[20rem] max-w-3xl overflow-hidden sm:h-[22rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={index} className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto px-2 py-4" initial={{ opacity: 0, x: 18, filter: "blur(6px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} exit={{ opacity: 0, x: -18, filter: "blur(5px)" }} transition={{ duration: .38, ease: [0.22, 1, 0.36, 1] }}>
              <blockquote className="ws-display text-3xl leading-relaxed text-[var(--text)] sm:text-5xl">{quote.text}</blockquote>
              {quote.translation ? <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">{quote.translation}</p> : null}
              <cite className="mt-5 text-sm not-italic text-[var(--text-faint)]">{quote.source}</cite>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-10 flex items-center justify-center gap-3">
          <button type="button" onClick={previous} className="ws-button-secondary flex h-11 w-11 items-center justify-center rounded-full" aria-label={t("inspiration.previous")}><ChevronLeft size={18} /></button>
          <button type="button" onClick={toggleFavorite} className={`flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${favorite ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"}`}><Heart size={16} fill={favorite ? "currentColor" : "none"} />{t("inspiration.favorite")}</button>
          <button type="button" onClick={next} className="ws-button-primary flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold">{t("inspiration.another")}<ChevronRight size={17} /></button>
        </div>
        <p className="mt-5 text-xs text-[var(--text-faint)]">{index + 1} / {total} · {t("inspiration.openingHint")}</p>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="ws-display text-2xl font-semibold">{t("inspiration.collection")}</h2><span className="text-xs text-[var(--text-faint)]">{favorites.length} {t("inspiration.favorites")}</span></div>
          <button type="button" onClick={() => setComposing((value) => !value)} className="ws-button-secondary flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold">{composing ? <X size={15} /> : <Plus size={15} />}{composing ? t("inspiration.cancelCustom") : t("inspiration.addCustom")}</button>
        </div>
        <AnimatePresence initial={false}>
          {composing ? <motion.form onSubmit={submitQuote} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-[var(--text-muted)] sm:col-span-2">{t("inspiration.customText")}<textarea required value={text} onChange={(event) => setText(event.target.value)} rows={2} className="ws-input mt-2 w-full resize-y rounded-xl px-3 py-2.5 text-sm" placeholder={t("inspiration.customTextPlaceholder")} /></label>
              <label className="text-xs font-semibold text-[var(--text-muted)]">{t("inspiration.customTranslation")}<input value={translation} onChange={(event) => setTranslation(event.target.value)} className="ws-input mt-2 h-11 w-full rounded-xl px-3 text-sm" placeholder={t("inspiration.customTranslationPlaceholder")} /></label>
              <label className="text-xs font-semibold text-[var(--text-muted)]">{t("inspiration.customSource")}<input required value={source} onChange={(event) => setSource(event.target.value)} className="ws-input mt-2 h-11 w-full rounded-xl px-3 text-sm" placeholder={t("inspiration.customSourcePlaceholder")} /></label>
              <div className="flex justify-end sm:col-span-2"><button type="submit" disabled={!text.trim() || !source.trim()} className="ws-button-primary h-10 rounded-full px-5 text-sm font-semibold disabled:opacity-40">{t("inspiration.saveCustom")}</button></div>
            </div>
          </motion.form> : null}
        </AnimatePresence>
        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {collection.map((item, itemIndex) => <div key={`${item.source}-${itemIndex}`} className="group flex items-center gap-2"><button type="button" onClick={() => choose(itemIndex)} className="flex min-w-0 flex-1 items-center gap-4 py-4 text-left transition group-hover:pl-2"><span className="w-6 text-xs text-[var(--text-faint)]">{String(itemIndex + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><b className="block truncate font-medium">{item.text}</b>{item.translation ? <small className="mt-1 block truncate text-[var(--text-muted)]">{item.translation}</small> : null}<small className="mt-1 block text-[var(--text-faint)]">{item.source}</small></span>{favorites.includes(itemIndex) ? <Heart size={14} fill="currentColor" className="text-[var(--accent)]" /> : null}</button>{isCustom(itemIndex) ? <button type="button" onClick={() => removeQuote(itemIndex)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-faint)] transition hover:bg-red-500/10 hover:text-red-500" aria-label={t("inspiration.deleteCustom")}><Trash2 size={15} /></button> : null}</div>)}
        </div>
      </section>
    </MotionPage>
  );
}
