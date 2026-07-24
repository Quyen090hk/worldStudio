import type { Editor } from "@tiptap/react";
import type { WorldBlockKind } from "../WorldbuildingBlock";

export function insertWorldBlock(
  editor: Editor,
  kind: WorldBlockKind,
  label: string,
  prompt: string,
) {
  editor
    .chain()
    .focus()
    .insertContent({
      type: "worldBlock",
      attrs: { kind, label, prompt },
      content: [{ type: "paragraph" }],
    })
    .run();
}
