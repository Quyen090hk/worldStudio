import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { createPortal } from "react-dom";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Code,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Link2,
  Quote,
  ShieldAlert,
  Redo2,
  Search,
  SeparatorHorizontal,
  Strikethrough,
  Undo2,
  Unlink,
  Underline as UnderlineIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "../../../shared/i18n";
import { EntryReferenceMenu, type ReferenceEntry } from "./EntryReferenceMenu";
import { DocumentOutline } from "./DocumentOutline";
import { AssetImage } from "./AssetImageExtension";
import { useAssetStore } from "../../assets/stores/useAssetStore";
import { CalloutBlockquote } from "./CalloutBlockquote";
import { TextHighlight } from "./TextHighlightExtension";
import { MissingReferenceExtension } from "./MissingReferenceExtension";
import { SearchHighlightExtension } from "./SearchHighlightExtension";
import { ImmersiveFocusExtension } from "./ImmersiveFocusExtension";
import { findDocumentTextMatches, type DocumentTextMatch } from "../utils/documentSearch";

type RichTextEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  editable?: boolean;
  placeholder?: string;
  referenceEntries?: ReferenceEntry[];
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
      aria-label={title}
      aria-pressed={active}
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

type SlashMatch = {
  from: number;
  to: number;
  query: string;
  top: number;
  left: number;
};

function DocumentFindReplace({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
    const update = () => setRevision((value) => value + 1);
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor]);

  const matches = useMemo<DocumentTextMatch[]>(() => {
    void revision;
    return findDocumentTextMatches(editor.state.doc, query);
  }, [editor, query, revision]);

  const selectMatch = useCallback((index: number) => {
    if (!matches.length) return;
    const nextIndex = (index + matches.length) % matches.length;
    const match = matches[nextIndex];
    editor.chain().focus().setTextSelection(match).scrollIntoView().run();
    setActiveIndex(nextIndex);
  }, [editor, matches]);

  const safeActiveIndex = matches.length
    ? Math.min(Math.max(activeIndex, 0), matches.length - 1)
    : 0;

  useEffect(() => {
    editor.commands.setSearchHighlights(matches, activeIndex);
    return () => {
      editor.commands.setSearchHighlights([], -1);
    };
  }, [activeIndex, editor, matches]);

  function replaceCurrent() {
    const match = matches[safeActiveIndex];
    if (!match) return;
    editor.chain().focus().setTextSelection(match).insertContent(replacement).run();
  }

  function replaceAll() {
    if (!matches.length) return;
    const transaction = editor.state.tr;
    [...matches].reverse().forEach((match) => {
      transaction.insertText(replacement, match.from, match.to);
    });
    editor.view.dispatch(transaction);
    editor.commands.focus();
  }

  return (
    <section
      aria-label={t("editor.findInDocument")}
      className="ws-popover-enter mx-auto mb-5 flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 shadow-lg"
    >
      <Search size={16} className="ml-1 shrink-0 text-[var(--text-faint)]" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            selectMatch(
              activeIndex < 0
                ? event.shiftKey ? -1 : 0
                : activeIndex + (event.shiftKey ? -1 : 1),
            );
          } else if (event.key === "Escape") {
            onClose();
          }
        }}
        placeholder={t("editor.findPlaceholder")}
        className="h-9 min-w-40 flex-1 rounded-xl bg-[var(--surface-muted)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
      />
      <span className="min-w-16 text-center text-xs tabular-nums text-[var(--text-faint)]">
        {matches.length
          ? `${activeIndex < 0 ? 0 : safeActiveIndex + 1} / ${matches.length}`
          : t("editor.noMatches")}
      </span>
      <button type="button" onClick={() => selectMatch(activeIndex < 0 ? -1 : activeIndex - 1)} disabled={!matches.length} className="h-9 rounded-xl px-3 text-xs font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-35">
        {t("editor.previousMatch")}
      </button>
      <button type="button" onClick={() => selectMatch(activeIndex + 1)} disabled={!matches.length} className="h-9 rounded-xl px-3 text-xs font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-35">
        {t("editor.nextMatch")}
      </button>
      <input
        value={replacement}
        onChange={(event) => setReplacement(event.target.value)}
        placeholder={t("editor.replacePlaceholder")}
        className="h-9 min-w-40 flex-1 rounded-xl bg-[var(--surface-muted)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
      />
      <button type="button" onClick={replaceCurrent} disabled={!matches.length} className="h-9 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-35">
        {t("editor.replace")}
      </button>
      <button type="button" onClick={replaceAll} disabled={!matches.length} className="h-9 rounded-xl border border-[var(--border)] px-3 text-xs font-semibold hover:bg-[var(--surface-muted)] disabled:opacity-35">
        {t("editor.replaceAll")}
      </button>
      <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-[var(--surface-muted)]" aria-label={t("common.close")}>
        <X size={16} />
      </button>
    </section>
  );
}

