import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { indexedDbStateStorage } from "../../../shared/storage/database";

import type { AssetRecord } from "../types";

type AssetStore = {
  assets: AssetRecord[];
  addAsset: (asset: AssetRecord) => void;
  updateAsset: (
    assetId: string,
    patch: Pick<AssetRecord, "name" | "tags">,
  ) => void;
  deleteAsset: (assetId: string) => void;
};

export const useAssetStore = create<AssetStore>()(
  persist(
    (set) => ({
      assets: [],
      addAsset: (asset) =>
        set((state) => ({ assets: [asset, ...state.assets] })),
      updateAsset: (assetId, patch) =>
        set((state) => ({
          assets: state.assets.map((asset) =>
            asset.id === assetId
              ? { ...asset, ...patch, updatedAt: new Date().toISOString() }
              : asset,
          ),
        })),
      deleteAsset: (assetId) =>
        set((state) => ({
          assets: state.assets.filter((asset) => asset.id !== assetId),
        })),
    }),
    {
      name: "world-studio.assets.v1",
      storage: createJSONStorage(() => indexedDbStateStorage),
      partialize: (state) => ({ assets: state.assets }),
    },
  ),
);
