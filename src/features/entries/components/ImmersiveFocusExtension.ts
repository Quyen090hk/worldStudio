import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const ImmersiveFocusExtension = Extension.create({
  name: "immersiveWritingFocus",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("immersiveWritingFocus"),
        props: {
          decorations(state) {
            if (!state.selection.empty) return DecorationSet.empty;
            const activePosition = state.selection.$from.before(1);
            const decorations: Decoration[] = [];
            state.doc.forEach((node, position) => {
              decorations.push(
                Decoration.node(position, position + node.nodeSize, {
                  class:
                    position === activePosition
                      ? "writing-focus-active"
                      : "writing-focus-muted",
                }),
              );
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
