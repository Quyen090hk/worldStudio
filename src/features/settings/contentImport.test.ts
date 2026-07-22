import { describe, expect, it } from "vitest";

import { analyzeImportedContent, ContentImportError, importedTextToHtml, parseContentImport } from "./contentImport";
import { entryContentToHtml, parseEntryDocument } from "../entries/utils/entryDocument";

describe("content import", () => {
  it("parses quoted CSV fields and Chinese type aliases", () => {
    const result = parseContentImport("lore.csv", 'title,type,summary,tags,content\n"临川","地点","河畔城镇","城市,河流","城中有一座旧桥。"');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ title: "临川", type: "Location", tags: ["城市", "河流"] });
    expect(entryContentToHtml(result[0].content)).toContain("旧桥");
    expect(parseEntryDocument(result[0].content)?.version).toBe(1);
  });

  it("splits Markdown at top-level headings and reads metadata", () => {
    const result = parseContentImport("people.md", "# 林默\n类型：角色\n标签：旅人, 主角\n来自北境。\n\n# 白塔\nType: Location\n立于海边。");
    expect(result.map((item) => [item.title, item.type])).toEqual([["林默", "Character"], ["白塔", "Location"]]);
  });

  it("accepts simplified JSON arrays", () => {
    const result = parseContentImport("world.json", JSON.stringify([{ name: "守夜人", category: "组织", text: "守卫边境。" }]));
    expect(result[0]).toMatchObject({ title: "守夜人", type: "Organization" });
  });

  it("keeps native Tiptap JSON content instead of stringifying it", () => {
    const result = parseContentImport("world.json", JSON.stringify([{
      title: "守夜人的誓言",
      type: "event",
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "长夜将至。" }] }],
      },
    }]));
    expect(entryContentToHtml(result[0].content)).toBe("<p>长夜将至。</p>");
  });

  it("escapes untrusted markup before creating editor HTML", () => {
    expect(importedTextToHtml('<img src=x onerror="alert(1)">')).toBe("<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>");
  });

  it("imports supported HTML as document structure instead of visible tags", () => {
    const result = parseContentImport("world.json", JSON.stringify([{
      title: "悠真",
      type: "character",
      content: "<h2>概述</h2><p>来自边境村庄。</p>",
    }]));
    const document = parseEntryDocument(result[0].content);
    expect(document?.document.content?.map((node) => node.type)).toEqual(["heading", "paragraph"]);
    expect(entryContentToHtml(result[0].content)).toBe("<h2>概述</h2><p>来自边境村庄。</p>");
  });

  it("rejects CSV without a title column", () => {
    expect(() => parseContentImport("bad.csv", "type,content\nCharacter,Body")).toThrow(ContentImportError);
  });

  it("reports lossy or unsafe source features before import", () => {
    expect(analyzeImportedContent('<table><tr><td colspan="2">A</td></tr></table><img src="x"><a href="javascript:x">x</a>'))
      .toEqual(["images-omitted", "tables-simplified", "unsafe-links-removed"]);
  });

  it("reports repaired structured documents", () => {
    expect(analyzeImportedContent({ type: "doc", content: [{ type: "unknown", text: "Lore" }] }))
      .toEqual(["document-repaired"]);
  });
});
