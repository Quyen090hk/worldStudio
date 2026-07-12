import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { type Core, type ElementDefinition, type LayoutOptions, type StylesheetJson } from "cytoscape";
import fcose from "cytoscape-fcose";
import { ChevronDown, Eye, EyeOff, Focus, GitBranch, Maximize2, Network, Plus, RefreshCw, Search, Settings2, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MotionPage } from "../../shared/components/MotionPage";
import { useTheme, type ResolvedTheme } from "../../shared/theme/ThemeProvider";
import { useEntryStore } from "../entries/stores/useEntryStore";
import type { Entry, EntryType } from "../entries/types";
import { useRelationshipStore } from "./stores/useRelationshipStore";
import type { EntryRelationship, RelationshipDirection, RelationshipStatus, RelationshipType } from "./types";

const relationshipTypes: RelationshipType[] = ["Parent of", "Sibling of", "Loves", "Rivals", "Rules", "Member of", "Allied with", "At war with", "Located in", "Born in", "Participated in", "Caused", "Possesses", "Created by", "Worships", "Travels to", "Custom"];
const entryTypes: EntryType[] = ["Character", "Location", "Organization", "Item", "Event"];
const typeColors: Record<EntryType, string> = { Character: "#9b8ac4", Location: "#82a672", Organization: "#6f9eae", Item: "#c99a4b", Event: "#c67368" };

cytoscape.use(fcose);

function inverseFor(type: RelationshipType) {
  const values: Partial<Record<RelationshipType, string>> = { "Parent of": "Child of", Rules: "Ruled by", "Member of": "Has member", "Located in": "Contains", "Born in": "Birthplace of", "Participated in": "Included", Caused: "Caused by", Possesses: "Possessed by", "Created by": "Created", Worships: "Worshipped by", "Travels to": "Visited by" };
  return values[type] ?? type;
}

function collectLocalIds(focusId: string, depth: number, relationships: EntryRelationship[]) {
  const found = new Set([focusId]);
  let frontier = new Set([focusId]);
  for (let level = 0; level < depth; level += 1) {
    const next = new Set<string>();
    relationships.forEach((relationship) => {
      if (frontier.has(relationship.sourceEntryId)) next.add(relationship.targetEntryId);
      if (frontier.has(relationship.targetEntryId)) next.add(relationship.sourceEntryId);
    });
    next.forEach((id) => found.add(id));
    frontier = next;
  }
  return found;
}

