import { entryContentToMarkdown } from "../entries/utils/entryDocument";
import type { Manuscript, ManuscriptNode } from "./types";

function orderedChildren(nodes: ManuscriptNode[], parentId: string | null) {
  return nodes.filter((node) => node.parentId === parentId).sort((a, b) => a.order - b.order);
}

export function manuscriptToMarkdown(manuscript: Manuscript, allNodes: ManuscriptNode[]) {
  const nodes = allNodes.filter((node) => node.manuscriptId === manuscript.id);
  const lines = [`# ${manuscript.title}`];
  if (manuscript.synopsis) lines.push("", manuscript.synopsis);
  const append = (node: ManuscriptNode, depth: number) => {
    const level = Math.min(6, depth + 2);
    lines.push("", `${"#".repeat(level)} ${node.title}`);
    if (node.synopsis) lines.push("", `> ${node.synopsis}`);
    if (node.kind !== "volume") {
      const body = entryContentToMarkdown(node.content).trim();
      if (body) lines.push("", body);
    }
    for (const child of orderedChildren(nodes, node.id)) append(child, depth + 1);
  };
  for (const root of orderedChildren(nodes, null)) append(root, 0);
  return `${lines.join("\n").trim()}\n`;
}

export function downloadManuscriptMarkdown(manuscript: Manuscript, nodes: ManuscriptNode[]) {
  const blob = new Blob([manuscriptToMarkdown(manuscript, nodes)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${manuscript.title.replace(/[\\/:*?"<>|]/gu, "-") || "manuscript"}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}
