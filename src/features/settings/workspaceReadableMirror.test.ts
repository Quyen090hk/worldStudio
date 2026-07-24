import { describe, expect, it } from "vitest";

import { createEntryDocument } from "../entries/utils/entryDocument";
import { createReadableMirrorFiles, createReadableMirrorManifest, entryToReadableMarkdown, safeMirrorFileName } from "./workspaceReadableMirror";
import type { WorkspaceBackup } from "./workspaceBackup";

describe("workspace readable mirror", () => {
  it("creates Windows-safe stable filenames", () => {
    expect(safeMirrorFileName("North: Gate?", "entry-1")).toBe("North- Gate---entry-1.md");
  });

  it("renders structured entry content as readable Markdown", () => {
    const markdown = entryToReadableMarkdown({
      id: "entry-1", title: "North Gate", type: "Location", summary: "A guarded pass.", tags: ["border"], createdAt: "2026-01-01", updatedAt: "2026-01-02",
      content: createEntryDocument({ type: "doc", content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "History" }] }, { type: "paragraph", content: [{ type: "text", text: "Built in winter." }] }] }),
    });
    expect(markdown).toContain("# North Gate");
    expect(markdown).toContain("## History");
    expect(markdown).toContain("Built in winter.");
  });

  it("records a baseline hash for every generated entry", () => {
    const entry = { id: "entry-1", title: "North Gate", type: "Location" as const, summary: "", tags: [], createdAt: "2026-01-01", updatedAt: "2026-01-02", content: "" };
    const backup = { exportedAt: "2026-01-03", data: { entries: [entry] } } as unknown as WorkspaceBackup;
    const files = createReadableMirrorFiles(backup);
    expect(createReadableMirrorManifest(files, [entry], backup.exportedAt).entries).toMatchObject([{ id: "entry-1", hash: expect.any(String) }]);
  });

  it("writes manuscripts beside entries without adding them to the entry manifest", () => {
    const entry = { id: "entry-1", title: "North Gate", type: "Location" as const, summary: "", tags: [], createdAt: "2026-01-01", updatedAt: "2026-01-02", content: "" };
    const manuscript = { id: "manuscript-1", worldId: "world-1", title: "The Long Road", synopsis: "", status: "drafting" as const, targetWordCount: null, createdAt: "2026-01-01", updatedAt: "2026-01-03" };
    const backup = {
      exportedAt: "2026-01-03",
      data: {
        entries: [entry],
        manuscripts: { items: [manuscript], nodes: [], activeManuscriptByWorld: {}, activeNodeByManuscript: {} },
      },
    } as unknown as WorkspaceBackup;
    const files = createReadableMirrorFiles(backup);
    expect(files.some((file) => file.path === "manuscripts/The Long Road--manuscript-1.md")).toBe(true);
    expect(createReadableMirrorManifest(files, [entry], backup.exportedAt).entries).toHaveLength(1);
  });
});
