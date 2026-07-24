import type { Editor } from "@tiptap/core";

import type { WorldBlockKind } from "../WorldbuildingBlock";

const kinds: WorldBlockKind[] = ["canon", "voice", "sensory", "causality", "mystery", "faction", "artifact", "culture"];

export type ActiveWorldBlock = {
  kind: WorldBlockKind;
  pos: number;
  nodeSize: number;
  previousSize: number | null;
  nextSize: number | null;
};

export function findActiveWorldBlock(editor: Editor): ActiveWorldBlock | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== "worldBlock") continue;
    const pos = $from.before(depth);
    const resolved = editor.state.doc.resolve(pos);
    const index = resolved.index(resolved.depth);
    const parent = resolved.parent;
    const rawKind = String(node.attrs.kind);
    return {
      kind: kinds.includes(rawKind as WorldBlockKind) ? rawKind as WorldBlockKind : "canon",
      pos,
      nodeSize: node.nodeSize,
      previousSize: index > 0 ? parent.child(index - 1).nodeSize : null,
      nextSize: index < parent.childCount - 1 ? parent.child(index + 1).nodeSize : null,
    };
  }
  return null;
}

export function duplicateActiveWorldBlock(editor: Editor) {
  const block = findActiveWorldBlock(editor);
  if (!block) return false;
  const node = editor.state.doc.nodeAt(block.pos);
  if (!node) return false;
  const nextPos = block.pos + block.nodeSize;
  editor.commands.insertContentAt(nextPos, node.toJSON());
  return editor.chain().setTextSelection(nextPos + 2).scrollIntoView().focus().run();
}

export function moveActiveWorldBlock(editor: Editor, direction: -1 | 1) {
  const block = findActiveWorldBlock(editor);
  if (!block) return false;
  const siblingSize = direction < 0 ? block.previousSize : block.nextSize;
  const node = editor.state.doc.nodeAt(block.pos);
  if (!node || siblingSize === null) return false;
  const nextPos = direction < 0 ? block.pos - siblingSize : block.pos + siblingSize;
  const transaction = editor.state.tr.delete(block.pos, block.pos + block.nodeSize).insert(nextPos, node);
  editor.view.dispatch(transaction);
  return editor.chain().setTextSelection(nextPos + 2).scrollIntoView().focus().run();
}
