import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { useEntryStore } from "../stores/useEntryStore";

function entryIdFromHref(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/entries/")) return null;
  const encoded = value.slice("/entries/".length).split(/[?#]/u, 1)[0];
  if (!encoded) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

export const MissingReferenceExtension = Extension.create({
  name: "missingReferenceDecoration",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("missingReferenceDecoration"),
        props: {
          decorations(state) {
            const validIds = new Set(useEntryStore.getState().entries.map((entry) => entry.id));
            const decorations: Decoration[] = [];
            state.doc.descendants((node, position) => {
              if (!node.isText) return;
              const link = node.marks.find((mark) => mark.type.name === "link");
              const entryId = entryIdFromHref(link?.attrs.href);
              if (entryId && !validIds.has(entryId)) {
                decorations.push(
                  Decoration.inline(position, position + node.nodeSize, {
                    class: "entry-reference-missing",
                    "data-missing-reference": "true",
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
