import type { Entry } from "../../features/entries/types";

function normalize(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/gi, " ")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function plainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function getEntrySearchExcerpt(entry: Entry, query: string, length = 110) {
  const fallback = entry.summary || plainText(entry.content) || "";
  const body = plainText(entry.content);
  const token = normalize(query).split(" ").find(Boolean);
  if (!token || !body.toLocaleLowerCase().includes(token)) return fallback;
  const index = body.toLocaleLowerCase().indexOf(token);
  const start = Math.max(0, index - Math.floor(length * 0.35));
  const excerpt = body.slice(start, start + length).trim();
  return `${start > 0 ? "…" : ""}${excerpt}${start + length < body.length ? "…" : ""}`;
}

function scoreEntry(entry: Entry, tokens: string[]) {
  const title = normalize(entry.title);
  const summary = normalize(entry.summary);
  const tags = entry.tags.map(normalize);
  const content = normalize(entry.content);
  const properties = (entry.properties ?? [])
    .map((property) => `${property.label} ${Array.isArray(property.value) ? property.value.join(" ") : property.value}`)
    .join(" ");
  const searchable = [title, summary, tags.join(" "), properties, content].join(" ");

  if (!tokens.every((token) => searchable.includes(token))) return null;

  return tokens.reduce((score, token) => {
    if (title === token) return score + 120;
    if (title.startsWith(token)) return score + 80;
    if (title.includes(token)) return score + 50;
    if (tags.some((tag) => tag === token)) return score + 35;
    if (tags.some((tag) => tag.includes(token))) return score + 25;
    if (summary.includes(token)) return score + 15;
    return score + 5;
  }, 0);
}

export function searchEntries(entries: Entry[], query: string, limit = 8) {
  const normalizedQuery = normalize(query);
  const tokens = normalizedQuery.split(" ").filter(Boolean);

  if (!tokens.length) {
    if (query.trim()) return [];
    return [...entries]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit);
  }

  return entries
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter(
      (result): result is { entry: Entry; score: number } =>
        result.score !== null,
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.entry.updatedAt.localeCompare(a.entry.updatedAt) ||
        a.entry.title.localeCompare(b.entry.title),
    )
    .slice(0, limit)
    .map((result) => result.entry);
}
