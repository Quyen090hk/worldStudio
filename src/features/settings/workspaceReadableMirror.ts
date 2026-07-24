import type { Entry, EntryType } from "../entries/types";
import { entryContentToMarkdown } from "../entries/utils/entryDocument";
import { manuscriptToMarkdown } from "../manuscript/manuscriptExport";
import type { WorkspaceBackup } from "./workspaceBackup";
import { contentHash } from "./workspaceSyncDiff";

const folders: Record<EntryType, string> = {
  Character: "characters",
  Location: "locations",
  Organization: "organizations",
  Item: "items",
  Event: "events",
};

function quoted(value: string) {
  return JSON.stringify(value);
}

export function safeMirrorFileName(title: string, id: string) {
  const slug = title
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*]/gu, "-")
    .split("")
    .map((character) => character.charCodeAt(0) < 32 ? "-" : character)
    .join("")
    .replace(/[. ]+$/gu, "")
    .trim()
    .slice(0, 80) || "untitled";
  return `${slug}--${id}.md`;
}

export function entryToReadableMarkdown(entry: Entry) {
  const properties = (entry.properties ?? []).filter((property) => Array.isArray(property.value) ? property.value.length : property.value.trim());
  const frontmatter = [
    "---",
    `id: ${quoted(entry.id)}`,
    `type: ${quoted(entry.type)}`,
    `createdAt: ${quoted(entry.createdAt)}`,
    `updatedAt: ${quoted(entry.updatedAt)}`,
    `tags: ${JSON.stringify(entry.tags)}`,
    "---",
  ].join("\n");
  const propertySection = properties.length
    ? `\n\n## Properties\n\n${properties.map((property) => `- **${property.label}:** ${Array.isArray(property.value) ? property.value.join(", ") : property.value}`).join("\n")}`
    : "";
  return `${frontmatter}\n\n# ${entry.title}\n\n${entry.summary ? `> ${entry.summary}\n\n` : ""}${entryContentToMarkdown(entry.content).trim()}${propertySection}\n`;
}

export type ReadableMirrorFile = { path: string; content: string };

export function createReadableMirrorManifest(files: ReadableMirrorFile[], entries: Entry[], generatedAt: string) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return {
    version: 2,
    generatedAt,
    paths: files.map((file) => file.path),
    entries: files
      .filter((file) => file.path.startsWith("entries/") && file.path.endsWith(".md"))
      .map((file) => {
        const id = file.path.match(/--(.+)\.md$/u)?.[1] ?? "";
        return { id, path: file.path, hash: contentHash(file.content), updatedAt: byId.get(id)?.updatedAt ?? null };
      })
      .filter((item) => item.id),
  };
}

export function createReadableMirrorFiles(backup: WorkspaceBackup): ReadableMirrorFile[] {
  const manuscripts = backup.data.manuscripts ?? {
    items: [],
    nodes: [],
    activeManuscriptByWorld: {},
    activeNodeByManuscript: {},
  };
  const entryFiles = backup.data.entries.map((entry) => ({
    path: `entries/${folders[entry.type]}/${safeMirrorFileName(entry.title, entry.id)}`,
    content: entryToReadableMarkdown(entry),
  }));
  const manuscriptFiles = manuscripts.items.map((manuscript) => ({
    path: `manuscripts/${safeMirrorFileName(manuscript.title, manuscript.id)}`,
    content: manuscriptToMarkdown(manuscript, manuscripts.nodes),
  }));
  return [
    ...entryFiles,
    ...manuscriptFiles,
    {
      path: "entries/index.json",
      content: JSON.stringify({
        generatedAt: backup.exportedAt,
        entries: backup.data.entries.map((entry) => ({ id: entry.id, title: entry.title, type: entry.type, path: `entries/${folders[entry.type]}/${safeMirrorFileName(entry.title, entry.id)}` })),
      }, null, 2),
    },
    {
      path: "manuscripts/index.json",
      content: JSON.stringify({
        generatedAt: backup.exportedAt,
        manuscripts: manuscripts.items.map((manuscript) => ({
          id: manuscript.id,
          title: manuscript.title,
          path: `manuscripts/${safeMirrorFileName(manuscript.title, manuscript.id)}`,
        })),
      }, null, 2),
    },
  ];
}
