import { entryContentToHtml } from "./entryDocument";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function extractDocumentText(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof record.text === "string") parts.push(record.text);
  if (Array.isArray(record.content)) {
    for (const child of record.content) {
      const childText = extractDocumentText(child).join("");
      if (childText) parts.push(childText);
      if (
        child &&
        typeof child === "object" &&
        ["paragraph", "heading", "blockquote", "listItem", "codeBlock"].includes(
          String((child as Record<string, unknown>).type ?? ""),
        )
      ) {
        parts.push("\n");
      }
    }
  }
  return parts;
}

export function normalizeEntryContent(value: unknown): string {
  if (typeof value === "string") return entryContentToHtml(value);
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  if (typeof record.html === "string") return record.html;
  if (record.document) return normalizeEntryContent(record.document);

  const text = extractDocumentText(record).join("").trim();
  if (!text) return "";
  return text
    .split(/\n+/)
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}
