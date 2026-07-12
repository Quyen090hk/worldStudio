import type { Core, EventObject, NodeSingular } from "cytoscape";

type Vector = { x: number; y: number };

export type GraphPhysicsOptions = {
  centerForce: number;
  repelForce: number;
  linkForce: number;
  linkDistance: number;
};

export type DragPhysicsController = {
  /** Re-enters the simulation without changing any node positions. */
  wake: () => void;
  destroy: () => void;
};

const ZERO = (): Vector => ({ x: 0, y: 0 });

/**
 * Keeps the graph physically responsive after the initial layout has settled.
 * Cytoscape's fCoSE layout is finite; this small simulation supplies the live
 * spring behavior users expect while dragging and the inertial settle after it.
 */
export function attachDragPhysics(
  graph: Core,
  getOptions: () => GraphPhysicsOptions,
): DragPhysicsController {
  const velocities = new Map<string, Vector>();
  const grabbed = new Set<string>();
  const nodes = () => graph.nodes().toArray() as NodeSingular[];
  let frame = 0;
  let quietFrames = 0;
  let smoothedOptions = { ...getOptions() };

  const initialNodes = nodes();
  const restingCenter = initialNodes.reduce((center, node) => {
    const position = node.position();
    center.x += position.x / Math.max(1, initialNodes.length);
    center.y += position.y / Math.max(1, initialNodes.length);
    return center;
  }, ZERO());

  function velocityFor(id: string) {
    const current = velocities.get(id);
    if (current) return current;
    const created = ZERO();
    velocities.set(id, created);
    return created;
  }

  function wake() {
    quietFrames = 0;
    if (!frame) frame = window.requestAnimationFrame(tick);
  }

  function tick() {
    frame = 0;
    if (graph.destroyed()) return;

    const allNodes = nodes();
    const accelerations = new Map(allNodes.map((node) => [node.id(), ZERO()]));
    const targetOptions = getOptions();
    const parameterDelta = Math.max(
      Math.abs(targetOptions.centerForce - smoothedOptions.centerForce) / 2,
      Math.abs(targetOptions.repelForce - smoothedOptions.repelForce) / 100_000,
      Math.abs(targetOptions.linkForce - smoothedOptions.linkForce) / 4,
      Math.abs(targetOptions.linkDistance - smoothedOptions.linkDistance) / 600,
    );
    // Ease force changes into the live simulation. Node positions and velocities
    // remain untouched while the coefficients converge on their slider targets.
    const blend = 0.22;
    smoothedOptions = {
      centerForce:
        smoothedOptions.centerForce +
        (targetOptions.centerForce - smoothedOptions.centerForce) * blend,
      repelForce:
        smoothedOptions.repelForce +
        (targetOptions.repelForce - smoothedOptions.repelForce) * blend,
      linkForce:
        smoothedOptions.linkForce +
        (targetOptions.linkForce - smoothedOptions.linkForce) * blend,
      linkDistance:
        smoothedOptions.linkDistance +
        (targetOptions.linkDistance - smoothedOptions.linkDistance) * blend,
    };
    const options = smoothedOptions;
    const spring = 0.0075 * options.linkForce;

    // Hooke springs: moving one endpoint transfers force to the other endpoint.
    graph.edges().forEach((edge) => {
      const source = edge.source();
      const target = edge.target();
      const a = source.position();
      const b = target.position();
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const stretch = distance - options.linkDistance;
      const stretchRatio =
        Math.abs(stretch) / Math.max(1, options.linkDistance);
      // Long links progressively stiffen, preventing a rubber-band feel while
      // leaving small movements smooth and responsive.
      const stiffness = spring * (1 + Math.min(1.5, stretchRatio) * 0.75);
      const force = Math.max(-3, Math.min(3, stretch * stiffness));
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      const sourceAcceleration = accelerations.get(source.id());
      const targetAcceleration = accelerations.get(target.id());
      if (sourceAcceleration && !grabbed.has(source.id())) {
        sourceAcceleration.x += fx;
        sourceAcceleration.y += fy;
      }
      if (targetAcceleration && !grabbed.has(target.id())) {
        targetAcceleration.x -= fx;
        targetAcceleration.y -= fy;
      }
    });

    // Pairwise repulsion is intentionally capped for large graphs. Springs stay
    // live at every size, while the initial fCoSE pass handles global separation.
    if (allNodes.length <= 350) {
      const radius = Math.max(50, options.linkDistance * 2.4);
      const radiusSquared = radius * radius;
      for (let index = 0; index < allNodes.length; index += 1) {
        const left = allNodes[index];
        const leftPosition = left.position();
        for (
          let otherIndex = index + 1;
          otherIndex < allNodes.length;
          otherIndex += 1
        ) {
          const right = allNodes[otherIndex];
          const rightPosition = right.position();
          const dx = rightPosition.x - leftPosition.x;
          const dy = rightPosition.y - leftPosition.y;
          const distanceSquared = dx * dx + dy * dy;
          if (distanceSquared < 1 || distanceSquared > radiusSquared) continue;
          const distance = Math.sqrt(distanceSquared);
          const force = Math.min(
            0.7,
            (options.repelForce * 0.018) / distanceSquared,
          );
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          if (!grabbed.has(left.id())) {
            accelerations.get(left.id())!.x -= fx;
            accelerations.get(left.id())!.y -= fy;
          }
          if (!grabbed.has(right.id())) {
            accelerations.get(right.id())!.x += fx;
            accelerations.get(right.id())!.y += fy;
          }
        }
      }
    }

    let energy = 0;
    graph.startBatch();
    for (const node of allNodes) {
      const id = node.id();
      if (grabbed.has(id) || node.locked()) {
        velocities.set(id, ZERO());
        continue;
      }
      const position = node.position();
      const acceleration = accelerations.get(id)!;
      // Weak centering prevents a dragged cluster from permanently drifting.
      acceleration.x +=
        (restingCenter.x - position.x) * options.centerForce * 0.00006;
      acceleration.y +=
        (restingCenter.y - position.y) * options.centerForce * 0.00006;

      const velocity = velocityFor(id);
      // Heavy damping gives a short settle instead of a lingering oscillation.
      velocity.x = (velocity.x + acceleration.x) * 0.7;
      velocity.y = (velocity.y + acceleration.y) * 0.7;
      const speed = Math.hypot(velocity.x, velocity.y);
      if (speed > 9) {
        velocity.x = (velocity.x / speed) * 9;
        velocity.y = (velocity.y / speed) * 9;
      }
      node.position({ x: position.x + velocity.x, y: position.y + velocity.y });
      energy += velocity.x * velocity.x + velocity.y * velocity.y;
    }
    graph.endBatch();

    quietFrames =
      energy < 0.008 && grabbed.size === 0 && parameterDelta < 0.0005
        ? quietFrames + 1
        : 0;
    if (quietFrames < 10) frame = window.requestAnimationFrame(tick);
  }

  function onGrab(event: EventObject) {
    grabbed.add(event.target.id());
    wake();
  }
  function onDrag() {
    wake();
  }
  function onFree(event: EventObject) {
    grabbed.delete(event.target.id());
    wake();
  }

  graph.on("grab", "node", onGrab);
  graph.on("drag", "node", onDrag);
  graph.on("free", "node", onFree);

  return {
    wake,
    destroy: () => {
      if (frame) window.cancelAnimationFrame(frame);
      graph.off("grab", "node", onGrab);
      graph.off("drag", "node", onDrag);
      graph.off("free", "node", onFree);
    },
  };
}
