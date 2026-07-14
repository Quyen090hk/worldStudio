import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import cytoscape, {
  type Core,
  type LayoutOptions,
  type NodeSingular,
  type StylesheetJson,
} from "cytoscape";
import fcose from "cytoscape-fcose";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Focus,
  GitBranch,
  Maximize2,
  Network,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MotionPage } from "../../shared/components/MotionPage";
import { useI18n } from "../../shared/i18n";
import { useTheme, type ResolvedTheme } from "../../shared/theme/ThemeContext";
import { useEntryStore } from "../entries/stores/useEntryStore";
import type { Entry } from "../entries/types";
import {
  ENTRY_TYPES,
  projectGraph,
  TYPE_COLORS,
  type GraphGroup,
} from "./graphModel";
import {
  attachDragPhysics,
  type DragPhysicsController,
  type GraphPhysicsOptions,
} from "./graphPhysics";
import { createGraphSync, type GraphSyncController } from "./graphSync";
import { inverseFor, RELATIONSHIP_TYPES } from "./relationshipMeta";
import {
  useGraphSettingsStore,
  type GraphSettingsStore,
} from "./stores/useGraphSettingsStore";
import { useRelationshipStore } from "./stores/useRelationshipStore";
import type {
  EntryRelationship,
  RelationshipDirection,
  RelationshipStatus,
  RelationshipType,
} from "./types";

cytoscape.use(fcose);

function createGraphStyles(theme: ResolvedTheme): StylesheetJson {
  const dark = theme === "dark";
  const labelColor = dark ? "#ded9ce" : "#30291e";
  const outlineColor = dark ? "#080809" : "#f3ead9";
  const selectedColor = dark ? "#f4e9cc" : "#251b0d";
  return [
    {
      selector: "node",
      style: {
        width: "mapData(size, 7, 15, 5, 11)",
        height: "mapData(size, 7, 15, 5, 11)",
        "background-color": "data(color)",
        "border-width": 1,
        "border-color": "data(color)",
        label: "data(label)",
        color: labelColor,
        "font-family": "IBM Plex Sans",
        "font-size": 7.5,
        "font-weight": "normal",
        "text-opacity": (node: NodeSingular) =>
          Number(node.data("labelOpacity") ?? 1),
        "text-valign": "bottom",
        "text-margin-y": 5,
        "text-outline-color": outlineColor,
        "text-outline-width": 2,
        "text-outline-opacity": 0.88,
        "overlay-opacity": 0,
        "transition-property":
          "width, height, opacity, background-color, border-color, border-width, text-opacity, underlay-opacity",
        "transition-duration": 0.18,
      },
    },
    {
      selector: "node.hovered",
      style: {
        width: 13,
        height: 13,
        "border-width": 2,
        "border-color": selectedColor,
        "underlay-color": "data(color)",
        "underlay-opacity": 0.16,
        "underlay-padding": 7,
        "font-size": 8.5,
        "font-weight": "bold",
        "text-opacity": 1,
        "z-index": 20,
      },
    },
    {
      selector: "node:selected",
      style: {
        width: 14,
        height: 14,
        "border-width": 2.5,
        "border-color": selectedColor,
        "underlay-color": "data(color)",
        "underlay-opacity": 0.2,
        "underlay-padding": 9,
        "font-size": 8.5,
        "font-weight": "bold",
        "text-opacity": 1,
        "z-index": 30,
      },
    },
    {
      selector: "node.focus",
      style: {
        width: 15,
        height: 15,
        "border-width": 2.5,
        "border-color": selectedColor,
      },
    },
    {
      selector: "edge",
      style: {
        width: "mapData(width, 0.7, 3, 0.55, 2)",
        "line-color": "data(color)",
        "target-arrow-color": "data(color)",
        "curve-style": "bezier",
        "target-arrow-shape": "none",
        opacity: 0.26,
        label: "",
        "overlay-opacity": 0,
        "transition-property": "opacity, width",
        "transition-duration": 0.18,
      },
    },
    {
      selector: "edge.directed",
      style: { "target-arrow-shape": "triangle" },
    },
    { selector: "edge.dashed", style: { "line-style": "dashed" } },
    {
      selector: "edge:selected",
      style: {
        width: 1.8,
        opacity: 0.9,
        label: "data(label)",
        color: labelColor,
        "font-size": 7.5,
        "text-background-color": outlineColor,
        "text-background-opacity": 0.86,
        "text-background-padding": "3px",
      },
    },
    { selector: ".faded", style: { opacity: 0.1 } },
    { selector: ".entering, .exiting", style: { opacity: 0 } },
  ];
}

