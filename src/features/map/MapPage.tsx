import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  FileImage,
  ImageUp,
  MapPin,
  Minus,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { MotionPage } from "../../shared/components/MotionPage";
import { SelectMenu } from "../../shared/components/SelectMenu";
import { useSoftDialog } from "../../shared/components/softDialogContext";
import { useI18n } from "../../shared/i18n";
import { useMapStore } from "./stores/useMapStore";
import type { MapScale, MarkerCategory } from "./types";
import {
  CATEGORY_GLYPH as categoryGlyph,
  MAP_CATEGORIES as categories,
  MAP_COLORS as colors,
  MAP_SCALES as scales,
} from "./mapOptions";
import {
  loadMapImage,
  removeMapImage,
  saveMapImage,
} from "./utils/mapImageStorage";
import { MapMarkerPanel } from "./components/MapMarkerPanel";
import { useWorldRegistryStore } from "../world/stores/useWorldRegistryStore";
import { isMapImageReferencedByStoredWorld } from "../world/worldResourceReferences";

export function MapPage() {
  const store = useMapStore();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const dialog = useSoftDialog();
  const viewportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    ox: number;
    oy: number;
  } | null>(null);
  const requestedMap = store.maps.find(
    (map) => map.id === searchParams.get("map"),
  );
  const requestedMarkerId = searchParams.get("marker");
  const activeMap =
    requestedMap ??
    store.maps.find((map) => map.id === store.activeMapId) ??
    store.maps[0];
  const mapLayers = useMemo(
    () => store.layers.filter((layer) => layer.mapId === activeMap.id),
    [activeMap.id, store.layers],
  );
  const mapMarkers = useMemo(
    () => store.markers.filter((marker) => marker.mapId === activeMap.id),
    [activeMap.id, store.markers],
  );
  const mapConnections = useMemo(
    () => store.connections.filter((connection) => connection.mapId === activeMap.id),
    [activeMap.id, store.connections],
  );
  const markerCountsByMap = useMemo(() => {
    const counts = new Map<string, number>();
    store.markers.forEach((marker) => counts.set(marker.mapId, (counts.get(marker.mapId) ?? 0) + 1));
    return counts;
  }, [store.markers]);
  const markerCountsByLayer = useMemo(() => {
    const counts = new Map<string, number>();
    mapMarkers.forEach((marker) => counts.set(marker.layerId, (counts.get(marker.layerId) ?? 0) + 1));
    return counts;
  }, [mapMarkers]);
  const markersById = useMemo(
    () => new Map(mapMarkers.map((marker) => [marker.id, marker])),
    [mapMarkers],
  );
  const deepLinkedMarkerId = mapMarkers.some(
    (marker) => marker.id === requestedMarkerId,
  )
    ? requestedMarkerId
    : null;
  const [panel, setPanel] = useState<"maps" | "layers">("maps");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MarkerCategory | "All">(
    "All",
  );
  const [eraYear, setEraYear] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [imageError, setImageError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let url: string | null = null;
    void Promise.resolve()
      .then(() => {
        setImageUrl(null);
        setImageName("");
        setSelectedId(deepLinkedMarkerId);
        setPlacing(false);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        return loadMapImage(activeMap.id);
      })
      .then((blob) => {
        if (blob) {
          url = URL.createObjectURL(blob);
          setImageUrl(url);
          setImageName(activeMap.name);
        }
      })
      .catch(() => setImageError(t("map.imageLoadError")));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [activeMap.id, activeMap.name, deepLinkedMarkerId, t]);

  const visibleLayerIds = useMemo(
    () => new Set(mapLayers.filter((layer) => layer.visible).map((layer) => layer.id)),
    [mapLayers],
  );
  const visibleMarkers = useMemo(() => {
    const term = query.trim().toLowerCase();
    const year = eraYear === "" ? null : Number(eraYear);
    return mapMarkers.filter((marker) => {
      const matchesText =
        !term ||
        `${marker.title} ${marker.description} ${marker.category}`
          .toLowerCase()
          .includes(term);
      const matchesCategory =
        categoryFilter === "All" || marker.category === categoryFilter;
      const matchesEra =
        year === null ||
        ((marker.startYear === null || marker.startYear <= year) &&
          (marker.endYear === null || marker.endYear >= year));
      return (
        visibleLayerIds.has(marker.layerId) &&
        matchesText &&
        matchesCategory &&
        matchesEra
      );
    });
  }, [categoryFilter, eraYear, mapMarkers, query, visibleLayerIds]);
  const visibleIds = useMemo(
    () => new Set(visibleMarkers.map((marker) => marker.id)),
    [visibleMarkers],
  );
  const visibleConnections = useMemo(
    () => mapConnections.flatMap((connection) => {
      if (!visibleIds.has(connection.fromMarkerId) || !visibleIds.has(connection.toMarkerId)) return [];
      const from = markersById.get(connection.fromMarkerId);
      const to = markersById.get(connection.toMarkerId);
      return from && to ? [{ connection, from, to }] : [];
    }),
    [mapConnections, markersById, visibleIds],
  );

  function resetView() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }
  function setZoomSafe(value: number) {
    const next = Math.min(3, Math.max(0.75, value));
    setZoom(next);
    if (next === 1) setOffset({ x: 0, y: 0 });
  }
  async function createMap() {
    const name = await dialog.prompt({ message: t("map.namePrompt"), confirmLabel: t("common.create") });
    if (!name?.trim()) return;
    const scale = await dialog.prompt({ message: `${t("map.scalePrompt")}: ${scales.map((value) => t(`map.scale.${value}`)).join(", ")}`, defaultValue: "Region" }) as MapScale | null;
    store.createMap(
      name.trim(),
      scale && scales.includes(scale) ? scale : "Other",
    );
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
      setImageError(t("map.imageSizeError"));
      return;
    }
    const activeWorldId = useWorldRegistryStore.getState().activeWorldId;
    let mapId = activeMap.id;
    if (await isMapImageReferencedByStoredWorld(mapId, activeWorldId)) {
      const nextMapId = typeof crypto !== "undefined" && crypto.randomUUID
        ? `map-${crypto.randomUUID()}`
        : `map-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      await saveMapImage(nextMapId, file);
      useMapStore.setState((state) => ({
        maps: state.maps.map((map) => map.id === mapId ? { ...map, id: nextMapId } : map),
        activeMapId: state.activeMapId === mapId ? nextMapId : state.activeMapId,
        layers: state.layers.map((layer) => layer.mapId === mapId ? { ...layer, mapId: nextMapId } : layer),
        markers: state.markers.map((marker) => marker.mapId === mapId ? { ...marker, mapId: nextMapId } : marker),
        connections: state.connections.map((connection) => connection.mapId === mapId ? { ...connection, mapId: nextMapId } : connection),
      }));
      mapId = nextMapId;
    } else {
      await saveMapImage(mapId, file);
    }
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    setImageName(file.name);
    setImageError("");
    resetView();
  }
  async function deleteActiveMap() {
    if (
      store.maps.length === 1 ||
      !await dialog.confirm({ message: t("map.deleteMapConfirm", { name: activeMap.name }), danger: true, confirmLabel: t("common.delete") })
    )
      return;
    const activeWorldId = useWorldRegistryStore.getState().activeWorldId;
    if (!await isMapImageReferencedByStoredWorld(activeMap.id, activeWorldId)) {
      await removeMapImage(activeMap.id);
    }
    store.deleteMap(activeMap.id);
  }
  function placeMarker(event: React.MouseEvent<HTMLDivElement>) {
    if (!placing || !viewportRef.current || !imageUrl) return;
    const bounds = viewportRef.current.getBoundingClientRect();
    const x =
      ((event.clientX - bounds.left - offset.x) / zoom / bounds.width) * 100;
    const y =
      ((event.clientY - bounds.top - offset.y) / zoom / bounds.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;
    const id = store.addMarker({
      mapId: activeMap.id,
      layerId:
        mapLayers[0]?.id ?? store.addLayer(activeMap.id, t("map.placesLayer")),
      entryIds: [],
      title: t("map.untitledPlace"),
      description: "",
      category: "Settlement",
      x,
      y,
      color: colors[mapMarkers.length % colors.length],
      size: "Medium",
      startYear: null,
      endYear: null,
    });
    setSelectedId(id);
    setPlacing(false);
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (placing || !imageUrl) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || zoom <= 1) return;
    setOffset({
      x: dragRef.current.ox + event.clientX - dragRef.current.x,
      y: dragRef.current.oy + event.clientY - dragRef.current.y,
    });
  }
  function wheel(event: WheelEvent<HTMLDivElement>) {
    if (!imageUrl) return;
    event.preventDefault();
    setZoomSafe(zoom + (event.deltaY < 0 ? 0.15 : -0.15));
  }
  return (
    <MotionPage className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={upload}
        className="hidden"
      />
      <div className="ws-workbench flex-wrap">
        <div className="min-w-0">
          <p className="ws-workbench-name truncate">{activeMap.name}</p>
          <p className="ws-workbench-meta mt-0.5">
            {t(`map.scale.${activeMap.scale}`)} · {mapMarkers.length}{" "}
            {t("map.markers")} · {mapConnections.length}{" "}
            {t("map.connectionsWord")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="ws-input flex h-11 items-center gap-2 rounded-full px-4 text-sm">
            <span className="text-[var(--text-faint)]">{t("map.era")}</span>
            <input
              type="number"
              value={eraYear}
              onChange={(event) => setEraYear(event.target.value)}
              placeholder={t("map.anyYear")}
              className="w-24 bg-transparent outline-none"
            />
          </label>
          {imageUrl ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="ws-button-secondary flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"
            >
              <ImageUp size={16} />
              {t("map.replace")}
            </button>
          ) : null}
          {imageUrl ? (
            <button
              type="button"
              onClick={() => setPlacing(!placing)}
              className="ws-button-primary flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold"
            >
              {placing ? <X size={16} /> : <MapPin size={16} />}
              {placing ? t("map.cancel") : t("map.placeMarker")}
            </button>
          ) : null}
        </div>
      </div>
      {placing ? (
        <div className="rounded-[1.2rem] border border-[var(--border-strong)] bg-[var(--accent-soft)] px-4 py-3 text-sm">
          {t("map.placeHint")}
        </div>
      ) : null}
      {imageError ? (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {imageError}
        </div>
      ) : null}

      <section className="grid min-h-[640px] gap-4 xl:grid-cols-[19rem_minmax(0,1fr)_20rem]">
        <aside className="ws-compact-surface flex min-h-0 flex-col p-4">
          <div role="tablist" className="grid grid-cols-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] p-1">
            <button
              type="button"
              role="tab"
              aria-selected={panel === "maps"}
              onClick={() => setPanel("maps")}
              className={`rounded-full py-2 text-xs font-semibold ${panel === "maps" ? "bg-[var(--surface-raised)] shadow" : "text-[var(--text-muted)]"}`}
            >
              {t("map.maps")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={panel === "layers"}
              onClick={() => setPanel("layers")}
              className={`rounded-full py-2 text-xs font-semibold ${panel === "layers" ? "bg-[var(--surface-raised)] shadow" : "text-[var(--text-muted)]"}`}
            >
              {t("map.layers")}
            </button>
          </div>
          {panel === "maps" ? (
            <>
              <div className="mt-4 flex items-center justify-between px-1">
                <span className="text-[.68rem] font-bold uppercase tracking-[.18em] text-[var(--text-faint)]">
                  {t("map.worldAtlas")}
                </span>
                <button
                  type="button"
                  onClick={createMap}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"
                  aria-label={t("map.newMap")}
                  title={t("map.newMap")}
                >
                  <Plus size={15} />
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {store.maps.map((map) => (
                  <button
                    key={map.id}
                    onClick={() => store.setActiveMap(map.id)}
                    className={`flex w-full items-center gap-3 rounded-[1.15rem] border px-4 py-3.5 text-left ${map.id === activeMap.id ? "border-[var(--border-strong)] bg-[var(--accent-soft)]" : "border-transparent hover:bg-[var(--surface-muted)]"}`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)]">
                      <FileImage size={18} />
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {map.name}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--text-faint)]">
                        {t(`map.scale.${map.scale}`)} ·{" "}
                        {markerCountsByMap.get(map.id) ?? 0}{" "}
                        {t("map.markers")}
                      </span>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
              <button
                onClick={deleteActiveMap}
                disabled={store.maps.length === 1}
                className="mt-auto flex items-center gap-2 px-2 pt-4 text-xs font-semibold text-[var(--text-faint)] hover:text-red-500"
              >
                <Trash2 size={14} />
                {t("map.deleteCurrent")}
              </button>
            </>
          ) : (
            <>
              <div className="mt-4 flex items-center justify-between px-1">
                <span className="text-[.68rem] font-bold uppercase tracking-[.18em] text-[var(--text-faint)]">
                  {t("map.visibleLayers")}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    const name = await dialog.prompt({ message: t("map.layerName"), confirmLabel: t("common.create") });
                    if (name) store.addLayer(activeMap.id, name);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"
                  aria-label={t("map.layerName")}
                  title={t("map.layerName")}
                >
                  <Plus size={15} />
                </button>
              </div>
              <div className="mt-2 space-y-1">
                {mapLayers.map((layer, index) => (
                  <div
                    key={layer.id}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left hover:bg-[var(--surface-muted)]"
                  >
                    <button type="button" onClick={() => store.toggleLayer(layer.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    {layer.visible ? (
                      <Eye size={16} />
                    ) : (
                      <EyeOff size={16} className="text-[var(--text-faint)]" />
                    )}
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: layer.color }}
                    />
                    <span className="flex-1 text-sm font-medium">
                      {layer.name}
                    </span>
                    <span className="text-xs text-[var(--text-faint)]">
                      {markerCountsByLayer.get(layer.id) ?? 0}
                    </span>
                    </button>
                    <span className="flex shrink-0">
                      <button type="button" disabled={index === 0} onClick={() => store.moveLayer(layer.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--surface-raised)] disabled:opacity-25" aria-label={t("map.moveLayerUp")}><ChevronUp size={13} /></button>
                      <button type="button" disabled={index === mapLayers.length - 1} onClick={() => store.moveLayer(layer.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--surface-raised)] disabled:opacity-25" aria-label={t("map.moveLayerDown")}><ChevronDown size={13} /></button>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <label className="ws-input flex h-10 items-center gap-2 rounded-full px-3">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("map.search")}
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              />
            </label>
            <SelectMenu
              value={categoryFilter}
              onChange={(value) => setCategoryFilter(value as MarkerCategory | "All")}
              ariaLabel={t("map.category")}
              className="mt-2 h-10 w-full"
              buttonClassName="rounded-full px-3 text-xs"
              options={[{ value: "All", label: t("type.All") }, ...categories.map((category) => ({ value: category, label: t(`map.category.${category}`) }))]}
            />
          </div>
        </aside>

        <div
          ref={viewportRef}
          onClick={placeMarker}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onWheel={wheel}
          className={`ws-viewport min-h-[560px] bg-[var(--surface-solid)] touch-none ${placing ? "cursor-crosshair" : zoom > 1 ? "cursor-grab" : ""}`}
        >
          {!imageUrl ? (
            <div className="ws-empty-state flex h-full min-h-[560px] flex-col items-center justify-center">
              <h3 className="text-base font-semibold">
                {t("map.addArtwork")}
              </h3>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="ws-button-primary mt-6 flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold"
              >
                <Upload size={17} />
                {t("map.uploadImage")}
              </button>
            </div>
          ) : (
            <div
              className="absolute inset-0 origin-top-left"
              style={{
                transform: `translate(${offset.x}px,${offset.y}px) scale(${zoom})`,
              }}
            >
              <img
                src={imageUrl}
                alt={activeMap.name}
                draggable={false}
                className="h-full w-full select-none object-fill"
              />
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {visibleConnections.map(({ connection, from: a, to: b }) => {
                    return (
                      <g key={connection.id}>
                        <line
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke={connection.color}
                          strokeWidth=".55"
                          strokeDasharray={
                            connection.dashed ? "2 1.5" : undefined
                          }
                          vectorEffect="non-scaling-stroke"
                        />
                        <text
                          x={(a.x + b.x) / 2}
                          y={(a.y + b.y) / 2}
                          fontSize="2.2"
                          textAnchor="middle"
                          fill={connection.color}
                          stroke="white"
                          strokeWidth=".5"
                          paintOrder="stroke"
                        >
                          {connection.label}
                        </text>
                      </g>
                    );
                  })}
              </svg>
              {visibleMarkers.map((marker) => (
                <button
                  key={marker.id}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedId(marker.id);
                  }}
                  className="group absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                >
                  <span
                    className={`flex items-center justify-center rounded-full border-2 border-white font-bold text-white shadow-lg ${marker.size === "Small" ? "h-7 w-7 text-xs" : marker.size === "Large" ? "h-12 w-12 text-xl" : "h-9 w-9 text-sm"}`}
                    style={{
                      background: marker.color,
                      outline:
                        selectedId === marker.id
                          ? `3px solid ${marker.color}66`
                          : undefined,
                    }}
                  >
                    {categoryGlyph[marker.category]}
                  </span>
                  <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-black/75 px-2 py-1 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100">
                    {marker.title} · {marker.category}
                  </span>
                </button>
              ))}
            </div>
          )}
          {imageUrl ? (
            <>
              <div className="ws-floating-control absolute bottom-4 right-4 flex overflow-hidden rounded-full">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomSafe(zoom - 0.2);
                  }}
                  className="h-10 w-10"
                  aria-label={t("canvas.zoomOut")}
                  title={t("canvas.zoomOut")}
                >
                  <Minus size={16} className="m-auto" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetView();
                  }}
                  className="border-x border-[var(--border)] px-3 text-xs font-semibold"
                  aria-label={`${Math.round(zoom * 100)}%`}
                  title={`${Math.round(zoom * 100)}%`}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomSafe(zoom + 0.2);
                  }}
                  className="h-10 w-10"
                  aria-label={t("canvas.zoomIn")}
                  title={t("canvas.zoomIn")}
                >
                  <Plus size={16} className="m-auto" />
                </button>
              </div>
              <span className="absolute bottom-4 left-4 rounded-full bg-[var(--surface-solid)] px-3 py-1.5 text-xs shadow">
                {imageName}
              </span>
            </>
          ) : null}
        </div>

        <MapMarkerPanel
          selectedId={selectedId}
          clearSelection={() => setSelectedId(null)}
        />
      </section>
    </MotionPage>
  );
}
