import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";

import { useI18n } from "../i18n";
import { getOpeningQuotes, getSelectedOpeningQuote, selectOpeningQuote } from "../opening/openingQuotes";

const IDLE_DELAY_MS = 5 * 60 * 1_000;
const QUOTE_INTERVAL_MS = 9_000;
const TRANSFER_DURATION_MS = 1_050;

function createQuoteTransferClone(source: HTMLElement) {
  const rect = source.getBoundingClientRect();
  const computed = window.getComputedStyle(source);
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("data-frontispiece-quote-source");
  clone.removeAttribute("class");
  Object.assign(clone.style, {
    position: "fixed",
    zIndex: "400",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    color: computed.color,
    fontFamily: computed.fontFamily,
    fontSize: computed.fontSize,
    fontStyle: computed.fontStyle,
    fontWeight: computed.fontWeight,
    letterSpacing: computed.letterSpacing,
    lineHeight: computed.lineHeight,
    textAlign: computed.textAlign,
    textWrap: "balance",
    overflow: "visible",
    pointerEvents: "none",
    willChange: "left, top, width, font-size, line-height, opacity, filter",
  });
  document.body.append(clone);
  return {
    clone,
    rect,
    styles: {
      color: computed.color,
      fontSize: computed.fontSize,
      letterSpacing: computed.letterSpacing,
      lineHeight: computed.lineHeight,
    },
  };
}

async function waitForManuscriptQuoteTarget() {
  for (let frame = 0; frame < 20; frame += 1) {
    const target = document.querySelector<HTMLElement>("[data-manuscript-quote-target]");
    if (target) return target;
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  }
  return null;
}

export function IdleFrontispiece() {
  const { locale } = useI18n();
  const navigate = useNavigate();
  const selected = getSelectedOpeningQuote(locale);
  const quotes = getOpeningQuotes(locale);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(selected.index);
  const idleTimer = useRef<number | null>(null);
  const dismissing = useRef(false);
  const quoteSourceRef = useRef<HTMLQuoteElement>(null);

  const arm = useCallback(() => {
    if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
    const revealWhenAvailable = () => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
        idleTimer.current = window.setTimeout(revealWhenAvailable, IDLE_DELAY_MS);
        return;
      }
      setIndex(getSelectedOpeningQuote(locale).index);
      document.documentElement.dataset.frontispieceActive = "true";
      setVisible(true);
    };
    idleTimer.current = window.setTimeout(revealWhenAvailable, IDLE_DELAY_MS);
  }, [locale]);

  const dismiss = useCallback(async () => {
    if (!visible || dismissing.current) return;
    dismissing.current = true;
    selectOpeningQuote(locale, index);
    window.dispatchEvent(new CustomEvent("world-studio-opening-quote-selected", { detail: { locale, index } }));
    // Resolve the lazy route before measuring its final epigraph position.
    await import("../../features/manuscript/ManuscriptPage").catch(() => undefined);
    const transfer = quoteSourceRef.current ? createQuoteTransferClone(quoteSourceRef.current) : null;
    document.documentElement.dataset.frontispieceTransfer = "true";
    flushSync(() => {
      delete document.documentElement.dataset.frontispieceActive;
      setVisible(false);
      navigate("/manuscript");
    });
    const target = await waitForManuscriptQuoteTarget();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (transfer && target && !reduceMotion) {
      const targetRect = target.getBoundingClientRect();
      const targetStyles = window.getComputedStyle(target);
      const animation = transfer.clone.animate([
        {
          left: `${transfer.rect.left}px`,
          top: `${transfer.rect.top}px`,
          width: `${transfer.rect.width}px`,
          fontSize: transfer.styles.fontSize,
          lineHeight: transfer.styles.lineHeight,
          letterSpacing: transfer.styles.letterSpacing,
          color: transfer.styles.color,
          opacity: 1,
          filter: "blur(0)",
          offset: 0,
        },
        {
          left: `${transfer.rect.left}px`,
          top: `${transfer.rect.top - 4}px`,
          width: `${transfer.rect.width}px`,
          fontSize: transfer.styles.fontSize,
          lineHeight: transfer.styles.lineHeight,
          letterSpacing: transfer.styles.letterSpacing,
          color: transfer.styles.color,
          opacity: 1,
          filter: "blur(0)",
          offset: .14,
        },
        {
          left: `${targetRect.left}px`,
          top: `${targetRect.top}px`,
          width: `${targetRect.width}px`,
          fontSize: targetStyles.fontSize,
          lineHeight: targetStyles.lineHeight,
          letterSpacing: targetStyles.letterSpacing,
          color: targetStyles.color,
          opacity: 1,
          filter: "blur(0)",
          offset: 1,
        },
      ], {
        duration: TRANSFER_DURATION_MS,
        easing: "cubic-bezier(.22, 1, .36, 1)",
        fill: "forwards",
      });
      await animation.finished.catch(() => undefined);
    }
    transfer?.clone.remove();
    delete document.documentElement.dataset.frontispieceTransfer;
    if (!transfer && !reduceMotion) target?.classList.add("frontispiece-fallback-arrive");
    dismissing.current = false;
    arm();
  }, [arm, index, locale, navigate, visible]);

  useEffect(() => {
    const activity = () => { if (!visible) arm(); };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "wheel", "touchstart"];
    for (const event of events) window.addEventListener(event, activity, { passive: true });
    arm();
    return () => {
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
      delete document.documentElement.dataset.frontispieceActive;
      for (const event of events) window.removeEventListener(event, activity);
    };
  }, [arm, visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % quotes.length), QUOTE_INTERVAL_MS);
    const onKeyDown = (event: KeyboardEvent) => {
      if (["Control", "Meta", "Alt", "Shift"].includes(event.key)) return;
      dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dismiss, quotes.length, visible]);

  const quote = quotes[((index % quotes.length) + quotes.length) % quotes.length];
  return visible ? <motion.div
    role="dialog"
    aria-modal="true"
    aria-label={locale === "zh-CN" ? "扉页" : "Frontispiece"}
    onClick={dismiss}
    className="fixed inset-0 z-[100] grid cursor-pointer place-items-center overflow-hidden bg-[var(--bg)] px-6 text-center"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    transition={{ duration: .5, ease: [0.22, 1, 0.36, 1] }}
  >
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_50%_42%,var(--accent-soft),transparent_42%)]" />
    <AnimatePresence mode="wait" initial={false}>
      <motion.figure
        key={`${locale}-${index}`}
        className="opening-quote-shared frontispiece-quote-owner relative max-w-3xl"
        initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
        transition={{ duration: .8, ease: [0.22, 1, 0.36, 1] }}
      >
        <blockquote ref={quoteSourceRef} data-frontispiece-quote-source className="ws-display text-balance text-3xl font-medium leading-relaxed sm:text-5xl">{quote.text}</blockquote>
        {quote.translation ? <p className="mt-5 text-sm leading-7 text-[var(--text-muted)]">{quote.translation}</p> : null}
        <figcaption className="mt-6 text-[10px] uppercase tracking-[.2em] text-[var(--text-faint)]">{quote.source}</figcaption>
      </motion.figure>
    </AnimatePresence>
  </motion.div> : null;
}
