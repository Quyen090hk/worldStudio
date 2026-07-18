import { useWorldRegistryStore } from "./stores/useWorldRegistryStore";
import { loadWorldWorkspace } from "./workspaceStorage";

async function someStoredWorld(
  predicate: (workspace: NonNullable<Awaited<ReturnType<typeof loadWorldWorkspace>>>) => boolean,
  excludedWorldId?: string,
) {
  const worlds = useWorldRegistryStore.getState().worlds;
  for (const world of worlds) {
    if (world.id === excludedWorldId) continue;
    const workspace = await loadWorldWorkspace(world.id);
    if (workspace && predicate(workspace)) return true;
  }
  return false;
}

export function isAssetReferencedByStoredWorld(assetId: string, excludedWorldId?: string) {
  return someStoredWorld(
    (workspace) => workspace.data.assetLibrary.items.some((asset) => asset.id === assetId),
    excludedWorldId,
  );
}

export function isMapImageReferencedByStoredWorld(mapId: string, excludedWorldId?: string) {
  return someStoredWorld(
    (workspace) => workspace.data.atlas.maps.some((map) => map.id === mapId),
    excludedWorldId,
  );
}