function createGraphStyles(showLabels: boolean, showArrows: boolean, theme: ResolvedTheme, nodeScale: number, linkThickness: number, textFade: number): StylesheetJson {
  const dark = theme === "dark";
  const labelColor = dark ? "#ded9ce" : "#30291e";
  const outlineColor = dark ? "#080809" : "#f3ead9";
  const selectedColor = dark ? "#f4e9cc" : "#251b0d";
  return [
    { selector: "node", style: { width: `mapData(size, 7, 15, ${5 * nodeScale}, ${11 * nodeScale})`, height: `mapData(size, 7, 15, ${5 * nodeScale}, ${11 * nodeScale})`, "background-color": "data(color)", "border-width": 1, "border-color": "data(color)", label: showLabels ? "data(label)" : "", color: labelColor, "font-family": "IBM Plex Sans", "font-size": 7.5, "font-weight": "normal", "text-opacity": textFade, "text-valign": "bottom", "text-margin-y": 5, "text-outline-color": outlineColor, "text-outline-width": 2, "text-outline-opacity": .88, "overlay-opacity": 0, "transition-property": "width, height, opacity, border-width, text-opacity, underlay-opacity", "transition-duration": .18 } },
    { selector: "node.hovered", style: { width: 13 * nodeScale, height: 13 * nodeScale, "border-width": 2, "border-color": selectedColor, "underlay-color": "data(color)", "underlay-opacity": .16, "underlay-padding": 7, "font-size": 8.5, "font-weight": "bold", "text-opacity": 1, "z-index": 20 } },
    { selector: "node:selected", style: { width: 14 * nodeScale, height: 14 * nodeScale, "border-width": 2.5, "border-color": selectedColor, "underlay-color": "data(color)", "underlay-opacity": .2, "underlay-padding": 9, "font-size": 8.5, "font-weight": "bold", "text-opacity": 1, "z-index": 30 } },
    { selector: "node.focus", style: { width: 15 * nodeScale, height: 15 * nodeScale, "border-width": 2.5, "border-color": selectedColor } },
    { selector: "edge", style: { width: `mapData(width, 0.7, 3, ${.55 * linkThickness}, ${2 * linkThickness})`, "line-color": "data(color)", "target-arrow-color": "data(color)", "curve-style": "bezier", "target-arrow-shape": "none", opacity: .26, label: "", "overlay-opacity": 0, "transition-property": "opacity, width", "transition-duration": .18 } },
    { selector: "edge.directed", style: { "target-arrow-shape": showArrows ? "triangle" : "none" } },
    { selector: "edge.dashed", style: { "line-style": "dashed" } },
    { selector: "edge:selected", style: { width: 1.8 * linkThickness, opacity: .9, label: "data(label)", color: labelColor, "font-size": 7.5, "text-background-color": outlineColor, "text-background-opacity": .86, "text-background-padding": "3px" } },
    { selector: ".faded", style: { opacity: .1 } },
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

export function GraphPage() {
  const { resolvedTheme } = useTheme();
  const entries = useEntryStore((state) => state.entries);
  const relationships = useRelationshipStore((state) => state.relationships);
  const createRelationship = useRelationshipStore((state) => state.createRelationship);
  const deleteRelationship = useRelationshipStore((state) => state.deleteRelationship);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Core | null>(null);
  const navigate = useNavigate();
  const [mode, setMode] = useState<"global" | "local">("global");
  const [focusId, setFocusId] = useState<string | null>(entries[0]?.id ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [depth, setDepth] = useState(1);
  const [query, setQuery] = useState("");
  const [visibleTypes, setVisibleTypes] = useState<EntryType[]>(entryTypes);
  const [showSecrets, setShowSecrets] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showArrows, setShowArrows] = useState(true);
  const [eraYear, setEraYear] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [nodeRepulsion, setNodeRepulsion] = useState(11000);
  const [linkDistance, setLinkDistance] = useState(105);
  const [linkElasticity, setLinkElasticity] = useState(.45);
  const [centerGravity, setCenterGravity] = useState(.22);
  const [animationDuration, setAnimationDuration] = useState(700);
  const [nodeScale, setNodeScale] = useState(1);
  const [linkThickness, setLinkThickness] = useState(1);
  const [textFade, setTextFade] = useState(.78);
  const [targetId, setTargetId] = useState("");
  const [relationType, setRelationType] = useState<RelationshipType>("Allied with");
  const [direction, setDirection] = useState<RelationshipDirection>("mutual");
  const [status, setStatus] = useState<RelationshipStatus>("current");

  const term = query.trim().toLowerCase();
  const year = eraYear === "" ? null : Number(eraYear);
  const filteredRelationships = useMemo(() => relationships.filter((relationship) => showSecrets || relationship.status !== "secret").filter((relationship) => year === null || ((relationship.startYear === null || relationship.startYear <= year) && (relationship.endYear === null || relationship.endYear >= year))), [relationships, showSecrets, year]);
  const localIds = useMemo(() => mode === "local" && focusId ? collectLocalIds(focusId, depth, filteredRelationships) : null, [mode, focusId, depth, filteredRelationships]);
  const visibleEntries = useMemo(() => entries.filter((entry) => visibleTypes.includes(entry.type) && (!term || `${entry.title} ${entry.summary} ${entry.tags.join(" ")}`.toLowerCase().includes(term)) && (!localIds || localIds.has(entry.id))), [entries, visibleTypes, term, localIds]);
  const visibleRelationships = useMemo(() => {
    const ids = new Set(visibleEntries.map((entry) => entry.id));
    return filteredRelationships.filter((relationship) => ids.has(relationship.sourceEntryId) && ids.has(relationship.targetEntryId));
  }, [filteredRelationships, visibleEntries]);
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;
  const selectedRelationship = relationships.find((relationship) => relationship.id === selectedRelationshipId) ?? null;
  const selectedRelations = selected ? relationships.filter((relationship) => relationship.sourceEntryId === selected.id || relationship.targetEntryId === selected.id) : [];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const elements: ElementDefinition[] = [
      ...visibleEntries.map((entry) => {
        const degree = visibleRelationships.filter((relationship) => relationship.sourceEntryId === entry.id || relationship.targetEntryId === entry.id).length;
        return { data: { id: entry.id, label: entry.title, color: typeColors[entry.type], borderColor: `${typeColors[entry.type]}cc`, size: Math.min(15, 7 + degree * 1.6), entryType: entry.type }, classes: entry.id === focusId && mode === "local" ? "focus" : "" };
      }),
      ...visibleRelationships.map((relationship) => ({ data: { id: relationship.id, source: relationship.sourceEntryId, target: relationship.targetEntryId, label: relationship.type, color: relationship.status === "secret" ? "#9f7ab6" : relationship.status === "rumored" ? "#777780" : relationship.type === "At war with" || relationship.type === "Rivals" ? "#b75b57" : "#787880", width: relationship.strength ? Math.max(.7, Math.abs(relationship.strength) / 60) : .8 }, classes: [relationship.direction === "directed" ? "directed" : "", relationship.status === "rumored" || relationship.status === "secret" ? "dashed" : ""].filter(Boolean).join(" ") })),
    ];
    const graph = cytoscape({ container, elements, style: createGraphStyles(showLabels, showArrows, resolvedTheme, nodeScale, linkThickness, textFade), layout: { name: "grid", padding: 80 }, minZoom: .08, maxZoom: 5, wheelSensitivity: .12, boxSelectionEnabled: true, textureOnViewport: visibleEntries.length > 800, hideEdgesOnViewport: visibleEntries.length > 1500, motionBlur: visibleEntries.length < 1000 });
    graph.on("mouseover", "node", (event) => event.target.addClass("hovered"));
    graph.on("mouseout", "node", (event) => event.target.removeClass("hovered"));
    graph.on("tap", "node", (event) => {
      const node = event.target;
      graph.elements().addClass("faded");
      node.closedNeighborhood().removeClass("faded");
      setSelectedId(node.id());
      setSelectedRelationshipId(null);
    });
    graph.on("tap", "edge", (event) => { graph.elements().removeClass("faded"); setSelectedRelationshipId(event.target.id()); setSelectedId(null); });
    graph.on("tap", (event) => { if (event.target === graph) { graph.elements().removeClass("faded"); setSelectedId(null); setSelectedRelationshipId(null); } });
    let settleTimer = 0;
    graph.on("dragfree", "node", () => {
      if (visibleEntries.length > 800) return;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        graph.layout({ name: "fcose", quality: "proof", randomize: false, animate: true, animationDuration: Math.min(360, animationDuration), fit: false, nodeRepulsion: () => nodeRepulsion, idealEdgeLength: () => linkDistance, edgeElasticity: () => linkElasticity, gravity: centerGravity, numIter: 450, tile: true } as unknown as LayoutOptions).run();
      }, 180);
    });
    graphRef.current = graph;
    const frame = window.requestAnimationFrame(() => {
      graph.resize();
      graph.layout((mode === "local" ? { name: "concentric", animate: false, padding: 100 } : { name: "fcose", quality: visibleEntries.length > 1200 ? "draft" : "default", randomize: true, animate: visibleEntries.length < 1400, animationDuration, animationEasing: "ease-out", fit: true, padding: 100, nodeRepulsion: () => nodeRepulsion, idealEdgeLength: () => linkDistance, edgeElasticity: () => linkElasticity, gravity: centerGravity, numIter: visibleEntries.length > 1200 ? 1000 : 2500, tile: true, tilingPaddingVertical: 22, tilingPaddingHorizontal: 22 }) as unknown as LayoutOptions).run();
      fitGraph(graph);
    });
    const observer = new ResizeObserver(() => graph.resize());
    observer.observe(container);
    return () => { window.cancelAnimationFrame(frame); window.clearTimeout(settleTimer); observer.disconnect(); graph.destroy(); graphRef.current = null; };
  }, [visibleEntries, visibleRelationships, focusId, mode, showLabels, showArrows, nodeRepulsion, linkDistance, linkElasticity, centerGravity, animationDuration, resolvedTheme, nodeScale, linkThickness, textFade]);

  function toggleType(type: EntryType) { setVisibleTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]); }
  function addRelationship() {
    if (!selected || !targetId || selected.id === targetId) return;
    createRelationship({ sourceEntryId: selected.id, targetEntryId: targetId, type: relationType, inverseLabel: inverseFor(relationType), direction, strength: null, status, startYear: year, endYear: null, description: "", tags: [] });
    setTargetId("");
  }
  function arrange() { graphRef.current?.layout((mode === "local" ? { name: "concentric", animate: true, animationDuration, padding: 100 } : { name: "fcose", quality: visibleEntries.length > 1200 ? "draft" : "default", randomize: false, animate: true, animationDuration, fit: true, padding: 100, nodeRepulsion: () => nodeRepulsion, idealEdgeLength: () => linkDistance, edgeElasticity: () => linkElasticity, gravity: centerGravity, numIter: 1800, tile: true }) as unknown as LayoutOptions).run(); }

  return <MotionPage className="space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="ws-eyebrow">Knowledge Graph</p><h2 className="mt-1 text-4xl font-semibold tracking-[-.04em]">Graph</h2></div><div className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><span>{visibleEntries.length} notes</span><span>·</span><span>{visibleRelationships.length} links</span></div></header>
    <section className="relative h-[calc(100vh-12.5rem)] min-h-[680px] overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-raised)]">
      <div className="pointer-events-none absolute inset-0 opacity-35" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, var(--border-strong) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
        <button type="button" onClick={() => setPanelOpen(!panelOpen)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_94%,transparent)] text-[var(--text-muted)] shadow-lg backdrop-blur hover:bg-[var(--surface-raised)]" aria-label="Toggle graph controls"><Settings2 size={16} /></button>
        <label className="flex h-9 w-56 items-center gap-2 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_94%,transparent)] px-3 text-[var(--text-muted)] shadow-lg backdrop-blur"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search files..." className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--text-faint)]" />{query ? <button type="button" onClick={() => setQuery("")}><X size={13} /></button> : null}</label>
      </div>

      {panelOpen ? <GraphControls mode={mode} setMode={setMode} focusId={focusId} setFocusId={setFocusId} entries={entries} depth={depth} setDepth={setDepth} visibleTypes={visibleTypes} toggleType={toggleType} showSecrets={showSecrets} setShowSecrets={setShowSecrets} showLabels={showLabels} setShowLabels={setShowLabels} showArrows={showArrows} setShowArrows={setShowArrows} eraYear={eraYear} setEraYear={setEraYear} nodeRepulsion={nodeRepulsion} setNodeRepulsion={setNodeRepulsion} linkDistance={linkDistance} setLinkDistance={setLinkDistance} linkElasticity={linkElasticity} setLinkElasticity={setLinkElasticity} centerGravity={centerGravity} setCenterGravity={setCenterGravity} animationDuration={animationDuration} setAnimationDuration={setAnimationDuration} nodeScale={nodeScale} setNodeScale={setNodeScale} linkThickness={linkThickness} setLinkThickness={setLinkThickness} textFade={textFade} setTextFade={setTextFade} /> : null}

      {selected ? <NodePanel entry={selected} relationships={selectedRelations} entries={entries} targetId={targetId} setTargetId={setTargetId} relationType={relationType} setRelationType={setRelationType} direction={direction} setDirection={setDirection} status={status} setStatus={setStatus} addRelationship={addRelationship} deleteRelationship={deleteRelationship} close={() => { setSelectedId(null); graphRef.current?.elements().removeClass("faded"); }} focus={() => { setFocusId(selected.id); setMode("local"); }} open={() => navigate(`/entries/${selected.id}`)} /> : null}
      {selectedRelationship ? <RelationshipPanel relationship={selectedRelationship} entries={entries} close={() => setSelectedRelationshipId(null)} remove={() => { deleteRelationship(selectedRelationship.id); setSelectedRelationshipId(null); }} /> : null}

      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center overflow-hidden rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_94%,transparent)] text-[var(--text-muted)] shadow-lg backdrop-blur"><button type="button" onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * .8)} className="flex h-9 w-9 items-center justify-center hover:bg-[var(--surface-muted)]" aria-label="Zoom out"><ZoomOut size={15} /></button><button type="button" onClick={() => { if (graphRef.current) fitGraph(graphRef.current); }} className="flex h-9 items-center gap-2 border-x border-[var(--border)] px-3 text-xs hover:bg-[var(--surface-muted)]"><Maximize2 size={14} />Fit</button><button type="button" onClick={arrange} className="flex h-9 items-center gap-2 border-r border-[var(--border)] px-3 text-xs hover:bg-[var(--surface-muted)]"><RefreshCw size={14} />Stabilize</button><button type="button" onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 1.2)} className="flex h-9 w-9 items-center justify-center hover:bg-[var(--surface-muted)]" aria-label="Zoom in"><ZoomIn size={15} /></button></div>
    </section>
  </MotionPage>;
}

