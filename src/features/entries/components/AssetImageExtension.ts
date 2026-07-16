import { Node, ReactNodeViewRenderer, mergeAttributes } from "@tiptap/react";
import { AssetImageNodeView } from "./AssetImageNodeView";

export const AssetImage = Node.create({
  name: "assetImage",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      assetId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-asset-id") ?? "",
        renderHTML: (attributes) => ({ "data-asset-id": attributes.assetId }),
      },
      title: { default: "" },
      alt: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "figure[data-asset-image]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const title = String(HTMLAttributes.title ?? "");
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-asset-image": "true" }),
      ...(title ? [["figcaption", {}, title]] : []),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(AssetImageNodeView);
  },
});
