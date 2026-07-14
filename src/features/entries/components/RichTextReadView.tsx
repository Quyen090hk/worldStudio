import { createElement, useMemo, type ReactNode } from "react";

const ALLOWED_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "hr",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "br",
  "a",
]);

function safeHref(value: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(url.protocol)
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

function renderNode(node: Node, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (!(node instanceof HTMLElement)) return null;

  const children = Array.from(node.childNodes).map((child, index) =>
    renderNode(child, `${key}-${index}`),
  );
  const tag = node.tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) return children;

  const props: Record<string, unknown> = { key };
  if (tag === "a") {
    props.href = safeHref(node.getAttribute("href"));
    props.target = "_blank";
    props.rel = "noreferrer noopener";
  }
  return createElement(tag, props, children);
}

function parseContent(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (!trimmed.startsWith("<")) {
    return trimmed
      .split(/\n{2,}/)
      .map((paragraph, index) => <p key={index}>{paragraph}</p>);
  }

  const document = new DOMParser().parseFromString(trimmed, "text/html");
  return Array.from(document.body.childNodes).map((node, index) =>
    renderNode(node, String(index)),
  );
}

export function RichTextReadView({ value }: { value: string }) {
  const content = useMemo(() => parseContent(value), [value]);
  return <div className="rich-text-content">{content}</div>;
}
