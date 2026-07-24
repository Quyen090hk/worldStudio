import { Node } from "@tiptap/core";

import { duplicateActiveWorldBlock, moveActiveWorldBlock } from "./editor/worldBlockOperations";

export type WorldBlockKind =
  | "canon"
  | "voice"
  | "sensory"
  | "causality"
  | "mystery"
  | "faction"
  | "artifact"
  | "culture";

export const WorldbuildingBlock = Node.create({
  name: "worldBlock",
  group: "block",
  content: "block+",
  defining: true,

  addKeyboardShortcuts() {
    return {
      "Alt-Shift-ArrowUp": () => moveActiveWorldBlock(this.editor, -1),
      "Alt-Shift-ArrowDown": () => moveActiveWorldBlock(this.editor, 1),
      "Alt-Shift-d": () => duplicateActiveWorldBlock(this.editor),
    };
  },

  addAttributes() {
    return {
      kind: {
        default: "canon",
        parseHTML: (element) => element.getAttribute("data-world-block") ?? "canon",
        renderHTML: (attributes) => ({ "data-world-block": attributes.kind }),
      },
      label: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-world-block-label") ?? "",
        renderHTML: (attributes) => attributes.label
          ? { "data-world-block-label": attributes.label }
          : {},
      },
      prompt: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-world-block-prompt") ?? "",
        renderHTML: (attributes) => attributes.prompt
          ? { "data-world-block-prompt": attributes.prompt }
          : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-world-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["section", HTMLAttributes, 0];
  },
});
