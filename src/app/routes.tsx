import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../shared/components/AppLayout";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { EntriesPage } from "../features/entries/EntriesPage";
import { EntryDetailPage } from "../features/entries/EntryDetailPage";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
      <p className="text-sm uppercase tracking-[0.3em] text-violet-300">
        Coming Soon
      </p>
      <h2 className="mt-3 text-3xl font-semibold">{title}</h2>
      <p className="mt-3 text-stone-400">
        这个模块后面我们会继续实现。
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
        <Route path="map" element={<PlaceholderPage title="Map" />} />
        <Route path="graph" element={<PlaceholderPage title="Graph" />} />
        <Route path="timeline" element={<PlaceholderPage title="Timeline" />} />
        <Route path="canvas" element={<PlaceholderPage title="Canvas" />} />
        <Route path="assets" element={<PlaceholderPage title="Assets" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />}/>
        <Route path="entries" element={<EntriesPage />} />
        <Route path="entries/:entryId" element={<EntryDetailPage />} /> 
      </Route>
    </Routes>
  );
}