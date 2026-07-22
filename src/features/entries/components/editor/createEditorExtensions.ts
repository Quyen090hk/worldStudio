import Link from "@tiptap/extension-link";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";

import { AssetImage } from "../AssetImageExtension";
import { CalloutBlockquote } from "../CalloutBlockquote";
import { ImmersiveFocusExtension } from "../ImmersiveFocusExtension";
import { MissingReferenceExtension } from "../MissingReferenceExtension";
import { SearchHighlightExtension } from "../SearchHighlightExtension";
import { TextHighlight } from "../TextHighlightExtension";

type EditorExtensionOptions = {
  placeholder: string;
  taskCompletedLabel: string;
  taskPendingLabel: string;
};

/**
 * The document schema lives in one stable module so UI refactors cannot
 * accidentally change which nodes an existing entry can load.
 */
export function createEditorExtensions({
  placeholder,
  taskCompletedLabel,
  taskPendingLabel,
}: EditorExtensionOptions) {
  return [
    StarterKit.configure({ blockquote: false, link: false }),
    CalloutBlockquote,
    Placeholder.configure({ placeholder }),
    Link.configure({ openOnClick: false, autolink: true }),
    AssetImage,
    TextHighlight,
    MissingReferenceExtension,
    SearchHighlightExtension,
    ImmersiveFocusExtension,
    TaskList,
    TaskItem.configure({
      nested: true,
      a11y: {
        checkboxLabel: (_node, checked) =>
          checked ? taskCompletedLabel : taskPendingLabel,
      },
    }),
    TableKit.configure({
      table: { resizable: true, lastColumnResizable: false },
    }),
  ];
}