type ControlsProps = { mode: "global" | "local"; setMode: (mode: "global" | "local") => void; focusId: string | null; setFocusId: (id: string) => void; entries: Entry[]; depth: number; setDepth: (value: number) => void; visibleTypes: EntryType[]; toggleType: (type: EntryType) => void; showSecrets: boolean; setShowSecrets: (value: boolean) => void; showLabels: boolean; setShowLabels: (value: boolean) => void; showArrows: boolean; setShowArrows: (value: boolean) => void; eraYear: string; setEraYear: (value: string) => void; nodeRepulsion: number; setNodeRepulsion: (value: number) => void; linkDistance: number; setLinkDistance: (value: number) => void; linkElasticity: number; setLinkElasticity: (value: number) => void; centerGravity: number; setCenterGravity: (value: number) => void; animationDuration: number; setAnimationDuration: (value: number) => void; nodeScale: number; setNodeScale: (value: number) => void; linkThickness: number; setLinkThickness: (value: number) => void; textFade: number; setTextFade: (value: number) => void };
function GraphControls(props: ControlsProps) {
  return <aside className="absolute left-3 top-14 z-20 max-h-[calc(100%-4.5rem)] w-72 overflow-y-auto rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_96%,transparent)] text-[var(--text)] shadow-2xl backdrop-blur-xl">
    <details open className="border-b border-[var(--border)]"><summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-semibold"><ChevronDown size={13} />Filters</summary><div className="space-y-3 px-4 pb-4"><div className="grid grid-cols-2 rounded-lg bg-[var(--surface-muted)] p-1"><button type="button" onClick={() => props.setMode("global")} className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs ${props.mode === "global" ? "bg-[var(--surface-raised)] text-[var(--text)] shadow" : "text-[var(--text-faint)]"}`}><Network size={13} />Global</button><button type="button" onClick={() => props.setMode("local")} className={`flex items-center justify-center gap-2 rounded-md py-2 text-xs ${props.mode === "local" ? "bg-[var(--surface-raised)] text-[var(--text)] shadow" : "text-[var(--text-faint)]"}`}><Focus size={13} />Local</button></div>{props.mode === "local" ? <><select value={props.focusId ?? ""} onChange={(event) => props.setFocusId(event.target.value)} className="ws-input h-9 w-full rounded-md px-2 text-xs outline-none">{props.entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select><Range label="Depth" value={props.depth} min={1} max={3} setValue={props.setDepth} /></> : null}<label className="block"><span className="mb-1 block text-[10px] text-[var(--text-faint)]">Historical year</span><input type="number" value={props.eraYear} onChange={(event) => props.setEraYear(event.target.value)} placeholder="Any era" className="ws-input h-9 w-full rounded-md px-2 text-xs outline-none" /></label></div></details>
    <details open className="border-b border-[var(--border)]"><summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-semibold"><ChevronDown size={13} />Groups</summary><div className="space-y-1 px-3 pb-3">{entryTypes.map((type) => <button key={type} type="button" onClick={() => props.toggleType(type)} className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-xs hover:bg-[var(--surface-muted)]">{props.visibleTypes.includes(type) ? <Eye size={13} /> : <EyeOff size={13} className="text-[var(--text-faint)]" />}<span className="h-2.5 w-2.5 rounded-full" style={{ background: typeColors[type] }} /><span>{type}</span></button>)}</div></details>
    <details open className="border-b border-[var(--border)]"><summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-semibold"><ChevronDown size={13} />Display</summary><div className="space-y-1 px-3 pb-3"><Toggle label="Labels" value={props.showLabels} setValue={props.setShowLabels} /><Toggle label="Arrows" value={props.showArrows} setValue={props.setShowArrows} /><Toggle label="Author secrets" value={props.showSecrets} setValue={props.setShowSecrets} /><Range label="Text fade" value={props.textFade} min={.1} max={1} step={.05} setValue={props.setTextFade} /><Range label="Node size" value={props.nodeScale} min={.6} max={2.2} step={.1} setValue={props.setNodeScale} /><Range label="Link thickness" value={props.linkThickness} min={.5} max={2.5} step={.1} setValue={props.setLinkThickness} /></div></details>
    <details open><summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-semibold"><ChevronDown size={13} />Forces</summary><div className="space-y-4 px-4 pb-4"><Range label="Center force" value={props.centerGravity} min={.02} max={1} step={.02} setValue={props.setCenterGravity} /><Range label="Repel force" value={props.nodeRepulsion} min={2000} max={26000} step={500} setValue={props.setNodeRepulsion} /><Range label="Link force" value={props.linkElasticity} min={.05} max={1.5} step={.05} setValue={props.setLinkElasticity} /><Range label="Link distance" value={props.linkDistance} min={40} max={260} step={5} setValue={props.setLinkDistance} /><Range label="Animation speed" value={props.animationDuration} min={100} max={1800} step={50} setValue={props.setAnimationDuration} /></div></details>
  </aside>;
}