type SlashItem = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  run: (editor: Editor) => void;
};

function SlashCommandMenu({ editor }: { editor: Editor }) {
  const { t } = useI18n();
  const [match, setMatch] = useState<SlashMatch | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const items = useMemo<SlashItem[]>(
    () => [
      { id: "paragraph", label: t("editor.commandParagraph"), description: t("editor.commandParagraphHelp"), icon: Pilcrow, run: (instance) => { instance.chain().focus().setParagraph().run(); } },
      { id: "heading1", label: t("editor.heading1"), description: t("editor.commandHeading1Help"), icon: Heading1, run: (instance) => { instance.chain().focus().setHeading({ level: 1 }).run(); } },
      { id: "heading2", label: t("editor.heading2"), description: t("editor.commandHeading2Help"), icon: Heading2, run: (instance) => { instance.chain().focus().setHeading({ level: 2 }).run(); } },
      { id: "heading3", label: t("editor.heading3"), description: t("editor.commandHeading3Help"), icon: Heading3, run: (instance) => { instance.chain().focus().setHeading({ level: 3 }).run(); } },
      { id: "bulletList", label: t("editor.bulletList"), description: t("editor.commandBulletHelp"), icon: List, run: (instance) => { instance.chain().focus().toggleBulletList().run(); } },
      { id: "orderedList", label: t("editor.orderedList"), description: t("editor.commandOrderedHelp"), icon: ListOrdered, run: (instance) => { instance.chain().focus().toggleOrderedList().run(); } },
      { id: "quote", label: t("editor.quote"), description: t("editor.commandQuoteHelp"), icon: Quote, run: (instance) => { instance.chain().focus().toggleBlockquote().run(); } },
      { id: "calloutNote", label: t("editor.calloutNote"), description: t("editor.calloutNoteHelp"), icon: Highlighter, run: (instance) => { instance.chain().focus().setBlockquote().updateAttributes("blockquote", { callout: "note" }).run(); } },
      { id: "calloutWarning", label: t("editor.calloutWarning"), description: t("editor.calloutWarningHelp"), icon: ShieldAlert, run: (instance) => { instance.chain().focus().setBlockquote().updateAttributes("blockquote", { callout: "warning" }).run(); } },
      { id: "codeBlock", label: t("editor.codeBlock"), description: t("editor.commandCodeHelp"), icon: Code, run: (instance) => { instance.chain().focus().toggleCodeBlock().run(); } },
      { id: "horizontalRule", label: t("editor.horizontalRule"), description: t("editor.commandRuleHelp"), icon: SeparatorHorizontal, run: (instance) => { instance.chain().focus().setHorizontalRule().run(); } },
    ],
    [t],
  );
  const filteredItems = useMemo(() => {
    const query = match?.query.trim().toLocaleLowerCase() ?? "";
    if (!query) return items;
    return items.filter((item) =>
      `${item.label} ${item.description}`.toLocaleLowerCase().includes(query),
    );
  }, [items, match?.query]);

  const updateMatch = useCallback(() => {
    const { selection } = editor.state;
    if (!selection.empty || !editor.isFocused) {
      setMatch(null);
      return;
    }
    const { $from } = selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
    const found = textBefore.match(/(?:^|\s)\/([^\s/]*)$/u);
    if (!found) {
      setMatch(null);
      return;
    }
    const slashOffset = found[0].lastIndexOf("/");
    const from = $from.pos - (found[0].length - slashOffset);
    const coords = editor.view.coordsAtPos(from);
    const editorBounds = editor.view.dom.getBoundingClientRect();
    const placeBesideEditor = window.innerWidth - editorBounds.right >= 304;
    setSelectedIndex(0);
    setMatch({
      from,
      to: $from.pos,
      query: found[1] ?? "",
      top: Math.max(
        12,
        Math.min(
          placeBesideEditor ? coords.top - 24 : coords.bottom + 8,
          window.innerHeight - 360,
        ),
      ),
      left: placeBesideEditor
        ? editorBounds.right + 16
        : Math.min(coords.left, window.innerWidth - 304),
    });
  }, [editor]);

  useEffect(() => {
    editor.on("update", updateMatch);
    editor.on("selectionUpdate", updateMatch);
    editor.on("focus", updateMatch);
    editor.on("blur", updateMatch);
    window.addEventListener("resize", updateMatch);
    window.addEventListener("scroll", updateMatch, true);
    return () => {
      editor.off("update", updateMatch);
      editor.off("selectionUpdate", updateMatch);
      editor.off("focus", updateMatch);
      editor.off("blur", updateMatch);
      window.removeEventListener("resize", updateMatch);
      window.removeEventListener("scroll", updateMatch, true);
    };
  }, [editor, updateMatch]);

  const choose = useCallback((item: SlashItem) => {
    if (!match) return;
    editor.chain().focus().deleteRange({ from: match.from, to: match.to }).run();
    item.run(editor);
    setMatch(null);
  }, [editor, match]);

  useEffect(() => {
    if (!match) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((index) => filteredItems.length ? (index + 1) % filteredItems.length : 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((index) => filteredItems.length ? (index - 1 + filteredItems.length) % filteredItems.length : 0);
      } else if (event.key === "Enter" && filteredItems[selectedIndex]) {
        event.preventDefault();
        choose(filteredItems[selectedIndex]);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setMatch(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [choose, filteredItems, match, selectedIndex]);

  if (!match) return null;

  return createPortal(
    <div
      role="listbox"
      aria-label={t("editor.commands")}
      className="ws-popover-enter fixed z-[100] w-72 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-1.5 shadow-2xl"
      style={{ top: match.top, left: Math.max(12, match.left) }}
    >
      <p className="px-3 py-2 text-[.68rem] font-bold uppercase tracking-[.16em] text-[var(--text-faint)]">{t("editor.commands")}</p>
      <div className="max-h-64 overflow-y-auto">
        {filteredItems.length ? filteredItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              onMouseDown={(event) => { event.preventDefault(); choose(item); }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${index === selectedIndex ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-muted)]"}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--accent)]"><Icon size={16} /></span>
              <span className="min-w-0"><b className="block text-sm">{item.label}</b><span className="block truncate text-xs text-[var(--text-faint)]">{item.description}</span></span>
            </button>
          );
        }) : <p className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">{t("editor.noCommands")}</p>}
      </div>
      <p className="border-t border-[var(--border)] px-3 pt-2 text-[.65rem] text-[var(--text-faint)]">{t("editor.commandHint")}</p>
    </div>,
    document.body,
  );
}

export function RichTextEditor({
  value,
  onChange,
  editable = true,
  placeholder = "Write your lore notes...",
  referenceEntries = [],
}: RichTextEditorProps) {
  const { t } = useI18n();
  const [linkEditorOpen, setLinkEditorOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [findOpen, setFindOpen] = useState(false);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const assets = useAssetStore((state) => state.assets);
  const imageAssets = useMemo(
    () => assets.filter((asset) => asset.kind === "image"),
    [assets],
  );
  const resolvedPlaceholder =
    placeholder === "Write your lore notes..." ? t("editor.placeholder") : placeholder;
  const editor = useEditor({
    // React StrictMode mounts, disposes, and mounts the tree again in
    // development. Defer creation until the component is committed so an
    // editor disposed by the probe mount is never read by the next render.
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ blockquote: false, link: false }),
      CalloutBlockquote,
      Placeholder.configure({
        placeholder: resolvedPlaceholder,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      AssetImage,
      TextHighlight,
      MissingReferenceExtension,
      SearchHighlightExtension,
      ImmersiveFocusExtension,
    ],
    content: normalizeContent(value),
    editorProps: {
      attributes: {
        class:
          "min-h-[360px] max-w-none outline-none text-base leading-8 text-[var(--text)]",
      },
    },
    onUpdate({ editor }) {
      if (editor.isDestroyed) return;
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const nextContent = normalizeContent(value);
    const currentContent = editor.getHTML();

    if (nextContent && currentContent !== nextContent && !editor.isFocused) {
      editor.commands.setContent(nextContent,{ emitUpdate: false });
    }

    if (!nextContent && currentContent !== "<p></p>" && !editor.isFocused) {
      editor.commands.clearContent(false);
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !editable) return;
    const openFind = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "f" && editor.isFocused) {
        event.preventDefault();
        setFindOpen(true);
      }
    };
    window.addEventListener("keydown", openFind, true);
    return () => window.removeEventListener("keydown", openFind, true);
  }, [editable, editor]);

  if (!editor || editor.isDestroyed) {
    return (
      <div
        aria-busy="true"
        className="min-h-[72vh] w-full rounded-[1.5rem] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_72%,transparent)]"
      />
    );
  }
  const activeEditor = editor;

  function openLinkEditor() {
    setLinkHref(String(activeEditor.getAttributes("link").href ?? ""));
    setLinkEditorOpen(true);
  }

  function applyLink() {
    const value = linkHref.trim();
    if (!value) {
      activeEditor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkEditorOpen(false);
      return;
    }
    const href = /^(https?:\/\/|mailto:|\/)/i.test(value)
      ? value
      : `https://${value}`;
    activeEditor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkEditorOpen(false);
  }

  const activeBlockType = editor.isActive("heading", { level: 1 })
    ? "heading1"
    : editor.isActive("heading", { level: 2 })
      ? "heading2"
      : editor.isActive("heading", { level: 3 })
        ? "heading3"
        : "paragraph";

  function setBlockType(type: string) {
    const chain = activeEditor.chain().focus();
    if (type === "heading1") chain.setHeading({ level: 1 }).run();
    else if (type === "heading2") chain.setHeading({ level: 2 }).run();
    else if (type === "heading3") chain.setHeading({ level: 3 }).run();
    else chain.setParagraph().run();
  }

  return (
    <div className="rich-text-editor">
      {editable ? <SlashCommandMenu editor={editor} /> : null}
      {editable && referenceEntries.length ? (
        <EntryReferenceMenu editor={editor} entries={referenceEntries} />
      ) : null}
      <BubbleMenu
        editor={editor}
        updateDelay={120}
        options={{ placement: "top", offset: 8 }}
        className="ws-popover-enter flex items-center gap-0.5 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-1 shadow-2xl"
      >
        {linkEditorOpen ? (
          <form
            className="flex items-center gap-1 p-0.5"
            onSubmit={(event) => {
              event.preventDefault();
              applyLink();
            }}
          >
            <Link2 size={15} className="ml-2 shrink-0 text-[var(--text-faint)]" />
            <input
              autoFocus
              value={linkHref}
              onChange={(event) => setLinkHref(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setLinkEditorOpen(false);
                  editor.commands.focus();
                }
              }}
              placeholder={t("editor.linkPlaceholder")}
              aria-label={t("editor.linkAddress")}
              className="h-8 w-56 bg-transparent px-2 text-xs outline-none placeholder:text-[var(--text-faint)]"
            />
            <button type="submit" className="h-8 rounded-lg bg-[var(--accent-soft)] px-3 text-xs font-semibold text-[var(--accent-strong)]">
              {t("common.apply")}
            </button>
          </form>
        ) : (
          <>
            <ToolbarButton
              title={t("editor.bold")}
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold size={16} strokeWidth={1.8} />
            </ToolbarButton>
            <ToolbarButton
              title={t("editor.italic")}
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic size={16} strokeWidth={1.8} />
            </ToolbarButton>
            <ToolbarButton
              title={t("editor.underline")}
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon size={16} strokeWidth={1.8} />
            </ToolbarButton>
            <ToolbarButton
              title={t("editor.highlight")}
              active={editor.isActive("textHighlight")}
              onClick={() => editor.chain().focus().toggleTextHighlight().run()}
            >
              <Highlighter size={16} strokeWidth={1.8} />
            </ToolbarButton>
            <ToolbarButton
              title={t("editor.strike")}
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough size={16} strokeWidth={1.8} />
            </ToolbarButton>
            <ToolbarButton
              title={t("editor.inlineCode")}
              active={editor.isActive("code")}
              onClick={() => editor.chain().focus().toggleCode().run()}
            >
              <Code size={16} strokeWidth={1.8} />
            </ToolbarButton>
            <ToolbarButton
              title={t("editor.editLink")}
              active={editor.isActive("link")}
              onClick={openLinkEditor}
            >
              <Link2 size={16} strokeWidth={1.8} />
            </ToolbarButton>
            {editor.isActive("link") ? (
              <ToolbarButton
                title={t("editor.removeLink")}
                onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
              >
                <Unlink size={16} strokeWidth={1.8} />
              </ToolbarButton>
            ) : null}
          </>
        )}
      </BubbleMenu>

      {editable ? (
        <div className="rich-text-editor-toolbar sticky top-3 z-10 mx-auto mb-6 flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-[1.35rem] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-raised)_88%,transparent)] p-1.5 shadow-md backdrop-blur-xl">
          <label className="relative flex h-9 items-center gap-2 rounded-xl border border-transparent px-2 text-[var(--text-muted)] transition hover:border-[var(--border)] hover:bg-[var(--surface-muted)]">
            <Pilcrow size={16} strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">{t("editor.blockStyle")}</span>
            <select
              value={activeBlockType}
              onChange={(event) => setBlockType(event.target.value)}
              aria-label={t("editor.blockStyle")}
              className="max-w-28 cursor-pointer appearance-none bg-transparent pr-4 text-xs font-semibold text-[var(--text)] outline-none"
            >
              <option value="paragraph">{t("editor.commandParagraph")}</option>
              <option value="heading1">{t("editor.heading1")}</option>
              <option value="heading2">{t("editor.heading2")}</option>
              <option value="heading3">{t("editor.heading3")}</option>
            </select>
            <span className="pointer-events-none absolute right-2 text-[.6rem] text-[var(--text-faint)]" aria-hidden="true">⌄</span>
          </label>

          <div className="mx-1 h-6 w-px bg-[var(--border)]" />

          <ToolbarButton
            title={t("editor.findInDocument")}
            active={findOpen}
            onClick={() => setFindOpen((open) => !open)}
          >
            <Search size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title={t("editor.insertImage")}
            active={assetPickerOpen}
            onClick={() => {
              setAssetPickerOpen((open) => !open);
              setFindOpen(false);
            }}
          >
            <ImageIcon size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <div className="mx-1 h-6 w-px bg-[var(--border)]" />

          <ToolbarButton
            title={t("editor.bold")}
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title={t("editor.italic")}
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title={t("editor.bulletList")}
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title={t("editor.orderedList")}
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title={t("editor.quote")}
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <div className="mx-1 h-6 w-px bg-[var(--border)]" />

          <ToolbarButton
            title={t("editor.undo")}
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 size={17} strokeWidth={1.75} />
          </ToolbarButton>

          <ToolbarButton
            title={t("editor.redo")}
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 size={17} strokeWidth={1.75} />
          </ToolbarButton>
        </div>
      ) : null}

      {editable && findOpen ? (
        <DocumentFindReplace editor={editor} onClose={() => setFindOpen(false)} />
      ) : null}

      {editable && assetPickerOpen ? (
        <section className="ws-popover-enter mx-auto mb-5 w-full max-w-3xl rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-3 shadow-lg">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{t("editor.insertImage")}</p>
              <p className="mt-1 text-xs text-[var(--text-faint)]">{t("editor.insertImageHelp")}</p>
            </div>
            <button type="button" onClick={() => setAssetPickerOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-[var(--surface-muted)]" aria-label={t("common.close")}>
              <X size={16} />
            </button>
          </div>
          {imageAssets.length ? (
            <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              {imageAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().insertContent({
                      type: "assetImage",
                      attrs: { assetId: asset.id, title: asset.name, alt: asset.name },
                    }).run();
                    setAssetPickerOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-solid)] text-[var(--accent)]"><ImageIcon size={18} /></span>
                  <span className="min-w-0"><b className="block truncate text-sm">{asset.name}</b><span className="text-xs text-[var(--text-faint)]">{Math.max(1, Math.round(asset.size / 1024))} KB</span></span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-[var(--border)] p-5 text-center text-sm text-[var(--text-faint)]">{t("editor.noImages")}</p>
          )}
        </section>
      ) : null}

      <div className="rich-text-editor-layout mx-auto grid w-full max-w-6xl gap-6">
        <EditorContent
          editor={editor}
          className={[
            "min-h-[72vh] w-full rounded-[1.5rem] border border-transparent bg-[color-mix(in_srgb,var(--surface-solid)_72%,transparent)] px-5 pb-[28vh] pt-8 sm:px-8 sm:pt-10 lg:px-10",
            editable
              ? "focus-within:bg-[color-mix(in_srgb,var(--surface-solid)_88%,transparent)]"
              : "",
          ].join(" ")}
        />
        <DocumentOutline editor={editor} />
      </div>
    </div>
  );
}
