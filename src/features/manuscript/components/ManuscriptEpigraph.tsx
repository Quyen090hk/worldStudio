import { useOpeningQuotes } from "../../../shared/opening/useOpeningQuotes";

export function ManuscriptEpigraph() {
  const { quote } = useOpeningQuotes();
  return <figure data-opening-quote-target data-manuscript-epigraph className="opening-quote-shared mb-4 flex min-h-8 items-baseline justify-center gap-x-3 px-4 text-center text-[var(--text-faint)]">
    <blockquote data-manuscript-quote-target className="ws-display text-sm italic leading-6 sm:text-base">{quote.text}</blockquote>
    <figcaption className="hidden shrink-0 text-[10px] tracking-wide opacity-70 sm:block">— {quote.source}</figcaption>
  </figure>;
}
