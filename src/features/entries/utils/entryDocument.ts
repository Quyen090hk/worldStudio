export type EntryDocumentNode = {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
  content?: EntryDocumentNode[];
};

export type EntryDocumentEnvelope = {
  format: "tiptap";
  version: 1;
  document: EntryDocumentNode;
  html: string;
};

export const MAX_ENTRY_DOCUMENT_NODES = 20_000;
export const MAX_ENTRY_DOCUMENT_TEXT = 200_000;
export const MAX_ENTRY_DOCUMENT_DEPTH = 32;

export type EntryDocumentMetrics = {
  nodes: number;
  text: number;
  depth: number;
  withinLimits: boolean;
};

const blockNodeTypes = new Set([
  "paragraph", "heading", "blockquote", "bulletList", "orderedList", "taskList",
  "codeBlock", "horizontalRule", "assetImage", "table",
  "worldBlock",
]);
const markTypes = new Set(["bold", "italic", "strike", "code", "underline", "textHighlight", "link"]);
const worldBlockTypes = new Set(["canon", "voice", "sensory", "causality", "mystery", "faction", "artifact", "culture"]);

const allowedBlockPattern = /<(h[1-3]|p|blockquote|pre|ul|ol|table)([^>]*)>([\s\S]*?)<\/\1>/giu;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function decodeEntities(value: string) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

function stripTags(value: string) {
  return decodeEntities(value.replace(/<br\s*\/?>/giu, "\n").replace(/<[^>]+>/gu, ""))
    .replace(/\u00a0/gu, " ")
    .trim();
}

function textContent(text: string): EntryDocumentNode[] | undefined {
  return text ? [{ type: "text", text }] : undefined;
}

function safeHref(value: string) {
  const href = decodeEntities(value).trim();
  return /^(?:https?:\/\/|mailto:|\/|#)/iu.test(href) ? href : null;
}

function inlineContent(value: string): EntryDocumentNode[] | undefined {
  const nodes: EntryDocumentNode[] = [];
  const marks: Array<{ type: string; attrs?: Record<string, unknown> }> = [];
  const tokens = value.match(/<[^>]*>|[^<]+/gu) ?? [];
  const markTypes: Record<string, string> = {
    strong: "bold",
    b: "bold",
    em: "italic",
    i: "italic",
    s: "strike",
    strike: "strike",
    del: "strike",
    code: "code",
  };

  for (const token of tokens) {
    if (!token.startsWith("<")) {
      const text = decodeEntities(token);
      if (text) nodes.push({ type: "text", text, marks: marks.length ? marks.map((mark) => ({ ...mark })) : undefined });
      continue;
    }
    const tagMatch = token.match(/^<\s*(\/?)\s*([a-z0-9]+)([^>]*)>/iu);
    if (!tagMatch) continue;
    const closing = Boolean(tagMatch[1]);
    const tag = tagMatch[2].toLocaleLowerCase();
    if (tag === "br" && !closing) {
      nodes.push({ type: "hardBreak" });
      continue;
    }
    const markType = markTypes[tag];
    if (markType) {
      if (closing) {
        const index = marks.map((mark) => mark.type).lastIndexOf(markType);
        if (index >= 0) marks.splice(index, 1);
      } else marks.push({ type: markType });
      continue;
    }
    if (tag === "a") {
      if (closing) {
        const index = marks.map((mark) => mark.type).lastIndexOf("link");
        if (index >= 0) marks.splice(index, 1);
      } else {
        const hrefMatch = tagMatch[3].match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/iu);
        const href = safeHref(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "");
        if (href) marks.push({ type: "link", attrs: { href, target: null, rel: "noopener noreferrer nofollow", class: null } });
      }
    }
  }
  return nodes.length ? nodes : undefined;
}

function paragraphNode(text: string): EntryDocumentNode {
  return { type: "paragraph", content: textContent(text) };
}

function extractNodeText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as EntryDocumentNode;
  return `${typeof node.text === "string" ? node.text : ""}${(node.content ?? []).map(extractNodeText).join("")}`;
}

