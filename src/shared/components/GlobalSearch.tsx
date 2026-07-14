import {
  ArrowRight,
  BookOpen,
  Boxes,
  CornerDownLeft,
  GitBranch,
  Images,
  LayoutDashboard,
  Map,
  Search,
  Settings,
  Timer,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";

import { useEntryStore } from "../../features/entries/stores/useEntryStore";
import type { EntryType } from "../../features/entries/types";
import { useI18n } from "../i18n";
import { searchEntries } from "../search/searchEntries";

type SearchItem = {
  id: string;
  path: string;
  title: string;
  description: string;
  kind: "page" | "entry";
  icon?: LucideIcon;
  entryType?: EntryType;
};

const destinations: Array<{
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    path: "/dashboard",
    label: "nav.dashboard",
    description: "search.pageDashboard",
    icon: LayoutDashboard,
  },
  {
    path: "/entries",
    label: "nav.entries",
    description: "search.pageEntries",
    icon: BookOpen,
  },
  {
    path: "/map",
    label: "nav.map",
    description: "search.pageMap",
    icon: Map,
  },
  {
    path: "/graph",
    label: "nav.graph",
    description: "search.pageGraph",
    icon: GitBranch,
  },
  {
    path: "/timeline",
    label: "nav.timeline",
    description: "search.pageTimeline",
    icon: Timer,
  },
  {
    path: "/canvas",
    label: "nav.canvas",
    description: "search.pageCanvas",
    icon: Boxes,
  },
  {
    path: "/assets",
    label: "nav.assets",
    description: "search.pageAssets",
    icon: Images,
  },
  {
    path: "/settings",
    label: "nav.settings",
    description: "search.pageSettings",
    icon: Settings,
  },
];

export function GlobalSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const entries = useEntryStore((state) => state.entries);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const items = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const pageItems: SearchItem[] = destinations
      .map((destination) => ({
        id: `page:${destination.path}`,
        path: destination.path,
        title: t(destination.label),
        description: t(destination.description),
        kind: "page" as const,
        icon: destination.icon,
      }))
      .filter(
        (item) =>
          !normalizedQuery ||
          `${item.title} ${item.description}`
            .toLocaleLowerCase()
            .includes(normalizedQuery),
      );
    const entryItems: SearchItem[] = searchEntries(
      entries,
      query,
      normalizedQuery ? 8 : 5,
    ).map((entry) => ({
      id: `entry:${entry.id}`,
      path: `/entries/${entry.id}`,
      title: entry.title || t("entry.untitled"),
      description: entry.summary || t("common.noSummary"),
      kind: "entry",
      entryType: entry.type,
    }));

    return [...pageItems, ...entryItems];
  }, [entries, query, t]);

  const selectedIndex = items.length
    ? Math.min(activeIndex, items.length - 1)
    : 0;

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        setQuery("");
        setActiveIndex(0);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function handleOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node))
        closeSearch({ restoreFocus: false });
    }
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (!open || !items[selectedIndex]) return;
    document
      .getElementById(`${listId}-option-${selectedIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [items, listId, open, selectedIndex]);

  function openSearch() {
    if (!open) setActiveIndex(0);
    setOpen(true);
  }

  function closeSearch({ restoreFocus = true } = {}) {
    setOpen(false);
    if (restoreFocus) window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function selectItem(item: SearchItem) {
    closeSearch({ restoreFocus: false });
    navigate(item.path);
  }

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
      return;
    }

    if (event.key === "ArrowDown" && items.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % items.length);
    } else if (event.key === "ArrowUp" && items.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + items.length) % items.length);
    } else if (
      event.key === "Enter" &&
      event.target === inputRef.current &&
      items[selectedIndex]
    ) {
      event.preventDefault();
      selectItem(items[selectedIndex]);
    }
  }

  return (
    <div
      ref={rootRef}
      onKeyDown={handleDialogKeyDown}
      className="relative w-full max-w-sm"
    >
      <div className="ws-input flex h-10 min-w-0 items-center gap-2 rounded-full px-3 text-[var(--text-muted)] sm:h-11 sm:gap-3 sm:px-4">
        <Search size={17} strokeWidth={1.7} className="shrink-0" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          value={query}
          onFocus={openSearch}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          placeholder={t("topbar.search")}
          aria-label={t("search.placeholder")}
          aria-controls={listId}
          aria-expanded={open}
          aria-autocomplete="list"
          aria-activedescendant={
            open && items[selectedIndex]
              ? `${listId}-option-${selectedIndex}`
              : undefined
          }
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
        />
        <span className="ws-kbd hidden shrink-0 rounded-md px-1.5 py-0.5 lg:inline">⌘K</span>
      </div>

      {open ? (
        <div className="ws-popover-enter fixed left-4 right-4 top-[4.5rem] z-50 origin-top-right sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+.4rem)] sm:w-[min(34rem,calc(100vw-2rem))]">
          <div
            role="search"
            aria-labelledby={`${listId}-title`}
            className="ws-surface-raised w-full overflow-hidden rounded-[1.25rem] border border-[var(--border-strong)] shadow-2xl"
          >
            <h2 id={`${listId}-title`} className="sr-only">
              {t("search.title")}
            </h2>
            <div
              id={listId}
              role="listbox"
              aria-label={t("search.results")}
              className="max-h-[min(24rem,60vh)] overflow-y-auto p-2"
            >
              {items.length ? (
                items.map((item, index) => {
                  const Icon = item.icon ?? BookOpen;
                  const startsEntryGroup =
                    item.kind === "entry" && items[index - 1]?.kind !== "entry";
                  return (
                    <div key={item.id}>
                      {startsEntryGroup ? (
                        <div className="mx-3 my-2 h-px bg-[var(--border)]" />
                      ) : null}
                      <button
                        id={`${listId}-option-${index}`}
                        type="button"
                        role="option"
                        aria-selected={index === selectedIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onFocus={() => setActiveIndex(index)}
                        onClick={() => selectItem(item)}
                        className={`flex w-full items-center gap-3 rounded-[.9rem] px-3 py-2.5 text-left transition ${
                          index === selectedIndex
                            ? "bg-[var(--accent-soft)] text-[var(--text)]"
                            : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.75rem] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--accent)]">
                          <Icon size={16} strokeWidth={1.7} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold">
                              {item.title}
                            </span>
                            {item.entryType ? (
                              <span className="shrink-0 text-[0.65rem] uppercase tracking-[.12em] text-[var(--text-faint)]">
                                {t(`type.${item.entryType}`)}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 block truncate text-xs text-[var(--text-faint)]">
                            {item.description}
                          </span>
                        </span>
                        <ArrowRight
                          size={16}
                          className="shrink-0 text-[var(--text-faint)]"
                        />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div
                  role="status"
                  className="px-5 py-12 text-center text-sm text-[var(--text-muted)]"
                >
                  <p className="font-semibold text-[var(--text)]">
                    {t("search.noResults")}
                  </p>
                  <p className="mt-2 text-xs text-[var(--text-faint)]">
                    {t("search.tryAnother")}
                  </p>
                </div>
              )}
            </div>

            <div className="hidden items-center justify-between border-t border-[var(--border)] px-5 py-3 text-[0.68rem] text-[var(--text-faint)] sm:flex">
              <span>{t("search.keyboardHint")}</span>
              <span className="flex items-center gap-1.5">
                <CornerDownLeft size={13} />
                {t("search.openSelected")}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
