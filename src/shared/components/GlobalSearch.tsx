import {
  ArrowRight,
  BookOpen,
  Boxes,
  CornerDownLeft,
  GitBranch,
  Feather,
  Images,
  LibraryBig,
  Map,
  MapPin,
  Plus,
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
import { useMapStore } from "../../features/map/stores/useMapStore";
import { useTimelineStore } from "../../features/timeline/stores/useTimelineStore";
import { useAssetStore } from "../../features/assets/stores/useAssetStore";
import type { EntryType } from "../../features/entries/types";
import { useI18n } from "../i18n";
import { getEntrySearchExcerpt, searchEntries } from "../search/searchEntries";

type SearchItem = {
  id: string;
  path: string;
  title: string;
  description: string;
  kind: "page" | "entry" | "marker" | "timeline" | "asset" | "action";
  group: "quick" | "recent" | "content" | "pages";
  icon?: LucideIcon;
  entryType?: EntryType;
};

function HighlightedText({ text, query }: { text: string; query: string }) {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return text;
  const pattern = new RegExp(`(${tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(pattern).map((part, index) =>
    tokens.some((token) => token.toLocaleLowerCase() === part.toLocaleLowerCase())
      ? <mark key={`${part}-${index}`} className="rounded-sm bg-[var(--accent-soft)] text-inherit">{part}</mark>
      : part,
  );
}

const destinations: Array<{
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    path: "/manuscript",
    label: "nav.manuscript",
    description: "search.pageManuscript",
    icon: LibraryBig,
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
    path: "/inspiration",
    label: "nav.inspiration",
    description: "search.pageInspiration",
    icon: Feather,
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
  const openCreateEntry = useEntryStore((state) => state.openCreateEntry);
  const markers = useMapStore((state) => state.markers);
  const timelineItems = useTimelineStore((state) => state.items);
  const assets = useAssetStore((state) => state.assets);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [entryType, setEntryType] = useState<EntryType | "all">("all");
  const [recentQueries, setRecentQueries] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("world-studio.recent-searches") ?? "[]") as string[]; }
    catch { return []; }
  });
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
        group: "pages" as const,
        icon: destination.icon,
      }))
      .filter(
        (item) =>
          normalizedQuery &&
          `${item.title} ${item.description}`
            .toLocaleLowerCase()
            .includes(normalizedQuery),
      );
    if (!normalizedQuery) {
      const recentItems: SearchItem[] = [...entries]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5)
        .map((entry) => ({
          id: `entry:${entry.id}`,
          path: `/entries/${entry.id}`,
          title: entry.title || t("entry.untitled"),
          description: entry.summary || t("common.noSummary"),
          kind: "entry",
          group: "recent",
          entryType: entry.type,
        }));
      return [{ id: "action:new-entry", path: "", title: t("search.createEntry"), description: t("search.createEntryHelp"), kind: "action", group: "quick", icon: Plus }, ...recentItems] satisfies SearchItem[];
    }

    const searchableEntries = entryType === "all" ? entries : entries.filter((entry) => entry.type === entryType);
    const entryItems: SearchItem[] = searchEntries(
      searchableEntries,
      query,
      7,
    ).map((entry) => ({
      id: `entry:${entry.id}`,
      path: `/entries/${entry.id}`,
      title: entry.title || t("entry.untitled"),
      description: getEntrySearchExcerpt(entry, query) || t("common.noSummary"),
      kind: "entry",
      group: "content",
      entryType: entry.type,
    }));

    const markerItems: SearchItem[] = markers
      .filter((marker) => `${marker.title} ${marker.description} ${marker.category}`.toLocaleLowerCase().includes(normalizedQuery))
      .slice(0, 4)
      .map((marker) => ({ id: `marker:${marker.id}`, path: `/map?map=${marker.mapId}&marker=${marker.id}`, title: marker.title, description: marker.description || t("search.mapMarker"), kind: "marker", group: "content", icon: MapPin }));
    const timelineResults: SearchItem[] = timelineItems
      .filter((item) => `${item.description} ${item.category ?? ""} ${item.startYear}`.toLocaleLowerCase().includes(normalizedQuery))
      .slice(0, 4)
      .map((item) => ({ id: `timeline:${item.id}`, path: item.entryId ? `/timeline?entry=${item.entryId}` : "/timeline", title: item.title || item.description || t("nav.timeline"), description: `${item.startYear}${item.endYear === null ? "" : `–${item.endYear}`}`, kind: "timeline", group: "content", icon: Timer }));
    const assetItems: SearchItem[] = assets
      .filter((asset) => `${asset.name} ${asset.tags.join(" ")} ${asset.kind}`.toLocaleLowerCase().includes(normalizedQuery))
      .slice(0, 4)
      .map((asset) => ({ id: `asset:${asset.id}`, path: "/assets", title: asset.name, description: asset.tags.length ? asset.tags.map((tag) => `#${tag}`).join(" ") : t("nav.assets"), kind: "asset", group: "content", icon: Images }));

    return [...entryItems, ...markerItems, ...timelineResults, ...assetItems, ...pageItems].slice(0, 16);
  }, [assets, entries, entryType, markers, query, t, timelineItems]);

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
    const normalizedQuery = query.trim();
    if (normalizedQuery) {
      const next = [normalizedQuery, ...recentQueries.filter((value) => value !== normalizedQuery)].slice(0, 5);
      setRecentQueries(next);
      localStorage.setItem("world-studio.recent-searches", JSON.stringify(next));
    }
    closeSearch({ restoreFocus: false });
    if (item.kind === "action") {
      openCreateEntry();
      return;
    }
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
            className="ws-dropdown-surface w-full overflow-hidden"
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
              {!query.trim() && recentQueries.length ? (
                <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] px-3 pb-3 pt-2">
                  {recentQueries.map((value) => <button key={value} type="button" onClick={() => { setQuery(value); setActiveIndex(0); }} className="shrink-0 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-muted)]">{value}</button>)}
                </div>
              ) : null}
              {query.trim() ? (
                <div className="flex gap-1.5 overflow-x-auto border-b border-[var(--border)] px-3 py-2">
                  {(["all", "Character", "Location", "Organization", "Item", "Event"] as const).map((type) => <button key={type} type="button" aria-pressed={entryType === type} onClick={() => { setEntryType(type); setActiveIndex(0); }} className={`shrink-0 rounded-full px-3 py-1.5 text-[0.68rem] font-semibold ${entryType === type ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "text-[var(--text-faint)] hover:bg-[var(--surface-muted)]"}`}>{type === "all" ? t("common.all") : t(`type.${type}`)}</button>)}
                </div>
              ) : null}
              {items.length ? (
                items.map((item, index) => {
                  const Icon = item.icon ?? BookOpen;
                  const startsGroup = item.group !== items[index - 1]?.group;
                  const groupLabel = t(`search.group.${item.group}`);
                  return (
                    <div key={item.id}>
                      {startsGroup ? <p className={`${index ? "mt-2 border-t border-[var(--border)] pt-3" : "pt-1"} px-3 pb-1.5 text-[0.62rem] font-bold uppercase tracking-[.18em] text-[var(--text-faint)]`}>{groupLabel}</p> : null}
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
                              <HighlightedText text={item.title} query={query} />
                            </span>
                            {item.entryType ? (
                              <span className="shrink-0 text-[0.65rem] uppercase tracking-[.12em] text-[var(--text-faint)]">
                                {t(`type.${item.entryType}`)}
                              </span>
                            ) : null}
                          </span>
                          {item.kind !== "page" ? (
                            <span className="mt-1 block truncate text-xs text-[var(--text-faint)]">
                              <HighlightedText text={item.description} query={query} />
                            </span>
                          ) : null}
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
                  className="px-5 py-8 text-center text-sm text-[var(--text-muted)]"
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