export function measureEntryDocument(value: unknown): EntryDocumentMetrics {
  let nodes = 0;
  let text = 0;
  let depth = 0;

  const visit = (item: unknown, currentDepth: number) => {
    if (!item || typeof item !== "object") return;
    const node = item as EntryDocumentNode;
    nodes += 1;
    depth = Math.max(depth, currentDepth);
    if (typeof node.text === "string") text += node.text.length;
    if (node.type === "assetImage") {
      for (const key of ["assetId", "title", "alt"] as const) {
        const attribute = node.attrs?.[key];
        if (typeof attribute === "string") text += attribute.length;
      }
    }
    for (const child of node.content ?? []) visit(child, currentDepth + 1);
  };

  visit(value, 0);
  return {
    nodes,
    text,
    depth,
    withinLimits:
      nodes <= MAX_ENTRY_DOCUMENT_NODES &&
      text <= MAX_ENTRY_DOCUMENT_TEXT &&
      depth <= MAX_ENTRY_DOCUMENT_DEPTH,
  };
}

export function sanitizeEntryDocument(value: unknown) {
  let repaired = false;
  let nodeCount = 0;
  let textCount = 0;

  const cleanText = (value: unknown) => {
    if (typeof value !== "string") { repaired = true; return ""; }
    const remaining = Math.max(0, MAX_ENTRY_DOCUMENT_TEXT - textCount);
    const text = value.slice(0, remaining);
    textCount += text.length;
    if (text.length !== value.length) repaired = true;
    return text;
  };

  const cleanInline = (items: unknown, depth: number): EntryDocumentNode[] | undefined => {
    if (!Array.isArray(items)) return undefined;
    const result = items.map((item) => cleanNode(item, depth, "inline")).filter((item): item is EntryDocumentNode => Boolean(item));
    return result.length ? result : undefined;
  };

  const cleanBlocks = (items: unknown, depth: number, allowed = blockNodeTypes): EntryDocumentNode[] => {
    if (!Array.isArray(items)) { repaired = true; return []; }
    return items.map((item) => cleanNode(item, depth, "block")).filter((item): item is EntryDocumentNode => {
      if (!item || !allowed.has(item.type)) { if (item) repaired = true; return false; }
      return true;
    });
  };

  const cleanNode = (value: unknown, depth: number, context: "root" | "block" | "inline" | "listItem" | "table" | "row"): EntryDocumentNode | null => {
    if (!value || typeof value !== "object" || depth > MAX_ENTRY_DOCUMENT_DEPTH || nodeCount >= MAX_ENTRY_DOCUMENT_NODES) {
      repaired = true;
      return null;
    }
    nodeCount += 1;
    const node = value as EntryDocumentNode;
    if (typeof node.type !== "string") { repaired = true; return null; }

    if (node.type === "text") {
      if (context !== "inline") { repaired = true; return null; }
      const text = cleanText(node.text);
      if (!text) { if (node.text) repaired = true; return null; }
      const marks = Array.isArray(node.marks) ? node.marks.flatMap((mark) => {
        if (!mark || !markTypes.has(mark.type)) { repaired = true; return []; }
        if (mark.type === "link") {
          const href = safeHref(String(mark.attrs?.href ?? ""));
          if (!href) { repaired = true; return []; }
          return [{ type: "link", attrs: { href, target: null, rel: "noopener noreferrer nofollow", class: null } }];
        }
        return [{ type: mark.type }];
      }) : undefined;
      return { type: "text", text, marks: marks?.length ? marks : undefined };
    }
    if (node.type === "hardBreak") return context === "inline" ? { type: "hardBreak" } : null;
    if (node.type === "horizontalRule") return context === "block" ? { type: "horizontalRule" } : null;
    if (node.type === "paragraph") return { type: "paragraph", content: cleanInline(node.content, depth + 1) };
    if (node.type === "heading") {
      const rawLevel = Number(node.attrs?.level ?? 2);
      const level = Math.min(3, Math.max(1, Number.isFinite(rawLevel) ? rawLevel : 2));
      if (level !== rawLevel) repaired = true;
      return { type: "heading", attrs: { level }, content: cleanInline(node.content, depth + 1) };
    }
    if (node.type === "codeBlock") return { type: "codeBlock", attrs: { language: null }, content: cleanInline(node.content, depth + 1)?.filter((item) => item.type === "text") };
    if (node.type === "blockquote") {
      const callout = node.attrs?.callout === "note" || node.attrs?.callout === "warning" ? node.attrs.callout : null;
      const content = cleanBlocks(node.content, depth + 1);
      return { type: "blockquote", attrs: { callout }, content: content.length ? content : [paragraphNode("")] };
    }
    if (node.type === "worldBlock" && context === "block") {
      const kind = worldBlockTypes.has(String(node.attrs?.kind)) ? String(node.attrs?.kind) : "canon";
      const label = cleanText(node.attrs?.label).slice(0, 80);
      const prompt = cleanText(node.attrs?.prompt).slice(0, 240);
      const content = cleanBlocks(node.content, depth + 1);
      return {
        type: "worldBlock",
        attrs: { kind, label, prompt },
        content: content.length ? content : [paragraphNode("")],
      };
    }
    if (node.type === "bulletList" || node.type === "orderedList") {
      const items = Array.isArray(node.content) ? node.content.map((item) => cleanNode(item, depth + 1, "listItem")).filter((item): item is EntryDocumentNode => item?.type === "listItem") : [];
      const rawStart = Number(node.attrs?.start ?? 1);
      const start = Number.isFinite(rawStart) ? Math.max(1, Math.floor(rawStart)) : 1;
      if (node.type === "orderedList" && start !== rawStart) repaired = true;
      return { type: node.type, ...(node.type === "orderedList" ? { attrs: { start } } : {}), content: items.length ? items : [{ type: "listItem", content: [paragraphNode("")] }] };
    }
    if (node.type === "taskList") {
      const items = Array.isArray(node.content) ? node.content.map((item) => cleanNode(item, depth + 1, "listItem")).filter((item): item is EntryDocumentNode => item?.type === "taskItem") : [];
      return { type: "taskList", content: items.length ? items : [{ type: "taskItem", attrs: { checked: false }, content: [paragraphNode("")] }] };
    }
    if (node.type === "listItem" && context === "listItem") {
      const content = cleanBlocks(node.content, depth + 1);
      return { type: "listItem", content: content.length ? content : [paragraphNode("")] };
    }
    if (node.type === "taskItem" && context === "listItem") {
      const content = cleanBlocks(node.content, depth + 1);
      return { type: "taskItem", attrs: { checked: node.attrs?.checked === true }, content: content.length ? content : [paragraphNode("")] };
    }
    if (node.type === "table") {
      const rows = Array.isArray(node.content) ? node.content.map((item) => cleanNode(item, depth + 1, "table")).filter((item): item is EntryDocumentNode => item?.type === "tableRow") : [];
      return rows.length ? { type: "table", content: rows } : paragraphNode(extractNodeText(node));
    }
    if (node.type === "tableRow" && context === "table") {
      const cells = Array.isArray(node.content) ? node.content.map((item) => cleanNode(item, depth + 1, "row")).filter((item): item is EntryDocumentNode => item?.type === "tableCell" || item?.type === "tableHeader") : [];
      return cells.length ? { type: "tableRow", content: cells } : null;
    }
    if ((node.type === "tableCell" || node.type === "tableHeader") && context === "row") {
      const content = cleanBlocks(node.content, depth + 1);
      return { type: node.type, attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: content.length ? content : [paragraphNode("")] };
    }
    if (node.type === "assetImage" && context === "block") {
      const assetId = cleanText(node.attrs?.assetId);
      if (!assetId) { repaired = true; return paragraphNode(""); }
      return { type: "assetImage", attrs: { assetId, title: cleanText(node.attrs?.title), alt: cleanText(node.attrs?.alt) } };
    }
    if (node.type === "doc" && context === "root") {
      const content = cleanBlocks(node.content, depth + 1);
      return { type: "doc", content: content.length ? content : [paragraphNode("")] };
    }

    repaired = true;
    const text = extractNodeText(node).trim();
    return context === "inline" ? (text ? { type: "text", text: cleanText(text) } : null) : paragraphNode(cleanText(text));
  };

  const document = cleanNode(value, 0, "root");
  if (!document || document.type !== "doc") return { document: { type: "doc", content: [paragraphNode("")] }, repaired: true };
  return { document, repaired };
}

