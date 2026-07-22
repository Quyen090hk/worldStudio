import type { EntryInput, EntryType } from "../entries/types";
import { importedValueToDocument, sanitizeEntryDocument } from "../entries/utils/entryDocument";

export const MAX_CONTENT_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_CONTENT_IMPORT_ENTRIES = 500;

export type ContentImportDraft = EntryInput & {
  key: string;
  sourceName: string;
  warnings: ContentImportWarning[];
};

export type ContentImportWarning =
  | "images-omitted"
  | "tables-simplified"
  | "unsafe-links-removed"
  | "styles-removed"
  | "deep-headings-simplified"
  | "document-repaired";

export class ContentImportError extends Error {
  code: "empty" | "invalid-json" | "invalid-csv" | "too-many-entries";

  constructor(code: "empty" | "invalid-json" | "invalid-csv" | "too-many-entries") {
    super(code);
    this.code = code;
  }
}

const typeAliases: Record<string, EntryType> = {
  character: "Character", person: "Character", people: "Character", role: "Character", 角色: "Character", 人物: "Character",
  location: "Location", place: "Location", region: "Location", 地点: "Location", 地区: "Location", 区域: "Location",
  organization: "Organization", organisation: "Organization", faction: "Organization", group: "Organization", 组织: "Organization", 势力: "Organization",
  item: "Item", object: "Item", artifact: "Item", relic: "Item", 物品: "Item", 物件: "Item", 遗物: "Item",
  event: "Event", history: "Event", moment: "Event", 事件: "Event", 历史: "Event",
};

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function normalizeImportedType(value: unknown): EntryType {
  if (typeof value !== "string") return "Character";
  return typeAliases[value.trim().toLocaleLowerCase()] ?? "Character";
}

