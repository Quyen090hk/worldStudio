import { useAssetStore } from "../assets/stores/useAssetStore";
import { useCanvasStore } from "../canvas/stores/useCanvasStore";
import { useEntryStore } from "../entries/stores/useEntryStore";
import { useGraphSettingsStore } from "../graph/stores/useGraphSettingsStore";
import { useRelationshipStore } from "../graph/stores/useRelationshipStore";
import { useMapStore } from "../map/stores/useMapStore";
import { useTimelineStore } from "../timeline/stores/useTimelineStore";
import { useWorldRegistryStore } from "./stores/useWorldRegistryStore";
import { useWorldStore } from "./stores/useWorldStore";

const stores = [
  useWorldRegistryStore,
  useWorldStore,
  useEntryStore,
  useRelationshipStore,
  useTimelineStore,
  useMapStore,
  useCanvasStore,
  useAssetStore,
  useGraphSettingsStore,
];

let hydrationPromise: Promise<void> | null = null;

/** Ensures every async persisted store is ready before workspace operations. */
export function hydrateWorkspaceStores() {
  if (!hydrationPromise) {
    hydrationPromise = Promise.all(
      stores.map((store) =>
        store.persist.hasHydrated() ? Promise.resolve() : store.persist.rehydrate(),
      ),
    ).then(() => undefined);
  }
  return hydrationPromise;
}