function documentToHtml(node: EntryDocumentNode): string {
  const children = () => (node.content ?? []).map(documentToHtml).join("");
  if (node.type === "doc") return children();
  if (node.type === "text") {
    let value = escapeHtml(node.text ?? "");
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") value = `<strong>${value}</strong>`;
      else if (mark.type === "italic") value = `<em>${value}</em>`;
      else if (mark.type === "strike") value = `<s>${value}</s>`;
      else if (mark.type === "code") value = `<code>${value}</code>`;
      else if (mark.type === "underline") value = `<u>${value}</u>`;
      else if (mark.type === "textHighlight") value = `<mark>${value}</mark>`;
      else if (mark.type === "link") {
        const href = safeHref(String(mark.attrs?.href ?? ""));
        if (href) value = `<a href="${escapeHtml(href)}">${value}</a>`;
      }
    }
    return value;
  }
  if (node.type === "hardBreak") return "<br>";
  if (node.type === "horizontalRule") return "<hr>";
  if (node.type === "heading") {
    const level = Math.min(3, Math.max(1, Number(node.attrs?.level ?? 2)));
    return `<h${level}>${children()}</h${level}>`;
  }
  if (node.type === "blockquote") {
    const callout = node.attrs?.callout === "note" || node.attrs?.callout === "warning" ? ` data-callout="${node.attrs.callout}"` : "";
    return `<blockquote${callout}>${children()}</blockquote>`;
  }
  if (node.type === "worldBlock") {
    const kind = worldBlockTypes.has(String(node.attrs?.kind)) ? String(node.attrs?.kind) : "canon";
    const label = escapeHtml(String(node.attrs?.label ?? ""));
    return `<section data-world-block="${kind}"${label ? ` data-world-block-label="${label}"` : ""}>${children()}</section>`;
  }
  if (node.type === "bulletList") return `<ul>${children()}</ul>`;
  if (node.type === "orderedList") return `<ol>${children()}</ol>`;
  if (node.type === "listItem") return `<li>${children()}</li>`;
  if (node.type === "taskList") return `<ul data-type="taskList">${children()}</ul>`;
  if (node.type === "taskItem") return `<li data-type="taskItem" data-checked="${node.attrs?.checked === true}">${children()}</li>`;
  if (node.type === "table") return `<table><tbody>${children()}</tbody></table>`;
  if (node.type === "tableRow") return `<tr>${children()}</tr>`;
  if (node.type === "tableHeader") return `<th>${children()}</th>`;
  if (node.type === "tableCell") return `<td>${children()}</td>`;
  if (node.type === "codeBlock") return `<pre><code>${children()}</code></pre>`;
  if (node.type === "assetImage") {
    const assetId = escapeHtml(String(node.attrs?.assetId ?? ""));
    const title = escapeHtml(String(node.attrs?.title ?? ""));
    const alt = escapeHtml(String(node.attrs?.alt ?? ""));
    return `<figure data-asset-image data-asset-id="${assetId}" title="${title}" alt="${alt}"></figure>`;
  }
  return `<p>${children()}</p>`;
}

