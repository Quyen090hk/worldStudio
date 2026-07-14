import { CheckCircle2, HeartPulse, Wrench } from "lucide-react";
import { useMemo } from "react";
import { useI18n } from "../../../shared/i18n";
import { useCanvasStore } from "../../canvas/stores/useCanvasStore";
import { useEntryStore } from "../../entries/stores/useEntryStore";
import { useRelationshipStore } from "../../graph/stores/useRelationshipStore";
import { useMapStore } from "../../map/stores/useMapStore";
import { useTimelineStore } from "../../timeline/stores/useTimelineStore";
import { scanWorkspaceHealth } from "../dataHealth";
import { repairWorkspaceData } from "../repairWorkspaceData";

export function DataHealthPanel() {
  const { t } = useI18n();
  const entries = useEntryStore((state) => state.entries);
  const relationships = useRelationshipStore((state) => state.relationships);
  const timelineItems = useTimelineStore((state) => state.items);
  const maps = useMapStore((state) => state.maps);
  const activeMapId = useMapStore((state) => state.activeMapId);
  const layers = useMapStore((state) => state.layers);
  const markers = useMapStore((state) => state.markers);
  const mapConnections = useMapStore((state) => state.connections);
  const canvasCards = useCanvasStore((state) => state.cards);
  const canvasConnections = useCanvasStore((state) => state.connections);
  const report = useMemo(() => scanWorkspaceHealth({ entries, relationships, timelineItems, maps, activeMapId, layers, markers, mapConnections, canvasCards, canvasConnections }), [activeMapId, canvasCards, canvasConnections, entries, layers, mapConnections, maps, markers, relationships, timelineItems]);
  const rows = [[t("settings.healthRelationships"), report.relationships], [t("settings.healthTimeline"), report.timeline], [t("settings.healthMap"), report.mapMarkers + report.mapEntryReferences + report.mapConnections + report.activeMap], [t("settings.healthCanvas"), report.canvasCards + report.canvasConnections]] as const;
  function repair() {
    if (window.confirm(t("settings.healthRepairConfirm", { count: report.total }))) repairWorkspaceData();
  }
  return (
    <section className="ws-surface rounded-[2rem] p-6 md:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-[var(--accent-soft)] text-[var(--accent)]"><HeartPulse size={21} /></span><div><p className="ws-eyebrow">{t("settings.healthEyebrow")}</p><h3 className="ws-display mt-2 text-3xl font-semibold">{t("settings.healthTitle")}</h3><p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">{t("settings.healthDescription")}</p></div></div>
        {report.total > 0 ? <button type="button" onClick={repair} className="ws-button-secondary flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"><Wrench size={16} />{t("settings.repairIssues", { count: report.total })}</button> : null}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{rows.map(([label, count]) => <div key={label} className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--surface-muted)] p-4"><p className="text-xs text-[var(--text-faint)]">{label}</p><p className={`mt-2 text-2xl font-semibold ${count ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-300"}`}>{count}</p></div>)}</div>
      {report.total === 0 ? <p role="status" className="mt-5 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-300"><CheckCircle2 size={16} />{t("settings.healthClean")}</p> : <p role="status" className="mt-5 text-xs leading-6 text-[var(--text-faint)]">{t("settings.healthFound", { count: report.total })}</p>}
    </section>
  );
}