function normalizeTags(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,，;；]/) : [];
  return Array.from(new Set(values.map((tag) => String(tag).trim().replace(/^#+/, "")).filter(Boolean))).slice(0, 24);
}

/** Converts untrusted plain text/Markdown into the small safe HTML subset used by the editor. */
export function importedTextToHtml(value: string) {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  return lines.map((line) => {
    const text = line.trim();
    if (!text) return "<p></p>";
    if (/^###\s+/.test(text)) return `<h3>${escapeHtml(text.replace(/^###\s+/, ""))}</h3>`;
    if (/^##\s+/.test(text)) return `<h2>${escapeHtml(text.replace(/^##\s+/, ""))}</h2>`;
    if (/^#\s+/.test(text)) return `<h1>${escapeHtml(text.replace(/^#\s+/, ""))}</h1>`;
    if (/^>\s?/.test(text)) return `<blockquote>${escapeHtml(text.replace(/^>\s?/, ""))}</blockquote>`;
    if (/^[-*]\s+/.test(text)) return `<ul><li>${escapeHtml(text.replace(/^[-*]\s+/, ""))}</li></ul>`;
    if (/^\d+[.)]\s+/.test(text)) return `<ol><li>${escapeHtml(text.replace(/^\d+[.)]\s+/, ""))}</li></ol>`;
    return `<p>${escapeHtml(text)}</p>`;
  }).join("");
}

function plainSummary(value: string) {
  return value.replace(/^#{1,6}\s+/gm, "").replace(/[*_`>-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 240);
}

export function analyzeImportedContent(value: unknown): ContentImportWarning[] {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const document = record.type === "doc" ? record : record.document;
    return document && sanitizeEntryDocument(document).repaired ? ["document-repaired"] : [];
  }
  if (typeof value !== "string") return [];
  const warnings = new Set<ContentImportWarning>();
  if (/<img\b/iu.test(value) || /!\[[^\]]*\]\([^)]+\)/u.test(value)) warnings.add("images-omitted");
  if (/<(?:td|th)\b[^>]*(?:rowspan|colspan|style)\s*=/iu.test(value) || /^\s*\|.+\|\s*$/mu.test(value)) warnings.add("tables-simplified");
  if (/href\s*=\s*["']?\s*(?:javascript|data):/iu.test(value)) warnings.add("unsafe-links-removed");
  if (/\s(?:style|class|id)\s*=/iu.test(value) || /<(?:font|span)\b/iu.test(value)) warnings.add("styles-removed");
  if (/<h[4-6]\b/iu.test(value) || /^#{4,6}\s+/mu.test(value)) warnings.add("deep-headings-simplified");
  return [...warnings];
}

function draft(sourceName: string, index: number, value: Record<string, unknown>): ContentImportDraft | null {
  const title = String(value.title ?? value.name ?? "").trim().slice(0, 120);
  if (!title) return null;
  const sourceContent = value.content ?? value.body ?? value.text ?? "";
  const rawContent = typeof sourceContent === "string"
    ? sourceContent.trim().slice(0, 200_000)
    : "";
  return {
    key: `${sourceName}:${index}`,
    sourceName,
    title,
    type: normalizeImportedType(value.type ?? value.category),
    summary: String(value.summary ?? value.description ?? plainSummary(rawContent)).trim().slice(0, 500),
    content: importedValueToDocument(sourceContent),
    tags: normalizeTags(value.tags),
    warnings: analyzeImportedContent(sourceContent),
  };
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (quoted) throw new ContentImportError("invalid-csv");
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((item) => item.some((value) => value.trim()));
}

function parseCsv(sourceName: string, text: string) {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  const headers = rows.shift()?.map((header) => header.trim().toLocaleLowerCase()) ?? [];
  if (!headers.includes("title") && !headers.includes("name")) throw new ContentImportError("invalid-csv");
  return rows.map((row, index) => draft(sourceName, index, Object.fromEntries(headers.map((header, column) => [header, row[column] ?? ""])))).filter((item): item is ContentImportDraft => item !== null);
}

function parseJson(sourceName: string, text: string) {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new ContentImportError("invalid-json"); }
  const records = Array.isArray(value) ? value : value && typeof value === "object" && Array.isArray((value as { entries?: unknown }).entries) ? (value as { entries: unknown[] }).entries : [value];
  return records.map((item, index) => item && typeof item === "object" ? draft(sourceName, index, item as Record<string, unknown>) : null).filter((item): item is ContentImportDraft => item !== null);
}

function metadata(body: string) {
  const result: Record<string, unknown> = {};
  const content: string[] = [];
  for (const line of body.split("\n")) {
    const match = line.match(/^\s*(type|类型|summary|摘要|tags|标签)\s*[:：]\s*(.+)$/i);
    if (!match) { content.push(line); continue; }
    const key = match[1].toLocaleLowerCase();
    if (key === "type" || key === "类型") result.type = match[2];
    else if (key === "summary" || key === "摘要") result.summary = match[2];
    else result.tags = match[2];
  }
  result.content = content.join("\n").trim();
  return result;
}

function parseMarkdown(sourceName: string, text: string) {
  const matches = [...text.matchAll(/^#\s+(.+)$/gm)];
  if (!matches.length) return parsePlainText(sourceName, text);
  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    return draft(sourceName, index, { title: match[1], ...metadata(text.slice(start, end)) });
  }).filter((item): item is ContentImportDraft => item !== null);
}

function parsePlainText(sourceName: string, text: string) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const titleIndex = lines.findIndex((line) => line.trim());
  if (titleIndex < 0) return [];
  return [draft(sourceName, 0, { title: lines[titleIndex].replace(/^#+\s*/, ""), content: lines.slice(titleIndex + 1).join("\n").trim() })].filter((item): item is ContentImportDraft => item !== null);
}

export function parseContentImport(sourceName: string, text: string) {
  const extension = sourceName.split(".").pop()?.toLocaleLowerCase();
  let drafts: ContentImportDraft[];
  if (extension === "csv") drafts = parseCsv(sourceName, text);
  else if (extension === "json") drafts = parseJson(sourceName, text);
  else if (extension === "md" || extension === "markdown") drafts = parseMarkdown(sourceName, text);
  else drafts = parsePlainText(sourceName, text);
  if (!drafts.length) throw new ContentImportError("empty");
  if (drafts.length > MAX_CONTENT_IMPORT_ENTRIES) throw new ContentImportError("too-many-entries");
  return drafts;
}
