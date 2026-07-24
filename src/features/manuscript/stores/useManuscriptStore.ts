import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { indexedDbStateStorage } from "../../../shared/storage/database";
import type { Manuscript, ManuscriptNode, ManuscriptNodeKind } from "../types";

const EMPTY_MANUSCRIPT_DOCUMENT = JSON.stringify({
  format: "tiptap",
  version: 1,
  document: { type: "doc", content: [{ type: "paragraph" }] },
  html: "<p></p>",
});

type ManuscriptStore = {
  manuscripts: Manuscript[];
  nodes: ManuscriptNode[];
  activeManuscriptByWorld: Record<string, string>;
  activeNodeByManuscript: Record<string, string>;
  createManuscript: (worldId: string, title: string, synopsis?: string) => string;
  updateManuscript: (manuscriptId: string, patch: Partial<Pick<Manuscript, "title" | "synopsis" | "status" | "targetWordCount">>) => void;
  deleteManuscript: (manuscriptId: string) => void;
  setActiveManuscript: (worldId: string, manuscriptId: string) => void;
  createNode: (manuscriptId: string, parentId: string | null, kind: ManuscriptNodeKind, title: string) => string;
  setActiveNode: (manuscriptId: string, nodeId: string) => void;
  updateNode: (nodeId: string, patch: Partial<Pick<ManuscriptNode, "title" | "synopsis" | "content" | "status" | "povEntryId" | "characterEntryIds" | "locationEntryIds" | "timelineItemIds">>) => void;
  moveNode: (nodeId: string, direction: -1 | 1) => void;
  reorderNode: (nodeId: string, targetId: string) => void;
  restoreNodes: (nodes: ManuscriptNode[]) => void;
  deleteNode: (nodeId: string) => void;
};

