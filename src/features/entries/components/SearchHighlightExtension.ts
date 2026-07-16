import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

type SearchHighlightMeta = {
  matches: Array<{ from: number; to: number }>;
  activeIndex: number;
};

const searchHighlightKey = new PluginKey<DecorationSet>("documentSearchHighlights");

export const SearchHighlightExtension = Extension.create({
  name: "documentSearchHighlights",
  addCommands() {
    return {
      setSearchHighlights:
        (matches, activeIndex) =>
        ({ state, dispatch }) => {
          dispatch?.(state.tr.setMeta(searchHighlightKey, { matches, activeIndex }));
          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: searchHighlightKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, previous) {
            const value = transaction.getMeta(searchHighlightKey) as
              | SearchHighlightMeta
              | undefined;
            if (!value) return previous.map(transaction.mapping, transaction.doc);
            return DecorationSet.create(
              transaction.doc,
              value.matches.map((match, index) =>
                Decoration.inline(match.from, match.to, {
                  class:
                    index === value.activeIndex
                      ? "document-search-match document-search-match-active"
                      : "document-search-match",
                }),
              ),
            );
          },
        },
        props: {
          decorations(state) {
            return searchHighlightKey.getState(state) ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentSearchHighlights: {
      setSearchHighlights: (
        matches: Array<{ from: number; to: number }>,
        activeIndex: number,
      ) => ReturnType;
    };
  }
}
