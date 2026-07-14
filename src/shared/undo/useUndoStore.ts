import { create } from "zustand";

type UndoOffer = {
  id: number;
  label: string;
  expiresAt: number;
  run: () => void;
};

type UndoStore = {
  offer: UndoOffer | null;
  show: (label: string, run: () => void) => void;
  dismiss: (id?: number) => void;
  undo: () => void;
};

export const UNDO_DURATION_MS = 8_000;

export const useUndoStore = create<UndoStore>((set, get) => ({
  offer: null,
  show: (label, run) =>
    set({ offer: { id: Date.now(), label, expiresAt: Date.now() + UNDO_DURATION_MS, run } }),
  dismiss: (id) => set((state) => (!id || state.offer?.id === id ? { offer: null } : state)),
  undo: () => {
    const offer = get().offer;
    if (!offer || offer.expiresAt < Date.now()) return set({ offer: null });
    set({ offer: null });
    offer.run();
  },
}));
