import { CheckCircle2, HeartPulse, Wrench } from "lucide-react";
import { useMemo } from "react";
import { useI18n } from "../../../shared/i18n";
import { useSoftDialog } from "../../../shared/components/softDialogContext";
import { useCanvasStore } from "../../canvas/stores/useCanvasStore";
import { useEntryStore } from "../../entries/stores/useEntryStore";
import { useRelationshipStore } from "../../graph/stores/useRelationshipStore";
import { useMapStore } from "../../map/stores/useMapStore";
import { useTimelineStore } from "../../timeline/stores/useTimelineStore";
import { scanWorkspaceHealth } from "../dataHealth";
import { repairWorkspaceData } from "../repairWorkspaceData";

export function DataHealthPanel() {
  const { t } = useI18n();
  const dialog = useSoftDialog();
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
  async function repair() {
    if (await dialog.confirm({ message: t("settings.healthRepairConfirm", { count: report.total }) })) repairWorkspaceData();
  }
  return (
    <section className="ws-compact-surface ws-panel-padding h-full">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)]"><HeartPulse size={18} /></span><div><h3 className="ws-display text-2xl font-semibold">{t("settings.healthTitle")}</h3><p className="mt-1 text-xs leading-5 text-[var(--text-faint)]">{report.total > 0 ? t("settings.healthDescription") : t("settings.healthClean")}</p></div></div>
        {report.total > 0 ? <button type="button" onClick={repair} className="ws-button-secondary flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"><Wrench size={16} />{t("settings.repairIssues", { count: report.total })}</button> : null}
      </div>
      <div className="mt-6 grid grid-cols-2 border-y border-[var(--border)]">{rows.map(([label, count], index) => <div key={label} className={`px-3 py-3.5 ${index > 1 ? "border-t border-[var(--border)]" : ""} ${index % 2 ? "border-l border-[var(--border)]" : ""}`}><p className="text-[0.68rem] text-[var(--text-faint)]">{label}</p><p className={`mt-1 text-xl font-semibold ${count ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-300"}`}>{count}</p></div>)}</div>
      {report.total === 0 ? <p role="status" className="mt-5 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-300"><CheckCircle2 size={15} />{t("settings.healthReady")}</p> : <p role="status" className="mt-5 text-xs leading-5 text-[var(--text-faint)]">{t("settings.healthFound", { count: report.total })}</p>}
    </section>
  );
}
