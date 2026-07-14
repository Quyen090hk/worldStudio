import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "../shared/components/AppLayout";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { EntriesPage } from "../features/entries/EntriesPage";
import { EntryDetailPage } from "../features/entries/EntryDetailPage";
import { MapPage } from "../features/map/MapPage";
import { useI18n } from "../shared/i18n";

const GraphPage = lazy(() =>
  import("../features/graph/GraphPage").then((module) => ({
    default: module.GraphPage,
  })),
);
const TimelinePage = lazy(() =>
  import("../features/timeline/TimelinePage").then((module) => ({
    default: module.TimelinePage,
  })),
);

function PlaceholderPage({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <div className="ws-surface rounded-[2rem] p-8">
      <p className="ws-eyebrow">{t("common.comingSoon")}</p>

      <h2 className="ws-display mt-4 text-4xl font-semibold text-[var(--text)]">
        {t(`nav.${title.toLowerCase()}`)}
      </h2>

      <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)]">
        {t("common.comingSoon")}
      </p>
    </div>
  );
}

export function AppRoutes() {
  const { t } = useI18n();
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="entries" element={<EntriesPage />} />
        <Route path="entries/:entryId" element={<EntryDetailPage />} />

        <Route path="map" element={<MapPage />} />
        <Route
          path="graph"
          element={
            <Suspense
              fallback={
                <div className="flex min-h-[36rem] items-center justify-center text-sm text-[var(--text-faint)]">
                  {t("common.preparingGraph")}
                </div>
              }
            >
              <GraphPage />
            </Suspense>
          }
        />
        <Route
          path="timeline"
          element={
            <Suspense
              fallback={
                <div className="flex min-h-[36rem] items-center justify-center text-sm text-[var(--text-faint)]">
                  {t("common.preparingChronology")}
                </div>
              }
            >
              <TimelinePage />
            </Suspense>
          }
        />
        <Route path="canvas" element={<PlaceholderPage title="Canvas" />} />
        <Route path="assets" element={<PlaceholderPage title="Assets" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
      </Route>
    </Routes>
  );
}
