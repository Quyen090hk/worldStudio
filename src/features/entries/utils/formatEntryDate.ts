import type { Locale } from "../../../shared/i18n";

export function formatEntryDate(value: string, locale: Locale = "en-US") {
  return formatEntryDateTime(value, locale);
}

export function formatEntryDateTime(value: string, locale: Locale = "en-US") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return locale === "zh-CN" ? "无效日期" : "Invalid date";
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatEntryRelative(value: string, locale: Locale = "en-US") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return locale === "zh-CN" ? "无效日期" : "Invalid date";
  }

  const diff = Date.now() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return locale === "zh-CN" ? "刚刚" : "Just now";
  if (diff < hour) {
    const count = Math.floor(diff / minute);
    return locale === "zh-CN" ? `${count} 分钟前` : `${count} min ago`;
  }
  if (diff < day) {
    const hours = Math.floor(diff / hour);
    const minutes = Math.floor((diff % hour) / minute);
    return locale === "zh-CN"
      ? `${hours} 小时 ${minutes} 分钟前`
      : `${hours}h ${minutes}m ago`;
  }

  return formatEntryDateTime(value, locale);
}