function id(prefix: string) {
  return `${prefix}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function descendants(nodes: ManuscriptNode[], parentId: string) {
  const ids = new Set([parentId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) { ids.add(node.id); changed = true; }
  }
  return ids;
}

export const useManuscriptStore = create<ManuscriptStore>()(persist((set) => ({
  manuscripts: [],
  nodes: [],
  activeManuscriptByWorld: {},
  activeNodeByManuscript: {},
  createManuscript: (worldId, rawTitle, synopsis = "") => {
    const manuscriptId = id("manuscript");
    const now = new Date().toISOString();
    const manuscript: Manuscript = { id: manuscriptId, worldId, title: rawTitle.trim(), synopsis: synopsis.trim(), status: "planning", targetWordCount: null, createdAt: now, updatedAt: now };
    set((state) => ({ manuscripts: [...state.manuscripts, manuscript], activeManuscriptByWorld: { ...state.activeManuscriptByWorld, [worldId]: manuscriptId } }));
    return manuscriptId;
  },
  updateManuscript: (manuscriptId, patch) => set((state) => ({
    manuscripts: state.manuscripts.map((manuscript) => manuscript.id === manuscriptId ? { ...manuscript, ...patch, title: patch.title ?? manuscript.title, updatedAt: new Date().toISOString() } : manuscript),
  })),
  deleteManuscript: (manuscriptId) => set((state) => {
    const removed = state.manuscripts.find((manuscript) => manuscript.id === manuscriptId);
    if (!removed) return state;
    const manuscripts = state.manuscripts.filter((manuscript) => manuscript.id !== manuscriptId);
    const activeManuscriptByWorld = { ...state.activeManuscriptByWorld };
    for (const [worldId, activeId] of Object.entries(activeManuscriptByWorld)) {
      if (activeId === manuscriptId) activeManuscriptByWorld[worldId] = manuscripts.find((manuscript) => manuscript.worldId === removed.worldId)?.id ?? manuscripts[0]?.id ?? "";
    }
    const activeNodeByManuscript = { ...state.activeNodeByManuscript };
    delete activeNodeByManuscript[manuscriptId];
    return { manuscripts, nodes: state.nodes.filter((node) => node.manuscriptId !== manuscriptId), activeManuscriptByWorld, activeNodeByManuscript };
  }),
  setActiveManuscript: (worldId, manuscriptId) => set((state) => ({ activeManuscriptByWorld: { ...state.activeManuscriptByWorld, [worldId]: manuscriptId } })),
  createNode: (manuscriptId, parentId, kind, rawTitle) => {
    const nodeId = id(kind);
    const now = new Date().toISOString();
    set((state) => {
      const siblings = state.nodes.filter((node) => node.manuscriptId === manuscriptId && node.parentId === parentId);
      const node: ManuscriptNode = { id: nodeId, manuscriptId, parentId, kind, title: rawTitle.trim(), synopsis: "", content: EMPTY_MANUSCRIPT_DOCUMENT, order: siblings.length, status: "idea", povEntryId: null, characterEntryIds: [], locationEntryIds: [], timelineItemIds: [], createdAt: now, updatedAt: now };
      return { nodes: [...state.nodes, node], activeNodeByManuscript: { ...state.activeNodeByManuscript, [manuscriptId]: nodeId }, manuscripts: state.manuscripts.map((item) => item.id === manuscriptId ? { ...item, updatedAt: now } : item) };
    });
    return nodeId;
  },
  setActiveNode: (manuscriptId, nodeId) => set((state) => ({ activeNodeByManuscript: { ...state.activeNodeByManuscript, [manuscriptId]: nodeId } })),
  updateNode: (nodeId, patch) => set((state) => {
    const now = new Date().toISOString();
    const target = state.nodes.find((node) => node.id === nodeId);
    return { nodes: state.nodes.map((node) => node.id === nodeId ? { ...node, ...patch, title: patch.title ?? node.title, updatedAt: now } : node), manuscripts: target ? state.manuscripts.map((item) => item.id === target.manuscriptId ? { ...item, updatedAt: now } : item) : state.manuscripts };
  }),
  moveNode: (nodeId, direction) => set((state) => {
    const node = state.nodes.find((item) => item.id === nodeId);
    if (!node) return state;
    const siblings = state.nodes
      .filter((item) => item.manuscriptId === node.manuscriptId && item.parentId === node.parentId)
      .sort((a, b) => a.order - b.order);
    const index = siblings.findIndex((item) => item.id === nodeId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return state;
    const target = siblings[targetIndex];
    return {
      nodes: state.nodes.map((item) => {
        if (item.id === node.id) return { ...item, order: target.order };
        if (item.id === target.id) return { ...item, order: node.order };
        return item;
      }),
    };
  }),
  reorderNode: (nodeId, targetId) => set((state) => {
    if (nodeId === targetId) return state;
    const node = state.nodes.find((item) => item.id === nodeId);
    const target = state.nodes.find((item) => item.id === targetId);
    if (!node || !target || node.manuscriptId !== target.manuscriptId || node.parentId !== target.parentId) return state;
    const siblings = state.nodes
      .filter((item) => item.manuscriptId === node.manuscriptId && item.parentId === node.parentId)
      .sort((a, b) => a.order - b.order)
      .filter((item) => item.id !== node.id);
    const targetIndex = siblings.findIndex((item) => item.id === target.id);
    siblings.splice(targetIndex, 0, node);
    const orders = new Map(siblings.map((item, index) => [item.id, index]));
    return { nodes: state.nodes.map((item) => orders.has(item.id) ? { ...item, order: orders.get(item.id)! } : item) };
  }),
  restoreNodes: (restoredNodes) => set((state) => {
    const existing = new Set(state.nodes.map((node) => node.id));
    const nodes = [...state.nodes, ...restoredNodes.filter((node) => !existing.has(node.id))];
    const activeNodeByManuscript = { ...state.activeNodeByManuscript };
    const root = restoredNodes.find((node) => !restoredNodes.some((candidate) => candidate.id === node.parentId));
    if (root) activeNodeByManuscript[root.manuscriptId] = root.id;
    return { nodes, activeNodeByManuscript };
  }),
  deleteNode: (nodeId) => set((state) => {
    const removed = descendants(state.nodes, nodeId);
    const nodes = state.nodes.filter((node) => !removed.has(node.id));
    const activeNodeByManuscript = { ...state.activeNodeByManuscript };
    for (const [manuscriptId, activeId] of Object.entries(activeNodeByManuscript)) if (removed.has(activeId)) activeNodeByManuscript[manuscriptId] = nodes.find((node) => node.manuscriptId === manuscriptId)?.id ?? "";
    return { nodes, activeNodeByManuscript };
  }),
}), { name: "world-studio.manuscripts.v1", storage: createJSONStorage(() => indexedDbStateStorage), version: 1 }));
