import { describe, expect, it } from "vitest";

import {
  createEntryDocument,
  entryContentToEditorInput,
  entryContentToHtml,
  importedContentToDocument,
  importedValueToDocument,
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
});