function fitGraph(graph: Core) {
  graph.resize();
  graph.fit(undefined, 110);
  if (graph.zoom() > 1.08) {
    graph.zoom(1.08);
    graph.center();
  }
}

function updateLabelVisibility(graph: Core) {
  // Use rendered scale rather than a manual display control. Smoothstep avoids
  // labels popping abruptly as the user crosses the visibility threshold.
  const lowerZoom = 0.38;
  const upperZoom = 0.78;
  const progress = Math.max(
    0,
    Math.min(1, (graph.zoom() - lowerZoom) / (upperZoom - lowerZoom)),
  );
  const opacity = progress * progress * (3 - 2 * progress);
  graph.nodes().data("labelOpacity", opacity);
}

export function GraphPage() {
  const { resolvedTheme } = useTheme();
  const { t } = useI18n();
  const entries = useEntryStore((state) => state.entries);
  const relationships = useRelationshipStore((state) => state.relationships);
  const createRelationship = useRelationshipStore(
    (state) => state.createRelationship,
  );
  const deleteRelationship = useRelationshipStore(
    (state) => state.deleteRelationship,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Core | null>(null);
  const physicsControllerRef = useRef<DragPhysicsController | null>(null);
  const graphSyncRef = useRef<GraphSyncController | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedFocusId = searchParams.get("focus");
  const requestedMode = searchParams.get("mode");
  const initialFocusId =
    requestedFocusId && entries.some((entry) => entry.id === requestedFocusId)
      ? requestedFocusId
      : (entries[0]?.id ?? null);
  const [mode, setMode] = useState<"global" | "local">(
    requestedMode === "local" && initialFocusId === requestedFocusId
      ? "local"
      : "global",
  );
  const [focusId, setFocusId] = useState<string | null>(initialFocusId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<
    string | null
  >(null);
  const [depth, setDepth] = useState(1);
  const [query, setQuery] = useState("");
  const [eraYear, setEraYear] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [relationType, setRelationType] =
    useState<RelationshipType>("Allied with");
  const [direction, setDirection] = useState<RelationshipDirection>("mutual");
  const [status, setStatus] = useState<RelationshipStatus>("current");

  const graphSettings = useGraphSettingsStore();
  const {
    visibleTypes,
    showSecrets,
    showOrphans,
    groups,
    nodeRepulsion,
    linkDistance,
    linkElasticity,
    centerGravity,
    animationDuration,
  } = graphSettings;
  const physicsOptionsRef = useRef<GraphPhysicsOptions>({
    centerForce: centerGravity,
    repelForce: nodeRepulsion,
    linkForce: linkElasticity,
    linkDistance,
  });
  const themeRef = useRef(resolvedTheme);
  const animationDurationRef = useRef(animationDuration);

  useEffect(() => {
    animationDurationRef.current = animationDuration;
  }, [animationDuration]);

  const year = eraYear === "" ? null : Number(eraYear);
  const projection = useMemo(
    () =>
      projectGraph(entries, relationships, {
        mode,
        focusId,
        depth,
        query,
        visibleTypes,
        showSecrets,
        showOrphans,
        year,
        groups,
      }),
    [
      entries,
      relationships,
      mode,
      focusId,
      depth,
      query,
      visibleTypes,
      showSecrets,
      showOrphans,
      year,
      groups,
    ],
  );
  const visibleEntries = projection.entries;
  const visibleRelationships = projection.relationships;
  const projectionRef = useRef(projection);
  const modeRef = useRef(mode);
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;
  const selectedRelationship =
    relationships.find(
      (relationship) => relationship.id === selectedRelationshipId,
    ) ?? null;
  const selectedRelations = selected
    ? relationships.filter(
        (relationship) =>
          relationship.sourceEntryId === selected.id ||
          relationship.targetEntryId === selected.id,
      )
    : [];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const initialProjection = projectionRef.current;
    const initialMode = modeRef.current;
    const graph = cytoscape({
      container,
      elements: initialProjection.elements,
      style: createGraphStyles(themeRef.current),
      layout: { name: "grid", padding: 80 },
      minZoom: 0.08,
      maxZoom: 5,
      wheelSensitivity: 4,
      boxSelectionEnabled: true,
      textureOnViewport: initialProjection.entries.length > 800,
      hideEdgesOnViewport: initialProjection.entries.length > 1500,
      motionBlur: initialProjection.entries.length < 1000,
    });
    graph.on("mouseover", "node", (event) => {
      event.target.addClass("hovered");
      if (!graph.$(":selected").length) {
        graph.elements().addClass("faded");
        event.target.closedNeighborhood().removeClass("faded");
      }
    });
    graph.on("mouseout", "node", (event) => {
      event.target.removeClass("hovered");
      if (!graph.$(":selected").length) graph.elements().removeClass("faded");
    });
    graph.on("zoom", () => updateLabelVisibility(graph));
    graph.on("tap", "node", (event) => {
      const node = event.target;
      graph.elements().addClass("faded");
      node.closedNeighborhood().removeClass("faded");
      setSelectedId(node.id());
      setSelectedRelationshipId(null);
    });
    graph.on("tap", "edge", (event) => {
      graph.elements().removeClass("faded");
      setSelectedRelationshipId(event.target.id());
      setSelectedId(null);
    });
    graph.on("tap", (event) => {
      if (event.target === graph) {
        graph.elements().removeClass("faded");
        setSelectedId(null);
        setSelectedRelationshipId(null);
      }
    });
    graphRef.current = graph;
    const graphSync = createGraphSync(graph, () =>
      physicsControllerRef.current?.wake(),
    );
    graphSyncRef.current = graphSync;
    let physicsController: DragPhysicsController | null = null;
    const frame = window.requestAnimationFrame(() => {
      graph.resize();
      const initialLayout = graph.layout(
        (initialMode === "local"
          ? { name: "concentric", animate: false, padding: 100 }
          : {
              name: "fcose",
              quality:
                initialProjection.entries.length > 1200 ? "draft" : "default",
              randomize: true,
              animate: initialProjection.entries.length < 1400,
              animationDuration: animationDurationRef.current,
              animationEasing: "ease-out",
              fit: true,
              padding: 100,
              nodeRepulsion: () => physicsOptionsRef.current.repelForce,
              idealEdgeLength: () => physicsOptionsRef.current.linkDistance,
              edgeElasticity: () => physicsOptionsRef.current.linkForce,
              gravity: physicsOptionsRef.current.centerForce,
              numIter: initialProjection.entries.length > 1200 ? 1000 : 2500,
              tile: true,
              tilingPaddingVertical: 22,
              tilingPaddingHorizontal: 22,
            }) as unknown as LayoutOptions,
      );
      graph.one("layoutstop", () => {
        if (graph.destroyed()) return;
        fitGraph(graph);
        updateLabelVisibility(graph);
        physicsController = attachDragPhysics(
          graph,
          () => physicsOptionsRef.current,
        );
        physicsControllerRef.current = physicsController;
      });
      initialLayout.run();
    });
    const observer = new ResizeObserver(() => graph.resize());
    observer.observe(container);
    return () => {
      window.cancelAnimationFrame(frame);
      physicsController?.destroy();
      if (physicsControllerRef.current === physicsController) {
        physicsControllerRef.current = null;
      }
      graphSync.destroy();
      if (graphSyncRef.current === graphSync) graphSyncRef.current = null;
      observer.disconnect();
      graph.destroy();
      graphRef.current = null;
    };
  }, []);

  useEffect(() => {
    graphSyncRef.current?.sync(projection.elements);
  }, [projection]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.style(createGraphStyles(resolvedTheme));
    updateLabelVisibility(graph);
  }, [resolvedTheme]);

  useEffect(() => {
    // Force changes update the running simulation in place. No renderer, graph,
    // layout, or node position is recreated here.
    physicsOptionsRef.current = {
      centerForce: centerGravity,
      repelForce: nodeRepulsion,
      linkForce: linkElasticity,
      linkDistance,
    };
    physicsControllerRef.current?.wake();
  }, [nodeRepulsion, linkDistance, linkElasticity, centerGravity]);

  function addRelationship() {
    if (!selected || !targetId || selected.id === targetId) return;
    createRelationship({
      sourceEntryId: selected.id,
      targetEntryId: targetId,
      type: relationType,
      inverseLabel: inverseFor(relationType),
      direction,
      strength: null,
      status,
      startYear: year,
      endYear: null,
      description: "",
      tags: [],
    });
    setTargetId("");
  }
  function arrange() {
    graphRef.current
      ?.layout(
        (mode === "local"
          ? {
              name: "concentric",
              animate: true,
              animationDuration,
              padding: 100,
              fit: false,
            }
          : {
              name: "fcose",
              quality: visibleEntries.length > 1200 ? "draft" : "default",
              randomize: false,
              animate: true,
              animationDuration,
              fit: false,
              padding: 100,
              nodeRepulsion: () => nodeRepulsion,
              idealEdgeLength: () => linkDistance,
              edgeElasticity: () => linkElasticity,
              gravity: centerGravity,
              numIter: 1800,
              tile: true,
            }) as unknown as LayoutOptions,
      )
      .run();
  }
  function previewPhysics(patch: Partial<GraphPhysicsOptions>) {
    physicsOptionsRef.current = { ...physicsOptionsRef.current, ...patch };
    physicsControllerRef.current?.wake();
  }
  function previewAnimationDuration(value: number) {
    animationDurationRef.current = value;
  }
  function handleGraphKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const graph = graphRef.current;
    if (!graph) return;
    if (event.key === "+" || event.key === "=")
      graph.zoom({
        level: graph.zoom() * 1.2,
        renderedPosition: { x: graph.width() / 2, y: graph.height() / 2 },
      });
    else if (event.key === "-")
      graph.zoom({
        level: graph.zoom() * 0.8,
        renderedPosition: { x: graph.width() / 2, y: graph.height() / 2 },
      });
    else if (
      ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    ) {
      const distance = event.shiftKey ? 80 : 25;
      const x =
        event.key === "ArrowLeft"
          ? distance
          : event.key === "ArrowRight"
            ? -distance
            : 0;
      const y =
        event.key === "ArrowUp"
          ? distance
          : event.key === "ArrowDown"
            ? -distance
            : 0;
      graph.panBy({ x, y });
    } else return;
    event.preventDefault();
  }

  return (
    <MotionPage className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="ws-eyebrow">{t("graph.eyebrow")}</p>
          <h2 className="mt-1 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">
          {t("nav.graph")}
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>{visibleEntries.length} {t("graph.notes")}</span>
          <span>·</span>
          <span>{visibleRelationships.length} {t("graph.links")}</span>
        </div>
      </header>
      <section className="relative h-[calc(100vh-12.5rem)] min-h-[680px] overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-raised)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, var(--border-strong) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleGraphKeyDown}
          aria-label={t("graph.aria")}
          className="absolute inset-0 h-full w-full outline-none"
        />

        <div className="absolute left-3 right-3 top-3 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPanelOpen(!panelOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_94%,transparent)] text-[var(--text-muted)] shadow-lg backdrop-blur hover:bg-[var(--surface-raised)]"
            aria-label={t("graph.toggleControls")}
            title={t("graph.toggleControls")}
            aria-expanded={panelOpen}
          >
            <Settings2 size={16} />
          </button>
          <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_94%,transparent)] px-3 text-[var(--text-muted)] shadow-lg backdrop-blur sm:max-w-56">
            <Search size={14} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("graph.search")}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--text-faint)]"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--surface-muted)]"
                aria-label={t("entries.clearSearch")}
                title={t("entries.clearSearch")}
              >
                <X size={13} />
              </button>
            ) : null}
          </label>
        </div>

        {panelOpen ? (
          <GraphControls
            mode={mode}
            setMode={setMode}
            focusId={focusId}
            setFocusId={setFocusId}
            entries={entries}
            depth={depth}
            setDepth={setDepth}
            eraYear={eraYear}
            setEraYear={setEraYear}
            settings={graphSettings}
            previewPhysics={previewPhysics}
            previewAnimationDuration={previewAnimationDuration}
          />
        ) : null}

        {selected ? (
          <NodePanel
            entry={selected}
            relationships={selectedRelations}
            entries={entries}
            targetId={targetId}
            setTargetId={setTargetId}
            relationType={relationType}
            setRelationType={setRelationType}
            direction={direction}
            setDirection={setDirection}
            status={status}
            setStatus={setStatus}
            addRelationship={addRelationship}
            deleteRelationship={deleteRelationship}
            close={() => {
              setSelectedId(null);
              graphRef.current?.elements().removeClass("faded");
            }}
            focus={() => {
              setFocusId(selected.id);
              setMode("local");
            }}
            open={() => navigate(`/entries/${selected.id}`)}
          />
        ) : null}
        {selectedRelationship ? (
          <RelationshipPanel
            relationship={selectedRelationship}
            entries={entries}
            close={() => setSelectedRelationshipId(null)}
            remove={() => {
              deleteRelationship(selectedRelationship.id);
              setSelectedRelationshipId(null);
            }}
          />
        ) : null}

        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center overflow-hidden rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_94%,transparent)] text-[var(--text-muted)] shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={() => {
              if (graphRef.current) fitGraph(graphRef.current);
            }}
            className="flex h-9 items-center gap-2 px-3 text-xs hover:bg-[var(--surface-muted)]"
          >
            <Maximize2 size={14} />
            {t("graph.fit")}
          </button>
          <button
            type="button"
            onClick={arrange}
            className="flex h-9 items-center gap-2 border-l border-[var(--border)] px-3 text-xs hover:bg-[var(--surface-muted)]"
          >
            <RefreshCw size={14} />
            {t("graph.stabilize")}
          </button>
        </div>
      </section>
    </MotionPage>
  );
}