function Toggle({ label, value, setValue }: { label: string; value: boolean; setValue: (value: boolean) => void }) {
  return <button type="button" onClick={() => setValue(!value)} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-xs hover:bg-[var(--surface-muted)]"><span>{label}</span><span className={`relative h-4 w-7 rounded-full transition ${value ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-[var(--surface-raised)] shadow transition ${value ? "left-3.5" : "left-0.5"}`} /></span></button>;
}
function Range({ label, value, min, max, step = 1, setValue }: { label: string; value: number; min: number; max: number; step?: number; setValue: (value: number) => void }) {
  return <label className="block"><span className="mb-1 flex justify-between text-[10px] text-[var(--text-faint)]"><span>{label}</span><span>{Number.isInteger(value) ? value : value.toFixed(2)}</span></span><input type="range" value={value} min={min} max={max} step={step} onChange={(event) => setValue(Number(event.target.value))} className="w-full accent-[var(--accent)]" /></label>;
}

type NodePanelProps = { entry: Entry; relationships: EntryRelationship[]; entries: Entry[]; targetId: string; setTargetId: (id: string) => void; relationType: RelationshipType; setRelationType: (type: RelationshipType) => void; direction: RelationshipDirection; setDirection: (value: RelationshipDirection) => void; status: RelationshipStatus; setStatus: (value: RelationshipStatus) => void; addRelationship: () => void; deleteRelationship: (id: string) => void; close: () => void; focus: () => void; open: () => void };
function NodePanel(props: NodePanelProps) {
  return <aside className="absolute bottom-3 right-3 top-3 z-20 w-80 overflow-y-auto rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_96%,transparent)] p-4 text-[var(--text)] shadow-2xl backdrop-blur-xl"><div className="flex items-start gap-3"><span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: typeColors[props.entry.type] }} /><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-faint)]">{props.entry.type}</p><h3 className="mt-1 truncate text-lg font-semibold text-[var(--text)]">{props.entry.title}</h3></div><button type="button" onClick={props.close} className="text-[var(--text-faint)] hover:text-[var(--text)]"><X size={16} /></button></div><p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">{props.entry.summary || "No summary yet."}</p><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={props.focus} className="ws-button-secondary h-9 rounded-md text-xs">Focus</button><button type="button" onClick={props.open} className="ws-button-secondary h-9 rounded-md text-xs">Open note</button></div><p className="mt-5 text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--text-faint)]">Links · {props.relationships.length}</p><div className="mt-2 space-y-1">{props.relationships.map((relationship) => { const outgoing = relationship.sourceEntryId === props.entry.id; const otherId = outgoing ? relationship.targetEntryId : relationship.sourceEntryId; return <div key={relationship.id} className="group flex items-center gap-2 rounded-md px-2 py-2 text-xs hover:bg-[var(--surface-muted)]"><GitBranch size={13} className="text-[var(--text-faint)]" /><span className="min-w-0 flex-1 truncate"><b>{outgoing ? relationship.type : relationship.inverseLabel}</b> · {props.entries.find((entry) => entry.id === otherId)?.title}</span><button type="button" onClick={() => props.deleteRelationship(relationship.id)} className="opacity-0 text-red-500 group-hover:opacity-100"><Trash2 size={12} /></button></div>; })}</div><details className="mt-4 rounded-lg border border-[var(--border)] p-3"><summary className="cursor-pointer text-xs font-semibold">Add link</summary><div className="mt-3 space-y-2"><select value={props.targetId} onChange={(event) => props.setTargetId(event.target.value)} className="ws-input h-9 w-full rounded-md px-2 text-xs"><option value="">Choose a note…</option>{props.entries.filter((entry) => entry.id !== props.entry.id).map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select><select value={props.relationType} onChange={(event) => props.setRelationType(event.target.value as RelationshipType)} className="ws-input h-9 w-full rounded-md px-2 text-xs">{relationshipTypes.map((type) => <option key={type}>{type}</option>)}</select><div className="grid grid-cols-2 gap-2"><select value={props.direction} onChange={(event) => props.setDirection(event.target.value as RelationshipDirection)} className="ws-input h-9 rounded-md px-2 text-xs"><option value="directed">Directed</option><option value="mutual">Mutual</option></select><select value={props.status} onChange={(event) => props.setStatus(event.target.value as RelationshipStatus)} className="ws-input h-9 rounded-md px-2 text-xs"><option value="current">Current</option><option value="former">Former</option><option value="rumored">Rumored</option><option value="secret">Secret</option></select></div><button type="button" onClick={props.addRelationship} disabled={!props.targetId} className="ws-button-primary flex h-9 w-full items-center justify-center gap-2 rounded-md text-xs font-semibold disabled:opacity-40"><Plus size={13} />Add relationship</button></div></details></aside>;
}

function RelationshipPanel({ relationship, entries, close, remove }: { relationship: EntryRelationship; entries: Entry[]; close: () => void; remove: () => void }) {
  const source = entries.find((entry) => entry.id === relationship.sourceEntryId);
  const target = entries.find((entry) => entry.id === relationship.targetEntryId);
  return <aside className="absolute right-3 top-3 z-20 w-72 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-solid)_96%,transparent)] p-4 text-[var(--text)] shadow-2xl backdrop-blur-xl"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--text-faint)]">Relationship</p><button type="button" onClick={close}><X size={15} /></button></div><div className="mt-4 text-center"><b className="block text-sm text-[var(--text)]">{source?.title}</b><div className="my-3 text-[var(--text-faint)]">↓</div><span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs">{relationship.type}</span><b className="mt-3 block text-sm text-[var(--text)]">{target?.title}</b></div><button type="button" onClick={remove} className="mt-5 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-red-500/10 text-xs text-red-500"><Trash2 size={13} />Delete relationship</button></aside>;
}
