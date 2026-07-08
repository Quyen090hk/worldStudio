import { useEffect, type ReactNode } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  SeparatorHorizontal,
  Undo2,
} from "lucide-react";

type RichTextEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  editable?: boolean;
  placeholder?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeContent(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("<")) {
    return trimmed;
  }

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex h-9 w-9 items-center justify-center rounded-xl border text-[var(--text-muted)] transition",
        active
          ? "border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
          : "border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
        disabled ? "opacity-40" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  editable = true,
  placeholder = "Write your lore notes...",
}: RichTextEditorProps) {
  const editor = useEditor({
    editable,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    content: normalizeContent(value),
    editorProps: {
      attributes: {
        class:
          "min-h-[360px] max-w-none outline-none text-base leading-8 text-[var(--text)]",
      },
    },
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;

    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;

    const nextContent = normalizeContent(value);
    const currentContent = editor.getHTML();

    if (nextContent && currentContent !== nextContent && !editor.isFocused) {
      editor.commands.setContent(nextContent,{ emitUpdate: false });
    }

    if (!nextContent && currentContent !== "<p></p>" && !editor.isFocused) {
      editor.commands.clearContent(false);
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor">
      {editable ? (
        <div className="mb-4 flex flex-wrap items-center gap-1 rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-muted)] p-1.5">
          <ToolbarButton
            title="Heading 1"
            active={editor.isActive("heading", { level: 1 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1 size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title="Heading 2"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title="Bold"
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title="Italic"
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title="Bullet list"
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title="Ordered list"
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title="Quote"
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title="Code block"
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title="Horizontal rule"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <SeparatorHorizontal size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <div className="mx-1 h-6 w-px bg-[var(--border)]" />

          <ToolbarButton
            title="Undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title="Redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={17} strokeWidth={1.75} />
          </ToolbarButton>
        </div>
      ) : null}

      <EditorContent
        editor={editor}
        className={[
          "rounded-[1.5rem] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_72%,transparent)] px-6 py-5",
          editable
            ? "focus-within:border-[color-mix(in_srgb,var(--accent)_45%,transparent)] focus-within:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_10%,transparent)]"
            : "",
        ].join(" ")}
      />
    </div>
  );
}