type ControlsProps = {
  mode: "global" | "local";
  setMode: (mode: "global" | "local") => void;
  focusId: string | null;
  setFocusId: (id: string) => void;
  entries: Entry[];
  depth: number;
  setDepth: (value: number) => void;
  eraYear: string;
  setEraYear: (value: string) => void;
  settings: GraphSettingsStore;
  previewPhysics: (patch: Partial<GraphPhysicsOptions>) => void;
  previewAnimationDuration: (value: number) => void;
};
function GraphControls(props: ControlsProps) {
  const settings = props.settings;
  const { t } = useI18n();
  return (
    <aside className="ws-popover-enter absolute left-3 top-14 z-20 max-h-[calc(100%-4.5rem)] w-[min(18rem,calc(100%-1.5rem))] overflow-y-auto rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_96%,transparent)] text-[var(--text)] shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <span className="text-xs font-semibold">{t("graph.settings")}</span>
        <button
          type="button"
          onClick={settings.reset}
          className="text-[10px] text-[var(--text-faint)] hover:text-[var(--text)]"
        >
          {t("graph.restore")}
        </button>
      </div>
      <details open className="border-b border-[var(--border)]">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-semibold">
          <ChevronDown size={13} />
          {t("graph.filters")}
        </summary>
        <div className="space-y-3 px-4 pb-4">
          <div className="grid grid-cols-2 rounded-lg bg-[var(--surface-muted)] p-1">
            <button
              type="button"
              onClick={() => props.setMode("global")}
              className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs ${props.mode === "global" ? "bg-[var(--surface-raised)] text-[var(--text)] shadow" : "text-[var(--text-faint)]"}`}
            >
              <Network size={13} />
              {t("graph.global")}
            </button>
            <button
              type="button"
              onClick={() => props.setMode("local")}
              className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs ${props.mode === "local" ? "bg-[var(--surface-raised)] text-[var(--text)] shadow" : "text-[var(--text-faint)]"}`}
            >
              <Focus size={13} />
              {t("graph.local")}
            </button>
          </div>
          {props.mode === "local" ? (
            <>
              <select
                value={props.focusId ?? ""}
                onChange={(event) => props.setFocusId(event.target.value)}
                className="ws-input h-9 w-full rounded-md px-2 text-xs outline-none"
              >
                {props.entries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </select>
              <Range
                label={t("graph.depth")}
                value={props.depth}
                min={1}
                max={3}
                setValue={props.setDepth}
              />
            </>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-[10px] text-[var(--text-faint)]">
              {t("graph.historicalYear")}
            </span>
            <input
              type="number"
              value={props.eraYear}
              onChange={(event) => props.setEraYear(event.target.value)}
              placeholder={t("graph.anyEra")}
              className="ws-input h-9 w-full rounded-md px-2 text-xs outline-none"
            />
          </label>
          <Toggle
            label={t("graph.orphans")}
            value={settings.showOrphans}
            setValue={(showOrphans) => settings.patch({ showOrphans })}
          />
          <Toggle
            label={t("graph.authorSecrets")}
            value={settings.showSecrets}
            setValue={(showSecrets) => settings.patch({ showSecrets })}
          />
          <div className="space-y-1 pt-1">
            {ENTRY_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => settings.toggleType(type)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-xs hover:bg-[var(--surface-muted)]"
              >
                {settings.visibleTypes.includes(type) ? (
                  <Eye size={13} />
                ) : (
                  <EyeOff size={13} className="text-[var(--text-faint)]" />
                )}
                <span>{t(`type.${type}`)}</span>
              </button>
            ))}
          </div>
        </div>
      </details>
      <details className="border-b border-[var(--border)]">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-semibold">
          <ChevronDown size={13} />
          {t("graph.groups")}
        </summary>
        <div className="space-y-2 px-3 pb-3">
          {settings.groups.map((group) => (
            <GroupEditor
              key={group.id}
              group={group}
              update={(patch) => settings.updateGroup(group.id, patch)}
              remove={() => settings.removeGroup(group.id)}
            />
          ))}
          <button
            type="button"
            onClick={settings.addGroup}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[var(--border-strong)] py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
          >
            <Plus size={13} />
            {t("graph.newGroup")}
          </button>
        </div>
      </details>
      <details>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-semibold">
          <ChevronDown size={13} />
          {t("graph.forces")}
        </summary>
        <div className="space-y-4 px-4 pb-4">
          <DeferredRange
            label={t("graph.centerForce")}
            value={settings.centerGravity}
            min={0}
            max={2}
            step={0.005}
            precision={3}
            previewValue={(centerForce) =>
              props.previewPhysics({ centerForce })
            }
            setValue={(centerGravity) => settings.patch({ centerGravity })}
          />
          <DeferredRange
            label={t("graph.repelForce")}
            value={settings.nodeRepulsion}
            min={0}
            max={100000}
            step={100}
            previewValue={(repelForce) => props.previewPhysics({ repelForce })}
            setValue={(nodeRepulsion) => settings.patch({ nodeRepulsion })}
          />
          <DeferredRange
            label={t("graph.linkForce")}
            value={settings.linkElasticity}
            min={0.01}
            max={4}
            step={0.01}
            precision={2}
            previewValue={(linkForce) => props.previewPhysics({ linkForce })}
            setValue={(linkElasticity) => settings.patch({ linkElasticity })}
          />
          <DeferredRange
            label={t("graph.linkDistance")}
            value={settings.linkDistance}
            min={10}
            max={600}
            step={1}
            previewValue={(linkDistance) =>
              props.previewPhysics({ linkDistance })
            }
            setValue={(linkDistance) => settings.patch({ linkDistance })}
          />
          <DeferredRange
            label={t("graph.animationDuration")}
            value={settings.animationDuration}
            min={50}
            max={5000}
            step={10}
            previewValue={props.previewAnimationDuration}
            setValue={(animationDuration) =>
              settings.patch({ animationDuration })
            }
          />
        </div>
      </details>
    </aside>
  );
}

