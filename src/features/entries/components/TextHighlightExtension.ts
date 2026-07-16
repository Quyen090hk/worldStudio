import { Mark, mergeAttributes } from "@tiptap/react";

export const TextHighlight = Mark.create({
  name: "textHighlight",
  parseHTML() {
    return [{ tag: "mark" }, { tag: "span[data-text-highlight]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes(HTMLAttributes, { "data-text-highlight": "true" }), 0];
  },
  addCommands() {
    return {
      toggleTextHighlight:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textHighlight: { toggleTextHighlight: () => ReturnType };
  }
}
