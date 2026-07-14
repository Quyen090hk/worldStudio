import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import { EntryDrawer } from "../../features/entries/components/EntryDrawer";
import { useWorldStore } from "../../features/world/stores/useWorldStore";
import { useI18n } from "../i18n";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { UndoToast } from "./UndoToast";

export function AppLayout() {
  const { t } = useI18n();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const worldName = useWorldStore((state) => state.profile.name);
  const closeMobileNavigation = useCallback(() => {
    setMobileNavigationOpen(false);
    window.setTimeout(
      () => document.getElementById("mobile-navigation-trigger")?.focus(),
      0,
    );
  }, []);

  useEffect(() => {
    document.title = `${worldName} · World Studio`;
  }, [worldName]);

  return (
    <div className="min-h-screen text-[var(--text)]">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-full bg-[var(--button-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--button-primary-text)] shadow-xl transition-transform focus:translate-y-0"
      >
        {t("navigation.skipToContent")}
      </a>

      <div className="flex min-h-screen">
        <Sidebar
          mobileOpen={mobileNavigationOpen}
          onMobileClose={closeMobileNavigation}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            navigationOpen={mobileNavigationOpen}
            onOpenNavigation={() => setMobileNavigationOpen(true)}
          />

          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7"
          >
            <div className="mx-auto w-full max-w-7xl">
              <RouteErrorBoundary>
                <Outlet />
              </RouteErrorBoundary>
            </div>
          </main>
        </div>
      </div>

      <EntryDrawer />
      <UndoToast />
    </div>
  );
}
