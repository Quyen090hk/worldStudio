import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { EntryDrawer } from "../../features/entries/components/EntryDrawer";
import { useWorldStore } from "../../features/world/stores/useWorldStore";
import { useWorldRegistryStore } from "../../features/world/stores/useWorldRegistryStore";
import { WorldSetupPage } from "../../features/world/WorldSetupPage";
import { useI18n } from "../i18n";
import { moduleForPath } from "../navigation/modules";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { Topbar } from "./Topbar";
import { UndoToast } from "./UndoToast";

export function AppLayout() {
  const { t } = useI18n();
  const location = useLocation();
  const worldName = useWorldStore((state) => state.profile.name);
  const hasWorld = useWorldRegistryStore((state) => state.worlds.length > 0);
  const initialRoute = useRef(true);
  const currentModule = moduleForPath(location.pathname);

  useEffect(() => {
    document.title = worldName && hasWorld ? `${worldName} · World Studio` : "World Studio";
  }, [hasWorld, worldName]);

  useEffect(() => {
    if (initialRoute.current) {
      initialRoute.current = false;
      return;
    }
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [location.pathname]);

  if (!hasWorld) return <WorldSetupPage />;

  return (
    <div className="min-h-screen text-[var(--text)]">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-full bg-[var(--button-primary-bg)] px-4 py-2 text-sm font-semibold text-[var(--button-primary-text)] shadow-xl transition-transform focus:translate-y-0"
      >
        {t("navigation.skipToContent")}
      </a>

      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {t(currentModule.label)}
      </span>

      <div className="flex min-h-screen flex-col">
          <Topbar />

          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6"
          >
            <div className="mx-auto w-full max-w-[94rem]">
              <RouteErrorBoundary>
                <Outlet />
              </RouteErrorBoundary>
            </div>
          </main>
      </div>

      <EntryDrawer />
      <UndoToast />
    </div>
  );
}