function plainTextToDocument(value: string): EntryDocumentNode {
  const content = value
    .replace(/\r\n?/gu, "\n")
    .split(/\n{2,}/gu)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(paragraphNode);
  return { type: "doc", content: content.length ? content : [paragraphNode("")] };
}

function markdownToDocument(value: string): EntryDocumentNode {
  const nodes: EntryDocumentNode[] = [];
  const appendListItem = (type: "bulletList" | "orderedList", text: string) => {
    const last = nodes.at(-1);
    const item = { type: "listItem", content: [paragraphNode(text)] };
    if (last?.type === type) last.content = [...(last.content ?? []), item];
    else nodes.push({ type, content: [item] });
  };
  for (const rawLine of value.replace(/\r\n?/gu, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = line.match(/^(#{1,3})\s+(.+)$/u);
    if (heading) {
      nodes.push({ type: "heading", attrs: { level: heading[1].length }, content: textContent(heading[2]) });
      continue;
    }
    const quote = line.match(/^>\s?(.+)$/u);
    if (quote) {
      nodes.push({ type: "blockquote", content: [paragraphNode(quote[1])] });
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/u);
    if (bullet) {
      appendListItem("bulletList", bullet[1]);
      continue;
    }
    const ordered = line.match(/^\d+[.)]\s+(.+)$/u);
    if (ordered) {
      appendListItem("orderedList", ordered[1]);
      continue;
    }
    nodes.push(paragraphNode(line));
  }
  return { type: "doc", content: nodes.length ? nodes : [paragraphNode("")] };
}

function htmlToDocument(value: string): EntryDocumentNode {
  const nodes: EntryDocumentNode[] = [];
  for (const match of value.matchAll(allowedBlockPattern)) {
    const tag = match[1].toLocaleLowerCase();
    const attributes = match[2];
    const body = match[3];
    if (tag === "table") {
      const rows = [...body.matchAll(/<tr(?:\s[^>]*)?>([\s\S]*?)<\/tr>/giu)].map((row) => {
        const cells = [...row[1].matchAll(/<(th|td)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/giu)].map((cell) => ({
          type: cell[1].toLocaleLowerCase() === "th" ? "tableHeader" : "tableCell",
          attrs: { colspan: 1, rowspan: 1, colwidth: null },
          content: [{ type: "paragraph", content: inlineContent(cell[2]) }],
        }));
        return { type: "tableRow", content: cells };
      }).filter((row) => row.content.length);
      if (rows.length) nodes.push({ type: "table", content: rows });
      continue;
    }
    if (tag === "ul" || tag === "ol") {
      const taskList = tag === "ul" && /data-type\s*=\s*["']taskList["']/iu.test(attributes);
      const items = [...body.matchAll(/<li([^>]*)>([\s\S]*?)<\/li>/giu)]
        .filter((item) => stripTags(item[2]))
        .map((item) => ({
          type: taskList ? "taskItem" : "listItem",
          attrs: taskList ? { checked: /data-checked\s*=\s*["']true["']/iu.test(item[1]) } : undefined,
          content: [{ type: "paragraph", content: inlineContent(item[2]) }],
        }));
      if (items.length) nodes.push({ type: taskList ? "taskList" : tag === "ul" ? "bulletList" : "orderedList", content: items });
      continue;
    }
    const text = stripTags(body);
    if (!text) continue;
    if (/^h[1-3]$/u.test(tag)) nodes.push({ type: "heading", attrs: { level: Number(tag[1]) }, content: inlineContent(body) });
    else if (tag === "blockquote") nodes.push({ type: "blockquote", content: [{ type: "paragraph", content: inlineContent(body) }] });
    else if (tag === "pre") nodes.push({ type: "codeBlock", content: textContent(text) });
    else nodes.push({ type: "paragraph", content: inlineContent(body) });
  }
  return nodes.length ? { type: "doc", content: nodes } : plainTextToDocument(stripTags(value));
}

export function createEntryDocument(document: EntryDocumentNode) {
  const sanitized = sanitizeEntryDocument(document).document;
  const envelope: EntryDocumentEnvelope = {
    format: "tiptap",
    version: 1,
    document: sanitized,
    html: documentToHtml(sanitized),
  };
  return JSON.stringify(envelope);
}

export function parseEntryDocument(value: unknown): EntryDocumentEnvelope | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as Partial<EntryDocumentEnvelope>;
    if (parsed.format !== "tiptap" || parsed.version !== 1 || !parsed.document || parsed.document.type !== "doc") return null;
    const sanitized = sanitizeEntryDocument(parsed.document).document;
    return {
      format: "tiptap",
      version: 1,
      document: sanitized,
      html: documentToHtml(sanitized),
    };
  } catch {
    return null;
  }
}

export function entryContentToHtml(value: unknown): string {
  const envelope = parseEntryDocument(value);
  if (envelope) return envelope.html;
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (/^&lt;(?:h[1-6]|p|blockquote|ul|ol|pre)[\s&]/iu.test(trimmed)) return decodeEntities(trimmed);
  return trimmed;
}

export function entryContentToEditorInput(value: string): string | EntryDocumentNode {
  return parseEntryDocument(value)?.document ?? entryContentToHtml(value);
}

function inlineNodeToMarkdown(node: EntryDocumentNode): string {
  if (node.type === "hardBreak") return "  \n";
  if (node.type !== "text") return (node.content ?? []).map(inlineNodeToMarkdown).join("");
  let value = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") value = `**${value}**`;
    else if (mark.type === "italic") value = `*${value}*`;
    else if (mark.type === "strike") value = `~~${value}~~`;
    else if (mark.type === "code") value = `\`${value.replaceAll("`", "\\`")}\``;
    else if (mark.type === "link") {
      const href = safeHref(String(mark.attrs?.href ?? ""));
      if (href) value = `[${value}](${href})`;
    }
  }
  return value;
}

function nodeToMarkdown(node: EntryDocumentNode, depth = 0): string {
  const inline = () => (node.content ?? []).map(inlineNodeToMarkdown).join("");
  const blocks = () => (node.content ?? []).map((child) => nodeToMarkdown(child, depth)).filter(Boolean).join("\n\n");
  if (node.type === "doc") return blocks();
  if (node.type === "paragraph") return inline();
  if (node.type === "heading") return `${"#".repeat(Math.min(3, Math.max(1, Number(node.attrs?.level ?? 2))))} ${inline()}`;
  if (node.type === "horizontalRule") return "---";
  if (node.type === "codeBlock") return `\`\`\`\n${inline()}\n\`\`\``;
  if (node.type === "blockquote") return blocks().split("\n").map((line) => `> ${line}`).join("\n");
  if (node.type === "worldBlock") {
    const label = String(node.attrs?.label ?? node.attrs?.kind ?? "World note");
    return `> **${label}**\n>\n${blocks().split("\n").map((line) => `> ${line}`).join("\n")}`;
  }
  if (node.type === "bulletList" || node.type === "orderedList" || node.type === "taskList") {
    return (node.content ?? []).map((child, index) => {
      const body = (child.content ?? []).map((item) => nodeToMarkdown(item, depth + 1)).join("\n");
      const marker = node.type === "orderedList" ? `${index + Number(node.attrs?.start ?? 1)}.` : node.type === "taskList" ? `- [${child.attrs?.checked === true ? "x" : " "}]` : "-";
      return `${"  ".repeat(depth)}${marker} ${body.replaceAll("\n", `\n${"  ".repeat(depth + 1)}`)}`;
    }).join("\n");
  }
  if (node.type === "table") {
    return (node.content ?? []).map((row) => `| ${(row.content ?? []).map((cell) => (cell.content ?? []).map((item) => nodeToMarkdown(item)).join(" ").replaceAll("|", "\\|")).join(" | ")} |`).join("\n");
  }
  if (node.type === "assetImage") return `![${String(node.attrs?.alt ?? "")}](${`world-studio-asset://${String(node.attrs?.assetId ?? "")}`})`;
  return blocks() || inline();
}

/** Creates a portable, human-readable mirror. The structured JSON remains the lossless source. */
export function entryContentToMarkdown(value: unknown) {
  const document = parseEntryDocument(value)?.document;
  if (!document) return stripTags(entryContentToHtml(value));
  return `${nodeToMarkdown(document).trim()}\n`;
}

export function importedContentToDocument(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return createEntryDocument({ type: "doc", content: [paragraphNode("")] });
  if (parseEntryDocument(trimmed)) return trimmed;
  const decoded = decodeEntities(trimmed);
  const document = /^<(?:h[1-6]|p|blockquote|ul|ol|pre|table)\b/iu.test(decoded)
    ? htmlToDocument(decoded)
    : /^(?:#{1,3}\s|>\s?|[-*]\s|\d+[.)]\s)/mu.test(trimmed)
      ? markdownToDocument(trimmed)
      : plainTextToDocument(trimmed);
  return createEntryDocument(document);
}

export function structuredClipboardTextToDocument(value: string): EntryDocumentNode | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const decoded = decodeEntities(trimmed);
  const looksLikeHtml = /^<(?:h[1-6]|p|blockquote|ul|ol|pre|table)\b/iu.test(decoded);
  const looksLikeMarkdown = /^(?:#{1,3}\s|>\s?|[-*]\s|\d+[.)]\s|```)/mu.test(trimmed);
  if (!looksLikeHtml && !looksLikeMarkdown) return null;

  return parseEntryDocument(importedContentToDocument(trimmed))?.document ?? null;
}

export function importedValueToDocument(value: unknown) {
  if (typeof value === "string") return importedContentToDocument(value);
  if (!value || typeof value !== "object") return importedContentToDocument("");
  const record = value as Record<string, unknown>;
  if (record.format === "tiptap" && record.version === 1 && record.document) {
    return createEntryDocument(record.document as EntryDocumentNode);
  }
  if (record.type === "doc") return createEntryDocument(record as EntryDocumentNode);
  if (record.document && typeof record.document === "object") {
    return createEntryDocument(record.document as EntryDocumentNode);
  }
  return importedContentToDocument(String(record.text ?? record.html ?? ""));
}
