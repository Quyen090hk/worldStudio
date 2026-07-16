import Blockquote from "@tiptap/extension-blockquote";

export const CalloutBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      callout: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-callout"),
        renderHTML: (attributes) =>
          attributes.callout ? { "data-callout": attributes.callout } : {},
      },
    };
  },
});
