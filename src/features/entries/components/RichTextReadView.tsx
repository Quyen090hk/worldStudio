import { createElement, useId, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeEntryContent } from "../utils/normalizeEntryContent";
import { useEntryStore } from "../stores/useEntryStore";
import type { Entry } from "../types";
import { useI18n } from "../../../shared/i18n";
import { ImageOff } from "lucide-react";
import { useAssetObjectUrl } from "./useAssetObjectUrl";

const ALLOWED_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
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
  "u",
  "mark",
  "br",
  "a",
  "table",
  "tbody",
  "thead",
  "tr",
  "th",
  "td",
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

function getEntryIdFromHref(href: string) {
  const encodedId = href.slice("/entries/".length).split(/[?#]/u, 1)[0];
  if (!encodedId) return "";
  try {
    return decodeURIComponent(encodedId);
  } catch {
    return encodedId;
  }
}

function InternalEntryLink({
  entry,
  href,
  navigate,
  children,
}: {
  entry?: Entry;
  href: string;
  navigate: (target: string) => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const tooltipId = useId();

  return (
    <span className="group/reference relative inline">
      <a
        href={href}
        className={entry ? "entry-reference" : "entry-reference entry-reference-missing"}
        aria-describedby={tooltipId}
        aria-disabled={!entry || undefined}
        onClick={(event) => {
          event.preventDefault();
          if (entry) navigate(href);
        }}
      >
        {children}
      </a>
      <span
        id={tooltipId}
        role="tooltip"
        className="ws-overlay-surface pointer-events-none absolute bottom-[calc(100%+.55rem)] left-1/2 z-30 hidden w-64 -translate-x-1/2 p-3 text-left no-underline group-hover/reference:block group-focus-within/reference:block"
      >
        {entry ? (
          <>
            <b className="block truncate text-sm text-[var(--text)]">{entry.title}</b>
            <span className="mt-1 block text-[.68rem] font-semibold uppercase tracking-[.12em] text-[var(--accent)]">
              {t(`type.${entry.type}`)}
            </span>
            <span className="mt-2 line-clamp-3 block text-xs leading-5 text-[var(--text-muted)]">
              {entry.summary || t("common.noSummary")}
            </span>
          </>
        ) : (
          <>
            <b className="block text-sm text-red-500">{t("entry.missingReference")}</b>
            <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
              {t("entry.missingReferenceHelp")}
            </span>
          </>
        )}
      </span>
    </span>
  );
}

function ReadAssetImage({ assetId, title, alt }: { assetId: string; title: string; alt: string }) {
  const { t } = useI18n();
  const { url, loaded } = useAssetObjectUrl(assetId);
  return (
    <figure className="asset-image-block">
      {url ? (
        <img src={url} alt={alt || title} />
      ) : (
        <div className="asset-image-placeholder">
          <ImageOff size={24} />
          <span>{loaded ? t("editor.missingImage") : t("common.loading")}</span>
        </div>
      )}
      {title ? <figcaption>{title}</figcaption> : null}
    </figure>
  );
}

function renderNode(
  node: Node,
  key: string,
  navigate: (target: string) => void,
  entriesById: ReadonlyMap<string, Entry>,
): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (!(node instanceof HTMLElement)) return null;

  if (node.matches("figure[data-asset-image]")) {
    return (
      <ReadAssetImage
        key={key}
        assetId={node.getAttribute("data-asset-id") ?? ""}
        title={node.getAttribute("title") ?? node.querySelector("figcaption")?.textContent ?? ""}
        alt={node.getAttribute("alt") ?? ""}
      />
    );
  }

  const children = Array.from(node.childNodes).map((child, index) =>
    renderNode(child, `${key}-${index}`, navigate, entriesById),
  );
  const tag = node.tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tag)) return children;

  const props: Record<string, unknown> = { key };
  if (tag === "blockquote") {
    const callout = node.getAttribute("data-callout");
    if (callout === "note" || callout === "warning") props["data-callout"] = callout;
  }
  if (tag === "ul" && node.getAttribute("data-type") === "taskList") props["data-type"] = "taskList";
  if (tag === "li" && node.getAttribute("data-type") === "taskItem") {
    props["data-type"] = "taskItem";
    props["data-checked"] = node.getAttribute("data-checked") === "true" ? "true" : "false";
  }
  if (tag === "a") {
    const href = safeHref(node.getAttribute("href"));
    if (href?.startsWith("/entries/")) {
      return (
        <InternalEntryLink
          key={key}
          href={href}
          entry={entriesById.get(getEntryIdFromHref(href))}
          navigate={navigate}
        >
          {children}
        </InternalEntryLink>
      );
    } else {
      props.href = href;
      props.target = "_blank";
      props.rel = "noreferrer noopener";
    }
  }
  if (tag === "br" || tag === "hr") {
    return createElement(tag, props);
  }
  return createElement(tag, props, children);
}

function parseContent(
  value: string,
  navigate: (target: string) => void,
  entriesById: ReadonlyMap<string, Entry>,
) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (!trimmed.startsWith("<")) {
    return trimmed
      .split(/\n{2,}/)
      .map((paragraph, index) => <p key={index}>{paragraph}</p>);
  }

  const document = new DOMParser().parseFromString(trimmed, "text/html");
  return Array.from(document.body.childNodes).map((node, index) =>
    renderNode(node, String(index), navigate, entriesById),
  );
}

export function RichTextReadView({ value }: { value: unknown }) {
  const navigate = useNavigate();
  const entries = useEntryStore((state) => state.entries);
  const entriesById = useMemo(
    () => new Map(entries.map((entry) => [entry.id, entry])),
    [entries],
  );
  const normalizedValue = useMemo(() => normalizeEntryContent(value), [value]);
  const content = useMemo(
    () => parseContent(normalizedValue, navigate, entriesById),
    [entriesById, navigate, normalizedValue],
  );
  return <div className="rich-text-content">{content}</div>;
}
