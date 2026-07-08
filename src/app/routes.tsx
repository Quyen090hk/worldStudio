import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "../shared/components/AppLayout";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { EntriesPage } from "../features/entries/EntriesPage";
import { EntryDetailPage } from "../features/entries/EntryDetailPage";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="ws-surface rounded-[2rem] p-8">
      <p className="ws-eyebrow">Coming Soon</p>

      <h2 className="ws-display mt-4 text-4xl font-semibold text-[var(--text)]">
        {title}
      </h2>

      <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)]">
        这个模块后面我们会继续实现。当前阶段先统一整体美学、日夜模式和核心信息架构。
      </p>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="entries" element={<EntriesPage />} />
        <Route path="entries/:entryId" element={<EntryDetailPage />} />

        <Route path="map" element={<PlaceholderPage title="Map" />} />
        <Route path="graph" element={<PlaceholderPage title="Graph" />} />
        <Route path="timeline" element={<PlaceholderPage title="Timeline" />} />
        <Route path="canvas" element={<PlaceholderPage title="Canvas" />} />
        <Route path="assets" element={<PlaceholderPage title="Assets" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
      </Route>
    </Routes>
  );
}