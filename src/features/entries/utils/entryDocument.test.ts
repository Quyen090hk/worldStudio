import { describe, expect, it } from "vitest";

import {
  createEntryDocument,
  entryContentToEditorInput,
  entryContentToHtml,
  importedContentToDocument,
  importedValueToDocument,
  measureEntryDocument,
  parseEntryDocument,
  sanitizeEntryDocument,
  structuredClipboardTextToDocument,
} from "./entryDocument";

describe("entry document codec", () => {
  it("round-trips a versioned Tiptap document", () => {
    const stored = createEntryDocument({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Lore" }] }],
    });
    expect(parseEntryDocument(stored)?.format).toBe("tiptap");
    expect(entryContentToHtml(stored)).toBe("<p>Lore</p>");
    expect(entryContentToEditorInput(stored)).toMatchObject({ type: "doc" });
  });

  it("converts headings and paragraphs from imported HTML", () => {
    const stored = importedContentToDocument("<h2>Overview</h2><p>Body</p>");
    expect(entryContentToHtml(stored)).toBe("<h2>Overview</h2><p>Body</p>");
  });

  it("recovers previously escaped block HTML", () => {
    expect(entryContentToHtml("&lt;h2&gt;Overview&lt;/h2&gt;&lt;p&gt;Body&lt;/p&gt;"))
      .toBe("<h2>Overview</h2><p>Body</p>");
  });

  it("preserves safe inline formatting and removes unsafe links", () => {
    const stored = importedContentToDocument(
      '<p><strong>Bold</strong> <em>italic</em> <a href="https://example.com">safe</a> <a href="javascript:alert(1)">unsafe</a></p>',
    );
    expect(entryContentToHtml(stored)).toBe(
      '<p><strong>Bold</strong> <em>italic</em> <a href="https://example.com">safe</a> unsafe</p>',
    );
  });

  it("accepts a native Tiptap JSON document during import", () => {
    const stored = importedValueToDocument({
      type: "doc",
      content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Lore" }] }],
    });
    expect(entryContentToHtml(stored)).toBe("<h2>Lore</h2>");
  });

  it("preserves basic tables and task lists", () => {
    const table = importedContentToDocument("<table><tr><th>Name</th><th>Role</th></tr><tr><td>Yuma</td><td>Mage</td></tr></table>");
    expect(parseEntryDocument(table)?.document.content?.[0].type).toBe("table");
    expect(entryContentToHtml(table)).toContain("<th><p>Name</p></th>");

    const tasks = importedContentToDocument('<ul data-type="taskList"><li data-type="taskItem" data-checked="true">Draft scene</li></ul>');
    expect(parseEntryDocument(tasks)?.document.content?.[0]).toMatchObject({
      type: "taskList",
      content: [{ type: "taskItem", attrs: { checked: true } }],
    });
  });

  it("repairs unknown nodes, unsafe marks, and invalid heading levels", () => {
    const result = sanitizeEntryDocument({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 9 }, content: [{ type: "text", text: "Title", marks: [{ type: "link", attrs: { href: "javascript:x" } }] }] },
        { type: "unknownWidget", content: [{ type: "text", text: "Recovered" }] },
      ],
    });
    expect(result.repaired).toBe(true);
    expect(result.document.content).toEqual([
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Title" }] },
      { type: "paragraph", content: [{ type: "text", text: "Recovered" }] },
    ]);
  });

  it("recognizes structured plain text from the clipboard", () => {
    expect(structuredClipboardTextToDocument("<h2>Lore</h2><p>Body</p>")).toMatchObject({
      type: "doc",
      content: [{ type: "heading", attrs: { level: 2 } }, { type: "paragraph" }],
    });
    expect(structuredClipboardTextToDocument("## Lore\n\nBody")).toMatchObject({
      type: "doc",
      content: [{ type: "heading", attrs: { level: 2 } }, { type: "paragraph" }],
    });
    expect(structuredClipboardTextToDocument("ordinary prose")).toBeNull();
  });

  it("always derives the HTML projection from sanitized JSON", () => {
    const stored = createEntryDocument({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "Safe", marks: [{ type: "link", attrs: { href: "javascript:x" } }] }],
      }],
    });
    expect(parseEntryDocument(stored)?.html).toBe("<p>Safe</p>");
  });

  it("measures document size and nesting before an editor transaction is saved", () => {
    expect(measureEntryDocument({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Lore" }] }],
    })).toEqual({ nodes: 3, text: 4, depth: 2, withinLimits: true });
  });

  it("preserves worldbuilding blocks in the structured document and HTML fallback", () => {
    const stored = createEntryDocument({
      type: "doc",
      content: [{
        type: "worldBlock",
        attrs: { kind: "sensory", label: "地点感官" },
        content: [{ type: "paragraph", content: [{ type: "text", text: "潮声穿过石墙。" }] }],
      }],
    });

    const parsed = parseEntryDocument(stored);
    expect(parsed?.document.content?.[0]).toMatchObject({
      type: "worldBlock",
      attrs: { kind: "sensory", label: "地点感官" },
    });
    expect(parsed?.html).toContain('data-world-block="sensory"');
    expect(parsed?.html).toContain("潮声穿过石墙。");
  });

  it("keeps authoring prompts out of the readable HTML", () => {
    const stored = createEntryDocument({
      type: "doc",
      content: [{
        type: "worldBlock",
        attrs: { kind: "mystery", label: "未解谜团", prompt: "这只应显示在空编辑块中" },
        content: [{ type: "paragraph" }],
      }],
    });

    const parsed = parseEntryDocument(stored);
    expect(parsed?.document.content?.[0].attrs?.prompt).toBe("这只应显示在空编辑块中");
    expect(parsed?.html).not.toContain("这只应显示在空编辑块中");
  });

  it("accepts the extended worldbuilding block catalog and repairs unknown kinds", () => {
    const valid = sanitizeEntryDocument({
      type: "doc",
      content: [{ type: "worldBlock", attrs: { kind: "culture", label: "文化习俗" }, content: [{ type: "paragraph" }] }],
    });
    const repaired = sanitizeEntryDocument({
      type: "doc",
      content: [{ type: "worldBlock", attrs: { kind: "unknown", label: "Unknown" }, content: [{ type: "paragraph" }] }],
    });

    expect(valid.document.content?.[0].attrs?.kind).toBe("culture");
    expect(repaired.document.content?.[0].attrs?.kind).toBe("canon");
  });
});