function GroupEditor({
  group,
  update,
  remove,
}: {
  group: GraphGroup;
  update: (patch: Partial<GraphGroup>) => void;
  remove: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 rounded-md bg-[var(--surface-muted)] p-2">
      <input
        type="color"
        value={group.color}
        onChange={(event) => update({ color: event.target.value })}
        className="h-6 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
        aria-label={t("graph.groupColor")}
      />
      <input
        value={group.query}
        onChange={(event) => update({ query: event.target.value })}
        placeholder={t("graph.groupPlaceholder")}
        className="min-w-0 flex-1 bg-transparent text-xs outline-none"
      />
      <button
        type="button"
        onClick={remove}
        className="text-[var(--text-faint)] hover:text-red-500"
        aria-label={t("graph.deleteGroup")}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function Toggle({
  label,
  value,
  setValue,
}: {
  label: string;
  value: boolean;
  setValue: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => setValue(!value)}
      className="flex w-full items-center justify-between rounded-md px-2 py-2 text-xs hover:bg-[var(--surface-muted)]"
    >
      <span>{label}</span>
      <span
        className={`relative h-4 w-7 rounded-full transition ${value ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"}`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-[var(--surface-raised)] shadow transition ${value ? "left-3.5" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
function Range({
  label,
  value,
  min,
  max,
  step = 1,
  setValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  setValue: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-[10px] text-[var(--text-faint)]">
        <span>{label}</span>
        <span>{Number.isInteger(value) ? value : value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => setValue(Number(event.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}

function DeferredRange({
  label,
  value,
  min,
  max,
  step = 1,
  precision,
  previewValue,
  setValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  precision?: number;
  previewValue?: (value: number) => void;
  setValue: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);
  const interactingRef = useRef(false);

  useEffect(() => {
    if (interactingRef.current) return;
    draftRef.current = value;
    setDraft(value);
  }, [value]);

  function updateDraft(next: number) {
    draftRef.current = next;
    setDraft(next);
    previewValue?.(next);
  }

  function commit() {
    interactingRef.current = false;
    if (draftRef.current !== value) setValue(draftRef.current);
  }

  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-[10px] text-[var(--text-faint)]">
        <span>{label}</span>
        <span>
          {precision === undefined
            ? Number.isInteger(draft)
              ? draft
              : draft.toFixed(2)
            : draft.toFixed(precision)}
        </span>
      </span>
      <input
        type="range"
        value={draft}
        min={min}
        max={max}
        step={step}
        onPointerDown={() => {
          interactingRef.current = true;
        }}
        onChange={(event) => updateDraft(Number(event.target.value))}
        onPointerUp={commit}
        onPointerCancel={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  );
}

type NodePanelProps = {
  entry: Entry;
  relationships: EntryRelationship[];
  entries: Entry[];
  targetId: string;
  setTargetId: (id: string) => void;
  relationType: RelationshipType;
  setRelationType: (type: RelationshipType) => void;
  direction: RelationshipDirection;
  setDirection: (value: RelationshipDirection) => void;
  status: RelationshipStatus;
  setStatus: (value: RelationshipStatus) => void;
  addRelationship: () => void;
  deleteRelationship: (id: string) => void;
  close: () => void;
  focus: () => void;
  open: () => void;
};
function NodePanel(props: NodePanelProps) {
  const { t } = useI18n();
  return (
    <aside className="ws-panel-enter-right absolute bottom-3 left-3 right-3 top-3 z-20 overflow-y-auto rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_96%,transparent)] p-4 text-[var(--text)] shadow-2xl backdrop-blur-xl sm:left-auto sm:w-80">
      <div className="flex items-start gap-3">
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full"
          style={{ background: TYPE_COLORS[props.entry.type] }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-faint)]">
            {t(`type.${props.entry.type}`)}
          </p>
          <h3 className="mt-1 truncate text-lg font-semibold text-[var(--text)]">
            {props.entry.title}
          </h3>
        </div>
        <button
          type="button"
          onClick={props.close}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-faint)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
          aria-label={t("common.close")}
          title={t("common.close")}
        >
          <X size={16} />
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
        {props.entry.summary || t("common.noSummary")}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={props.focus}
          className="ws-button-secondary h-9 rounded-md text-xs"
        >
          {t("graph.focus")}
        </button>
        <button
          type="button"
          onClick={props.open}
          className="ws-button-primary h-9 rounded-md text-xs"
        >
          {t("graph.openNote")}
        </button>
      </div>
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--text-faint)]">
        {t("graph.linksCount", { count: props.relationships.length })}
      </p>
      <div className="mt-2 space-y-1">
        {props.relationships.map((relationship) => {
          const outgoing = relationship.sourceEntryId === props.entry.id;
          const otherId = outgoing
            ? relationship.targetEntryId
            : relationship.sourceEntryId;
          return (
            <div
              key={relationship.id}
              className="group flex items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-[var(--surface-muted)]"
            >
              <GitBranch size={13} className="text-[var(--text-faint)]" />
              <span className="min-w-0 flex-1 truncate">
                <b>
                  {t(`relation.${outgoing ? relationship.type : relationship.inverseLabel}`)}
                </b>{" "}
                · {props.entries.find((entry) => entry.id === otherId)?.title}
              </span>
              <button
                type="button"
                onClick={() => props.deleteRelationship(relationship.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-500 opacity-60 transition hover:bg-red-500/10 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label={t("graph.deleteRelationship")}
                title={t("graph.deleteRelationship")}
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <details className="mt-4 rounded-lg border border-[var(--border)] p-3">
        <summary className="cursor-pointer text-xs font-semibold">
          {t("graph.addLink")}
        </summary>
        <div className="mt-3 space-y-2">
          <select
            value={props.targetId}
            onChange={(event) => props.setTargetId(event.target.value)}
            className="ws-input h-9 w-full rounded-md px-2 text-xs"
          >
            <option value="">{t("graph.chooseNote")}</option>
            {props.entries
              .filter((entry) => entry.id !== props.entry.id)
              .map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.title}
                </option>
              ))}
          </select>
          <select
            value={props.relationType}
            onChange={(event) =>
              props.setRelationType(event.target.value as RelationshipType)
            }
            className="ws-input h-9 w-full rounded-md px-2 text-xs"
          >
            {RELATIONSHIP_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`relation.${type}`)}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={props.direction}
              onChange={(event) =>
                props.setDirection(event.target.value as RelationshipDirection)
              }
              className="ws-input h-9 rounded-md px-2 text-xs"
            >
              <option value="directed">{t("graph.directed")}</option>
              <option value="mutual">{t("graph.mutual")}</option>
            </select>
            <select
              value={props.status}
              onChange={(event) =>
                props.setStatus(event.target.value as RelationshipStatus)
              }
              className="ws-input h-9 rounded-md px-2 text-xs"
            >
              <option value="current">{t("graph.current")}</option>
              <option value="former">{t("graph.former")}</option>
              <option value="rumored">{t("graph.rumored")}</option>
              <option value="secret">{t("graph.secret")}</option>
            </select>
          </div>
          <button
            type="button"
            onClick={props.addRelationship}
            disabled={!props.targetId}
            className="ws-button-primary flex h-9 w-full items-center justify-center gap-2 rounded-md text-xs font-semibold disabled:opacity-40"
          >
            <Plus size={13} />
            {t("graph.addRelationship")}
          </button>
        </div>
      </details>
    </aside>
  );
}

function RelationshipPanel({
  relationship,
  entries,
  close,
  remove,
}: {
  relationship: EntryRelationship;
  entries: Entry[];
  close: () => void;
  remove: () => void;
}) {
  const { t } = useI18n();
  const source = entries.find(
    (entry) => entry.id === relationship.sourceEntryId,
  );
  const target = entries.find(
    (entry) => entry.id === relationship.targetEntryId,
  );
  return (
    <aside className="ws-panel-enter-right absolute left-3 right-3 top-3 z-20 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_96%,transparent)] p-4 text-[var(--text)] shadow-2xl backdrop-blur-xl sm:left-auto sm:w-72">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-faint)]">
          {t("graph.relationship")}
        </p>
        <button
          type="button"
          onClick={close}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-faint)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
          aria-label={t("common.close")}
          title={t("common.close")}
        >
          <X size={15} />
        </button>
      </div>
      <div className="mt-4 text-center">
        <b className="block text-sm text-[var(--text)]">{source?.title}</b>
        <div className="my-3 text-[var(--text-faint)]">↓</div>
        <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs">
          {t(`relation.${relationship.type}`)}
        </span>
        <b className="mt-3 block text-sm text-[var(--text)]">{target?.title}</b>
      </div>
      <button
        type="button"
        onClick={remove}
        className="mt-5 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-red-500/10 text-xs text-red-500"
      >
        <Trash2 size={13} />
        {t("graph.deleteRelationship")}
      </button>
    </aside>
  );
}
