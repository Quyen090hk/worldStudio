import { beforeEach, describe, expect, it } from "vitest";
import { useManuscriptStore } from "./useManuscriptStore";

describe("manuscript store", () => {
  beforeEach(() => useManuscriptStore.setState({ manuscripts: [], nodes: [], activeManuscriptByWorld: {}, activeNodeByManuscript: {} }));
  it("creates an optional volume, chapter, and scene hierarchy", () => {
    const store = useManuscriptStore.getState();
    const manuscriptId = store.createManuscript("world-1", "Novel");
    const volumeId = useManuscriptStore.getState().createNode(manuscriptId, null, "volume", "Volume I");
    const chapterId = useManuscriptStore.getState().createNode(manuscriptId, volumeId, "chapter", "Chapter 1");
    useManuscriptStore.getState().createNode(manuscriptId, chapterId, "scene", "Scene 1");
    expect(useManuscriptStore.getState().nodes.map((node) => node.kind)).toEqual(["volume", "chapter", "scene"]);
  });
  it("deletes a branch with all descendants", () => {
    const manuscriptId = useManuscriptStore.getState().createManuscript("world-1", "Novel");
    const chapterId = useManuscriptStore.getState().createNode(manuscriptId, null, "chapter", "Chapter 1");
    useManuscriptStore.getState().createNode(manuscriptId, chapterId, "scene", "Scene 1");
    useManuscriptStore.getState().deleteNode(chapterId);
    expect(useManuscriptStore.getState().nodes).toHaveLength(0);
  });
  it("moves a node only among siblings", () => {
    const manuscriptId = useManuscriptStore.getState().createManuscript("world-1", "Novel");
    const firstId = useManuscriptStore.getState().createNode(manuscriptId, null, "chapter", "First");
    const secondId = useManuscriptStore.getState().createNode(manuscriptId, null, "chapter", "Second");
    useManuscriptStore.getState().moveNode(secondId, -1);
    const ordered = [...useManuscriptStore.getState().nodes].sort((a, b) => a.order - b.order);
    expect(ordered.map((node) => node.id)).toEqual([secondId, firstId]);
  });
  it("restores a deleted branch", () => {
    const manuscriptId = useManuscriptStore.getState().createManuscript("world-1", "Novel");
    const chapterId = useManuscriptStore.getState().createNode(manuscriptId, null, "chapter", "Chapter");
    useManuscriptStore.getState().createNode(manuscriptId, chapterId, "scene", "Scene");
    const branch = [...useManuscriptStore.getState().nodes];
    useManuscriptStore.getState().deleteNode(chapterId);
    useManuscriptStore.getState().restoreNodes(branch);
    expect(useManuscriptStore.getState().nodes).toHaveLength(2);
    expect(useManuscriptStore.getState().activeNodeByManuscript[manuscriptId]).toBe(chapterId);
  });
  it("reorders a dragged node before a sibling", () => {
    const manuscriptId = useManuscriptStore.getState().createManuscript("world-1", "Novel");
    const firstId = useManuscriptStore.getState().createNode(manuscriptId, null, "chapter", "First");
    const secondId = useManuscriptStore.getState().createNode(manuscriptId, null, "chapter", "Second");
    const thirdId = useManuscriptStore.getState().createNode(manuscriptId, null, "chapter", "Third");
    useManuscriptStore.getState().reorderNode(thirdId, firstId);
    const ordered = [...useManuscriptStore.getState().nodes].sort((a, b) => a.order - b.order);
    expect(ordered.map((node) => node.id)).toEqual([thirdId, firstId, secondId]);
  });
  it("deletes a manuscript and all of its nodes", () => {
    const manuscriptId = useManuscriptStore.getState().createManuscript("world-1", "Novel");
    useManuscriptStore.getState().createNode(manuscriptId, null, "chapter", "Chapter");
    useManuscriptStore.getState().deleteManuscript(manuscriptId);
    expect(useManuscriptStore.getState().manuscripts).toHaveLength(0);
    expect(useManuscriptStore.getState().nodes).toHaveLength(0);
    expect(useManuscriptStore.getState().activeNodeByManuscript[manuscriptId]).toBeUndefined();
  });
  it("renames a manuscript without changing its nodes", () => {
    const manuscriptId = useManuscriptStore.getState().createManuscript("world-1", "Old title");
    const chapterId = useManuscriptStore.getState().createNode(manuscriptId, null, "chapter", "Chapter");
    useManuscriptStore.getState().updateManuscript(manuscriptId, { title: "New title" });
    expect(useManuscriptStore.getState().manuscripts[0].title).toBe("New title");
    expect(useManuscriptStore.getState().nodes[0].id).toBe(chapterId);
  });
});
