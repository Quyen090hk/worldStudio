import { ChevronRight, Link2, MapPin, Route, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useI18n } from "../../../shared/i18n";
import { useSoftDialog } from "../../../shared/components/softDialogContext";
import { SelectMenu } from "../../../shared/components/SelectMenu";
import { useEntryStore } from "../../entries/stores/useEntryStore";
import {
  MAP_CATEGORIES,
  MAP_COLORS,
  MAP_CONNECTION_TYPES,
} from "../mapOptions";
import { useMapStore } from "../stores/useMapStore";
import type { ConnectionType, MarkerCategory } from "../types";

export function MapMarkerPanel({
  selectedId,
  clearSelection,
}: {
  selectedId: string | null;
  clearSelection: () => void;
}) {
  const { t } = useI18n();
  const dialog = useSoftDialog();
  const navigate = useNavigate();
  const store = useMapStore();
  const entries = useEntryStore((state) => state.entries);
  const selected = store.markers.find((marker) => marker.id === selectedId) ?? null;
  const [connectionTarget, setConnectionTarget] = useState("");
  const [connectionType, setConnectionType] = useState<ConnectionType>("Road");

  if (!selected) {
    return (
      <aside className="ws-compact-surface overflow-y-auto p-4">
        <div className="flex min-h-64 flex-col items-center justify-center text-center">
          <MapPin size={28} className="text-[var(--text-faint)]" />
          <h3 className="ws-display mt-4 text-2xl font-semibold">{t("map.selectMarker")}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{t("map.selectMarkerHelp")}</p>
        </div>
      </aside>
    );
  }

  const marker = selected;

  const mapLayers = store.layers.filter((layer) => layer.mapId === marker.mapId);
  const mapMarkers = store.markers.filter((item) => item.mapId === marker.mapId);
  const mapConnections = store.connections.filter((connection) => connection.mapId === marker.mapId);
  const selectedConnections = mapConnections.filter(
    (connection) => connection.fromMarkerId === selected.id || connection.toMarkerId === selected.id,
  );

  function update(patch: Parameters<typeof store.updateMarker>[1]) {
    store.updateMarker(marker.id, patch);
  }

  function toggleEntry(entryId: string) {
    update({
      entryIds: marker.entryIds.includes(entryId)
        ? marker.entryIds.filter((id) => id !== entryId)
        : [...marker.entryIds, entryId],
    });
  }

  function connectMarkers() {
    if (!connectionTarget || connectionTarget === marker.id) return;
    store.addConnection({
      mapId: marker.mapId,
      fromMarkerId: marker.id,
      toMarkerId: connectionTarget,
      type: connectionType,
      label: connectionType,
      color: marker.color,
      dashed: ["Border", "Migration", "Campaign", "Journey"].includes(connectionType),
    });
    setConnectionTarget("");
  }

  return (
    <aside className="ws-compact-surface overflow-y-auto p-5">
      <div className="space-y-5">
        <div><p className="ws-eyebrow">{t("map.loreMarker")}</p><input value={selected.title} onChange={(event) => update({ title: event.target.value })} className="ws-display mt-2 w-full bg-transparent text-3xl font-semibold outline-none" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><span className="mb-2 block text-[10px] font-bold uppercase text-[var(--text-faint)]">{t("map.category")}</span><SelectMenu value={selected.category} onChange={(value) => update({ category: value as MarkerCategory })} ariaLabel={t("map.category")} className="h-10 w-full" buttonClassName="text-xs" options={MAP_CATEGORIES.map((category) => ({ value: category, label: t(`map.category.${category}`) }))} /></div>
          <div><span className="mb-2 block text-[10px] font-bold uppercase text-[var(--text-faint)]">{t("map.layer")}</span><SelectMenu value={selected.layerId} onChange={(value) => update({ layerId: value })} ariaLabel={t("map.layer")} className="h-10 w-full" buttonClassName="text-xs" options={mapLayers.map((layer) => ({ value: layer.id, label: layer.name }))} /></div>
        </div>
        <label><span className="mb-2 block text-[10px] font-bold uppercase text-[var(--text-faint)]">{t("map.writerNote")}</span><textarea value={selected.description} onChange={(event) => update({ description: event.target.value })} rows={4} className="ws-input w-full rounded-xl p-4 text-sm leading-6" /></label>
        <div><span className="mb-2 block text-[10px] font-bold uppercase text-[var(--text-faint)]">{t("map.visibleDuringEra")}</span><div className="grid grid-cols-2 gap-2"><input type="number" value={selected.startYear ?? ""} onChange={(event) => update({ startYear: event.target.value ? Number(event.target.value) : null })} placeholder={t("map.fromYear")} className="ws-input h-10 rounded-xl px-2 text-xs" /><input type="number" value={selected.endYear ?? ""} onChange={(event) => update({ endYear: event.target.value ? Number(event.target.value) : null })} placeholder={t("map.toYear")} className="ws-input h-10 rounded-xl px-2 text-xs" /></div></div>
        <details className="rounded-xl border border-[var(--border)] p-3">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-[.12em] text-[var(--text-faint)]">{t("map.linkedEntries", { count: selected.entryIds.length })}</summary>
          <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">{entries.map((entry) => <label key={entry.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-[var(--surface-muted)]"><input type="checkbox" checked={selected.entryIds.includes(entry.id)} onChange={() => toggleEntry(entry.id)} /><span className="min-w-0 flex-1 truncate text-xs"><b>{entry.title}</b><span className="ml-1 text-[var(--text-faint)]">{t(`type.${entry.type}`)}</span></span>{selected.entryIds.includes(entry.id) ? <button type="button" onClick={(event) => { event.preventDefault(); navigate(`/entries/${entry.id}`); }}><ChevronRight size={14} /></button> : null}</label>)}</div>
        </details>
        <details className="rounded-xl border border-[var(--border)] p-3">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-[.12em] text-[var(--text-faint)]">{t("map.connections", { count: selectedConnections.length })}</summary>
          <div className="mt-3 space-y-2"><SelectMenu value={connectionTarget} onChange={setConnectionTarget} ariaLabel={t("map.connectMarker")} className="h-10 w-full" buttonClassName="px-2 text-xs" options={[{ value: "", label: t("map.connectMarker") }, ...mapMarkers.filter((marker) => marker.id !== selected.id).map((marker) => ({ value: marker.id, label: marker.title }))]} /><div className="flex gap-2"><SelectMenu value={connectionType} onChange={(value) => setConnectionType(value as ConnectionType)} ariaLabel={t("map.connections", { count: selectedConnections.length })} className="h-10 min-w-0 flex-1" buttonClassName="px-2 text-xs" options={MAP_CONNECTION_TYPES.map((type) => ({ value: type, label: t(`map.connection.${type}`) }))} /><button type="button" onClick={connectMarkers} disabled={!connectionTarget} className="ws-button-primary flex h-10 w-10 items-center justify-center rounded-xl" aria-label={t("map.connectMarker")} title={t("map.connectMarker")}><Link2 size={15} /></button></div>{selectedConnections.map((connection) => { const otherId = connection.fromMarkerId === selected.id ? connection.toMarkerId : connection.fromMarkerId; const otherName = mapMarkers.find((marker) => marker.id === otherId)?.title ?? ""; return <div key={connection.id} className="flex items-center gap-2 rounded-lg bg-[var(--surface-muted)] p-2 text-xs"><Route size={14} /><span className="flex-1 truncate">{t(`map.connection.${connection.type}`)} · {otherName}</span><button type="button" onClick={() => store.deleteConnection(connection.id)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-500/10" aria-label={t("canvas.removeConnection", { name: otherName })} title={t("canvas.removeConnection", { name: otherName })}><X size={13} /></button></div>; })}</div>
        </details>
        <div><span className="mb-2 block text-[10px] font-bold uppercase text-[var(--text-faint)]">{t("map.style")}</span><div className="flex items-center gap-2">{MAP_COLORS.map((color) => <button key={color} onClick={() => update({ color })} className={`h-7 w-7 rounded-full ${selected.color === color ? "ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--surface-solid)]" : ""}`} style={{ background: color }} aria-label={color} />)}<SelectMenu value={selected.size} onChange={(value) => update({ size: value as "Small" | "Medium" | "Large" })} ariaLabel={t("map.style")} className="ml-auto h-9 w-28" buttonClassName="px-2 text-xs" options={["Small", "Medium", "Large"].map((value) => ({ value, label: t(`map.${value.toLowerCase()}`) }))} /></div></div>
        <button onClick={() => void dialog.confirm({ message: t("map.deleteMarkerConfirm", { title: selected.title }), danger: true, confirmLabel: t("common.delete") }).then((confirmed) => { if (confirmed) { store.deleteMarker(selected.id); clearSelection(); } })} className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-red-500/10 text-xs font-semibold text-red-500"><Trash2 size={14} />{t("map.deleteMarker")}</button>
      </div>
    </aside>
  );
}
