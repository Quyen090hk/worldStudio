import type {
  Core,
  ElementDefinition,
  SingularElementReturnValue,
} from "cytoscape";

const TRANSITION_MS = 220;
const STRUCTURAL_CLASSES = ["directed", "dashed", "focus"];

function isEdgeDefinition(definition: ElementDefinition) {
  return Boolean(definition.data.source && definition.data.target);
}

function definitionClasses(definition: ElementDefinition) {
  const value = definition.classes;
  const classes = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\s+/)
      : [];
  return new Set(classes.filter(Boolean));
}

function classesAsString(definition: ElementDefinition) {
  return Array.isArray(definition.classes)
    ? definition.classes.join(" ")
    : (definition.classes ?? "");
}

function updateElement(
  element: SingularElementReturnValue,
  definition: ElementDefinition,
) {
  Object.entries(definition.data).forEach(([key, value]) => {
    if (key === "id" || key === "source" || key === "target") return;
    if (element.data(key) !== value) element.data(key, value);
  });
  const classes = definitionClasses(definition);
  STRUCTURAL_CLASSES.forEach((className) => {
    element.toggleClass(className, classes.has(className));
  });
}

function hashOffset(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  const angle = ((Math.abs(hash) % 360) * Math.PI) / 180;
  const radius = 18 + (Math.abs(hash >> 8) % 18);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function positionNearNeighbors(
  graph: Core,
  nodeId: string,
  edges: ElementDefinition[],
) {
  const positions = edges.flatMap((edge) => {
    const source = String(edge.data.source);
    const target = String(edge.data.target);
    const neighborId =
      source === nodeId ? target : target === nodeId ? source : null;
    if (!neighborId) return [];
    const neighbor = graph.getElementById(neighborId);
    return neighbor.nonempty() && !neighbor.hasClass("exiting")
      ? [neighbor.position()]
      : [];
  });
  const extent = graph.extent();
  const anchor = positions.length
    ? positions.reduce(
        (sum, position) => ({
          x: sum.x + position.x / positions.length,
          y: sum.y + position.y / positions.length,
        }),
        { x: 0, y: 0 },
      )
    : { x: (extent.x1 + extent.x2) / 2, y: (extent.y1 + extent.y2) / 2 };
  const offset = hashOffset(nodeId);
  return { x: anchor.x + offset.x, y: anchor.y + offset.y };
}

export type GraphSyncController = {
  sync: (definitions: ElementDefinition[]) => void;
  destroy: () => void;
};

/** Incrementally reconciles graph elements without touching camera or positions. */
export function createGraphSync(
  graph: Core,
  onStructureChanged: () => void,
): GraphSyncController {
  const removalTimers = new Map<string, number>();
  let desiredIds = new Set<string>();
  let enterFrame = 0;

  function cancelRemoval(id: string) {
    const timer = removalTimers.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    removalTimers.delete(id);
  }

  function sync(definitions: ElementDefinition[]) {
    const desired = new Map(
      definitions.map((definition) => [String(definition.data.id), definition]),
    );
    desiredIds = new Set(desired.keys());

    graph.elements().forEach((element) => {
      const id = element.id();
      const definition = desired.get(id);
      if (definition) {
        cancelRemoval(id);
        element.removeClass("exiting");
        updateElement(element, definition);
        return;
      }
      if (element.hasClass("exiting")) return;
      element.addClass("exiting");
      const timer = window.setTimeout(() => {
        removalTimers.delete(id);
        if (desiredIds.has(id)) return;
        const current = graph.getElementById(id);
        if (current.nonempty()) current.remove();
        onStructureChanged();
      }, TRANSITION_MS);
      removalTimers.set(id, timer);
    });

    const missing = definitions.filter((definition) =>
      graph.getElementById(String(definition.data.id)).empty(),
    );
    const missingNodes = missing.filter(
      (definition) => !isEdgeDefinition(definition),
    );
    const desiredEdges = definitions.filter(isEdgeDefinition);

    missingNodes.forEach((definition) => {
      const id = String(definition.data.id);
      graph.add({
        ...definition,
        position: positionNearNeighbors(graph, id, desiredEdges),
        classes: [classesAsString(definition), "entering"]
          .filter(Boolean)
          .join(" "),
      });
    });

    missing.filter(isEdgeDefinition).forEach((definition) => {
      const source = graph.getElementById(String(definition.data.source));
      const target = graph.getElementById(String(definition.data.target));
      if (source.empty() || target.empty()) return;
      graph.add({
        ...definition,
        classes: [classesAsString(definition), "entering"]
          .filter(Boolean)
          .join(" "),
      });
    });

    if (missing.length) {
      if (enterFrame) window.cancelAnimationFrame(enterFrame);
      enterFrame = window.requestAnimationFrame(() => {
        enterFrame = 0;
        graph.elements(".entering").removeClass("entering");
        onStructureChanged();
      });
    }
  }

  return {
    sync,
    destroy: () => {
      removalTimers.forEach((timer) => window.clearTimeout(timer));
      removalTimers.clear();
      if (enterFrame) window.cancelAnimationFrame(enterFrame);
    },
  };
}
