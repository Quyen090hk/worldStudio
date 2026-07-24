import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "../shared/components/AppLayout";
import { NotFoundPage } from "../shared/components/NotFoundPage";
import { useI18n } from "../shared/i18n";
const ManuscriptPage = lazy(() => import("../features/manuscript/ManuscriptPage").then((module) => ({ default: module.ManuscriptPage })));

const EntriesPage = lazy(() =>
  import("../features/entries/EntriesPage").then((module) => ({
    default: module.EntriesPage,
  })),
);
const EntryDetailPage = lazy(() =>
  import("../features/entries/EntryDetailPage").then((module) => ({
    default: module.EntryDetailPage,
  })),
);
const MapPage = lazy(() =>
  import("../features/map/MapPage").then((module) => ({
    default: module.MapPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../features/settings/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const AssetsPage = lazy(() =>
  import("../features/assets/AssetsPage").then((module) => ({
    default: module.AssetsPage,
  })),
);
const CanvasPage = lazy(() =>
  import("../features/canvas/CanvasPage").then((module) => ({
    default: module.CanvasPage,
  })),
);
const GraphPage = lazy(() =>
  import("../features/graph/GraphPage").then((module) => ({
    default: module.GraphPage,
  })),
);
const InspirationPage = lazy(() =>
  import("../features/inspiration/InspirationPage").then((module) => ({
    default: module.InspirationPage,
  })),
);

function RouteSuspense({
  children,
  message,
}: {
  children: ReactNode;
  message: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[36rem] items-center justify-center text-sm text-[var(--text-faint)]">
          {message}
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
const TimelinePage = lazy(() =>
  import("../features/timeline/TimelinePage").then((module) => ({
    default: module.TimelinePage,
  })),
);

export function AppRoutes() {
  const { t } = useI18n();
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/manuscript" replace />} />

        <Route
          path="manuscript"
          element={
            <RouteSuspense message={t("common.preparingPage")}>
              <ManuscriptPage />
            </RouteSuspense>
          }
        />
        <Route path="dashboard" element={<Navigate to="/manuscript" replace />} />
        <Route
          path="entries"
          element={
            <RouteSuspense message={t("common.preparingPage")}>
              <EntriesPage />
            </RouteSuspense>
          }
        />
        <Route
          path="entries/:entryId"
          element={
            <RouteSuspense message={t("common.preparingPage")}>
              <EntryDetailPage />
            </RouteSuspense>
          }
        />

        <Route
          path="map"
          element={
            <RouteSuspense message={t("common.preparingPage")}>
              <MapPage />
            </RouteSuspense>
          }
        />
        <Route
          path="graph"
          element={
            <RouteSuspense message={t("common.preparingGraph")}>
              <GraphPage />
            </RouteSuspense>
          }
        />
        <Route
          path="timeline"
          element={
            <RouteSuspense message={t("common.preparingChronology")}>
              <TimelinePage />
            </RouteSuspense>
          }
        />
        <Route
          path="canvas"
          element={
            <RouteSuspense message={t("common.preparingPage")}>
              <CanvasPage />
            </RouteSuspense>
          }
        />
        <Route
          path="assets"
          element={
            <RouteSuspense message={t("common.preparingPage")}>
              <AssetsPage />
            </RouteSuspense>
          }
        />
        <Route
          path="inspiration"
          element={
            <RouteSuspense message={t("common.preparingPage")}>
              <InspirationPage />
            </RouteSuspense>
          }
        />
        <Route
          path="settings"
          element={
            <RouteSuspense message={t("common.preparingPage")}>
              <SettingsPage />
            </RouteSuspense>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
