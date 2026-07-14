import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { enUS } from "./en-US";
import { zhCN } from "./zh-CN";
import type { Locale, TranslationParams, Translator } from "./types";

const STORAGE_KEY = "world-studio-locale";
const messages = { "en-US": enUS, "zh-CN": zhCN } as const;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translator;
  formatNumber: (value: number) => string;
  formatDate: (value: string, options?: Intl.DateTimeFormatOptions) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en-US";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en-US" || stored === "zh-CN") return stored;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

function interpolate(value: string, params?: TranslationParams) {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  const t = useCallback<Translator>(
    (key, params) => interpolate(messages[locale][key] ?? enUS[key] ?? key, params),
    [locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      formatNumber: (number) => new Intl.NumberFormat(locale).format(number),
      formatDate: (value, options) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime())
          ? t("common.invalidDate")
          : new Intl.DateTimeFormat(locale, options).format(date);
      },
    }),
    [locale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

export type { Locale } from "./types";
