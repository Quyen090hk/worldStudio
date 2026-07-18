import type { Locale } from "../i18n/types";

export type OpeningQuote = {
  text: string;
  translation: string;
  source: string;
};

// Public-domain texts with concise editorial translations. Keeping both lines
// lets every locale include poetry and prose without hiding the original voice.
const quotes: Record<Locale, OpeningQuote[]> = {
  "zh-CN": [
    { text: "天地有大美而不言。", translation: "Heaven and earth possess a wordless beauty.", source: "《庄子·知北游》" },
    { text: "The world was all before them.", translation: "整个世界都在他们面前。", source: "约翰·弥尔顿《失乐园》" },
    { text: "云无心以出岫，鸟倦飞而知还。", translation: "Clouds drift from the peaks; weary birds know their way home.", source: "陶渊明《归去来兮辞》" },
    { text: "There is no charm equal to tenderness of heart.", translation: "没有什么魅力，能与内心的温柔相比。", source: "简·奥斯汀《爱玛》" },
    { text: "操千曲而后晓声，观千剑而后识器。", translation: "Know music after a thousand tunes; know craft after a thousand blades.", source: "刘勰《文心雕龙》" },
    { text: "I had not lived enough in the world to know the value of a journal.", translation: "那时我涉世未深，还不懂一本日记的价值。", source: "亨利·戴维·梭罗《瓦尔登湖》" },
    { text: "行到水穷处，坐看云起时。", translation: "Walk to where the stream ends; sit and watch the clouds arise.", source: "王维《终南别业》" },
    { text: "Forever is composed of nows.", translation: "永恒由一个个此刻组成。", source: "艾米莉·狄金森" },
  ],
  "en-US": [
    { text: "The world was all before them.", translation: "整个世界都在他们面前。", source: "John Milton · Paradise Lost" },
    { text: "行到水穷处，坐看云起时。", translation: "Walk to where the stream ends; sit and watch the clouds arise.", source: "Wang Wei · My Retreat at Mount Zhongnan" },
    { text: "There is no charm equal to tenderness of heart.", translation: "没有什么魅力，能与内心的温柔相比。", source: "Jane Austen · Emma" },
    { text: "云无心以出岫，鸟倦飞而知还。", translation: "Clouds drift from the peaks; weary birds know their way home.", source: "Tao Yuanming · Returning Home" },
    { text: "Forever is composed of nows.", translation: "永恒由一个个此刻组成。", source: "Emily Dickinson" },
    { text: "天地有大美而不言。", translation: "Heaven and earth possess a wordless beauty.", source: "Zhuangzi · Knowledge Wandered North" },
    { text: "I had not lived enough in the world to know the value of a journal.", translation: "那时我涉世未深，还不懂一本日记的价值。", source: "Henry David Thoreau · Walden" },
    { text: "海内存知己，天涯若比邻。", translation: "A kindred heart makes the farthest horizon feel near.", source: "Wang Bo · Farewell to Vice-Prefect Du" },
  ],
};

const selectedQuoteKey = "world-studio-selected-opening-quote";
const customQuotesKey = "world-studio-custom-opening-quotes";

function readCustomQuotes(locale: Locale): OpeningQuote[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`${customQuotesKey}.${locale}`) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is OpeningQuote => {
      if (!item || typeof item !== "object") return false;
      const quote = item as Partial<OpeningQuote>;
      return typeof quote.text === "string" && Boolean(quote.text.trim())
        && typeof quote.translation === "string"
        && typeof quote.source === "string" && Boolean(quote.source.trim());
    });
  } catch {
    return [];
  }
}

function writeCustomQuotes(locale: Locale, collection: OpeningQuote[]) {
  localStorage.setItem(`${customQuotesKey}.${locale}`, JSON.stringify(collection));
}

export function getOpeningQuotes(locale: Locale) {
  return [...quotes[locale], ...readCustomQuotes(locale)];
}

export function addCustomOpeningQuote(locale: Locale, quote: OpeningQuote) {
  const normalized = {
    text: quote.text.trim(),
    translation: quote.translation.trim(),
    source: quote.source.trim(),
  };
  const custom = [...readCustomQuotes(locale), normalized];
  writeCustomQuotes(locale, custom);
  return quotes[locale].length + custom.length - 1;
}

export function removeCustomOpeningQuote(locale: Locale, index: number) {
  const customIndex = index - quotes[locale].length;
  const custom = readCustomQuotes(locale);
  if (customIndex < 0 || customIndex >= custom.length) return false;
  custom.splice(customIndex, 1);
  writeCustomQuotes(locale, custom);
  return true;
}

export function isCustomOpeningQuote(locale: Locale, index: number) {
  return index >= quotes[locale].length;
}

export function getOpeningLocale(): Locale {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem("world-studio-locale");
  } catch {
    // Storage may be blocked in hardened/private browser contexts.
  }
  if (stored === "zh-CN" || stored === "en-US") return stored;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

export function getDailyOpeningQuote(locale: Locale, date = new Date()) {
  const day = Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86_400_000,
  );
  const collection = getOpeningQuotes(locale);
  return collection[((day % collection.length) + collection.length) % collection.length];
}

export function getSelectedOpeningQuote(locale: Locale) {
  try {
    const stored = Number(localStorage.getItem(`${selectedQuoteKey}.${locale}`));
    const collection = getOpeningQuotes(locale);
    if (Number.isInteger(stored) && stored >= 0 && stored < collection.length) {
      return { quote: collection[stored], index: stored };
    }
  } catch {
    // Preferences remain optional when browser storage is blocked.
  }
  const quote = getDailyOpeningQuote(locale);
  return { quote, index: getOpeningQuotes(locale).indexOf(quote) };
}

export function selectOpeningQuote(locale: Locale, index: number) {
  const collection = getOpeningQuotes(locale);
  const normalized = ((index % collection.length) + collection.length) % collection.length;
  try {
    localStorage.setItem(`${selectedQuoteKey}.${locale}`, String(normalized));
  } catch {
    // The in-memory selection still works for the current render.
  }
  return { quote: collection[normalized], index: normalized };
}
