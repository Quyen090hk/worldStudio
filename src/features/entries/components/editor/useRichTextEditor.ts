import { useEditor, type Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

import { createEntryDocument, entryContentToEditorInput, measureEntryDocument, structuredClipboardTextToDocument, type EntryDocumentNode } from "../../utils/entryDocument";
import { createEditorExtensions } from "./createEditorExtensions";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function normalizeContent(value: string) {
  const document = entryContentToEditorInput(value);
  if (typeof document !== "string") return document;
  const trimmed = document.trim();
  if (!trimmed || trimmed.startsWith("<")) return trimmed;
  return trimmed.split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
}

export function useRichTextEditor({ value, onChange, editable, placeholder, taskCompletedLabel, taskPendingLabel }: { value: string; onChange?: (value: string) => void; editable: boolean; placeholder: string; taskCompletedLabel: string; taskPendingLabel: string }) {
  const [limitBlocked, setLimitBlocked] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const lastAcceptedRef = useRef<EntryDocumentNode | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: createEditorExtensions({ placeholder, taskCompletedLabel, taskPendingLabel }),
    content: normalizeContent(value),
    onCreate({ editor: instance }) { lastAcceptedRef.current = instance.getJSON(); },
    editorProps: {
      attributes: { class: "min-h-[360px] max-w-none outline-none text-base leading-8 text-[var(--text)]" },
      handlePaste(_view, event) {
        const clipboard = event.clipboardData;
        if (!clipboard || clipboard.getData("text/html").trim()) return false;
        const document = structuredClipboardTextToDocument(clipboard.getData("text/plain"));
        const active = editorRef.current;
        if (!document || !active || active.isDestroyed) return false;
        event.preventDefault();
        active.commands.insertContent(document.content ?? []);
        return true;
      },
    },
    onUpdate({ editor: instance }) {
      if (instance.isDestroyed) return;
      const document = instance.getJSON();
      if (!measureEntryDocument(document).withinLimits) {
        setLimitBlocked(true);
        if (lastAcceptedRef.current) instance.commands.setContent(lastAcceptedRef.current, { emitUpdate: false });
        return;
      }
      lastAcceptedRef.current = document;
      setLimitBlocked(false);
      onChange?.(createEntryDocument(document));
    },
  });

  useEffect(() => {
    editorRef.current = editor && !editor.isDestroyed ? editor : null;
    return () => { if (editorRef.current === editor) editorRef.current = null; };
  }, [editor]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || editor.isFocused) return;
    const current = createEntryDocument(editor.getJSON());
    if (value && current !== value) {
      editor.commands.setContent(normalizeContent(value), { emitUpdate: false });
      lastAcceptedRef.current = editor.getJSON();
    } else if (!value && editor.getHTML() !== "<p></p>") {
      editor.commands.clearContent(false);
      lastAcceptedRef.current = editor.getJSON();
    }
  }, [editor, value]);

  return { editor, limitBlocked };
}
