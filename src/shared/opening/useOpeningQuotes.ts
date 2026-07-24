import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";
import {
  addCustomOpeningQuote,
  getOpeningQuotes,
  getSelectedOpeningQuote,
  isCustomOpeningQuote,
  removeCustomOpeningQuote,
  selectOpeningQuote,
  type OpeningQuote,
} from "./openingQuotes";

const favoritesKey = "world-studio-favorite-quotes";

function readFavorites(locale: string) {
  try {
    const value = JSON.parse(localStorage.getItem(`${favoritesKey}.${locale}`) ?? "[]");
    return Array.isArray(value) ? value.filter(Number.isInteger) as number[] : [];
  } catch {
    return [];
  }
}

export function useOpeningQuotes() {
  const { locale } = useI18n();
  const [collectionsByLocale, setCollectionsByLocale] = useState<Partial<Record<string, OpeningQuote[]>>>({});
  const collection = collectionsByLocale[locale] ?? getOpeningQuotes(locale);
  const initial = useMemo(() => getSelectedOpeningQuote(locale), [locale]);
  const [indices, setIndices] = useState<Record<string, number>>(() => ({ [locale]: initial.index }));
  const [favoritesByLocale, setFavoritesByLocale] = useState<Record<string, number[]>>(() => ({ [locale]: readFavorites(locale) }));
  const index = indices[locale] ?? initial.index;
  const favorites = favoritesByLocale[locale] ?? readFavorites(locale);
  const safeIndex = ((index % collection.length) + collection.length) % collection.length;

  useEffect(() => {
    const syncSelection = (event: Event) => {
      const detail = (event as CustomEvent<{ locale?: string; index?: number }>).detail;
      if (detail?.locale !== locale || !Number.isInteger(detail.index)) return;
      setIndices((current) => ({ ...current, [locale]: detail.index! }));
    };
    window.addEventListener("world-studio-opening-quote-selected", syncSelection);
    return () => window.removeEventListener("world-studio-opening-quote-selected", syncSelection);
  }, [locale]);

  const choose = useCallback((nextIndex: number) => {
    const selected = selectOpeningQuote(locale, nextIndex);
    setIndices((current) => ({ ...current, [locale]: selected.index }));
  }, [locale]);

  const next = useCallback(() => choose(safeIndex + 1), [choose, safeIndex]);
  const previous = useCallback(() => choose(safeIndex - 1), [choose, safeIndex]);
  const toggleFavorite = useCallback(() => {
    setFavoritesByLocale((allFavorites) => {
      const current = allFavorites[locale] ?? readFavorites(locale);
      const nextValue = current.includes(safeIndex)
        ? current.filter((value) => value !== safeIndex)
        : [...current, safeIndex];
      try {
        localStorage.setItem(`${favoritesKey}.${locale}`, JSON.stringify(nextValue));
      } catch {
        // Favorites remain available for the current session.
      }
      return { ...allFavorites, [locale]: nextValue };
    });
  }, [locale, safeIndex]);

  const addQuote = useCallback((quote: OpeningQuote) => {
    const nextIndex = addCustomOpeningQuote(locale, quote);
    selectOpeningQuote(locale, nextIndex);
    setIndices((current) => ({ ...current, [locale]: nextIndex }));
    setCollectionsByLocale((current) => ({ ...current, [locale]: getOpeningQuotes(locale) }));
  }, [locale]);

  const removeQuote = useCallback((quoteIndex: number) => {
    if (!removeCustomOpeningQuote(locale, quoteIndex)) return;
    const remaining = getOpeningQuotes(locale);
    const nextIndex = Math.min(safeIndex, remaining.length - 1);
    selectOpeningQuote(locale, nextIndex);
    setIndices((current) => ({ ...current, [locale]: nextIndex }));
    setCollectionsByLocale((current) => ({ ...current, [locale]: remaining }));
  }, [locale, safeIndex]);

  return {
    quote: collection[safeIndex],
    index: safeIndex,
    total: collection.length,
    favorite: favorites.includes(safeIndex),
    favorites,
    collection,
    choose,
    next,
    previous,
    toggleFavorite,
    addQuote,
    removeQuote,
    isCustom: (quoteIndex: number) => isCustomOpeningQuote(locale, quoteIndex),
  };
}
