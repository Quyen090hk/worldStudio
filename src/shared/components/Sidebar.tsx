import {
  BookOpen,
  Boxes,
  GitBranch,
  LibraryBig,
  Image,
  Map,
  Settings,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { NavLink } from "react-router-dom";
import { useI18n } from "../i18n";
import { useWorldStore } from "../../features/world/stores/useWorldStore";
import { LanguageMenu } from "./LanguageMenu";

const navItems = [
  {
    label: "nav.manuscript",
    path: "/manuscript",
    icon: LibraryBig,
  },
  {
    label: "nav.entries",
    path: "/entries",
    icon: BookOpen,
  },
  {
    label: "nav.map",
    path: "/map",
    icon: Map,
  },
  {
    label: "nav.graph",
    path: "/graph",
    icon: GitBranch,
  },
  {
    label: "nav.timeline",
    path: "/timeline",
    icon: Timer,
  },
  {
    label: "nav.canvas",
    path: "/canvas",
    icon: Boxes,
  },
  {
    label: "nav.assets",
    path: "/assets",
    icon: Image,
  },
];

function NavigationContent({
  onNavigate,
  showClose = false,
  showWorldCard = false,
  closeButtonRef,
}: {
  onNavigate?: () => void;
  showClose?: boolean;
  showWorldCard?: boolean;
  closeButtonRef?: RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useI18n();
  const profile = useWorldStore((state) => state.profile);

  return (
    <div className="flex h-full flex-col px-3 py-4">
      <div className="mb-5 px-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Sparkles size={18} strokeWidth={1.65} />
            </div>

            <div>
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--text-faint)]">
                World
              </div>

              <div className="ws-display ws-foil-text text-lg font-bold leading-none">
                Studio
              </div>
            </div>
          </div>

          {showClose ? (
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onNavigate}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
              aria-label={t("navigation.close")}
            >
              <X size={18} />
            </button>
          ) : null}
        </div>

        <div className="mt-4 h-px bg-[var(--border)]" />
      </div>

      <nav className="space-y-1" aria-label={t("navigation.primary")}>
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  isActive
                    ? "bg-[var(--accent-soft)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full transition",
                      isActive
                        ? "bg-[var(--accent)] opacity-100"
                        : "bg-transparent opacity-0",
                    ].join(" ")}
                  />

                  <Icon
                    size={18}
                    strokeWidth={1.65}
                    className={isActive ? "text-[var(--accent)]" : ""}
                  />

                  <span>{t(item.label)}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        {showWorldCard ? <div className="ws-surface-soft rounded-[1.5rem] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--text-faint)]">
              {t("common.currentWorld")}
            </div>

            <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          </div>

          <div className="ws-display ws-foil-text text-lg font-bold leading-tight">
            {profile.name}
          </div>

          <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
            {profile.description || t("settings.worldDescriptionEmpty")}
          </p>
        </div> : null}

        <LanguageMenu />

        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            [
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              isActive
                ? "bg-[var(--accent-soft)] text-[var(--text)]"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]",
            ].join(" ")
          }
        >
          <Settings size={18} strokeWidth={1.65} />
          <span>{t("nav.settings")}</span>
        </NavLink>
      </div>
    </div>
  );
}

export function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const { t } = useI18n();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onMobileClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen, onMobileClose]);

  function trapFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const focusable = mobilePanelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_78%,transparent)] backdrop-blur-2xl lg:block">
        <NavigationContent />
      </aside>

      {mobileOpen ? (
        <div
          className="ws-backdrop-enter fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onMobileClose();
          }}
        >
          <aside
            ref={mobilePanelRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label={t("navigation.primary")}
            onKeyDown={trapFocus}
            className="ws-drawer-enter-left h-full w-[min(19rem,88vw)] border-r border-[var(--border)] bg-[var(--surface-solid)] shadow-2xl"
          >
            <NavigationContent
              onNavigate={onMobileClose}
              showClose
              showWorldCard
              closeButtonRef={closeButtonRef}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
