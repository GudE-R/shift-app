import { create } from "zustand";
import type { Store, Position } from "@/types";
import * as storeQueries from "@/db/queries/stores";
import * as positionQueries from "@/db/queries/positions";

interface StoreState {
  stores: Store[];
  positions: Position[];
  loading: boolean;
  fetchStores: () => Promise<void>;
  fetchPositions: (storeId?: string) => Promise<void>;
  addStore: (store: Omit<Store, "updated_at">) => Promise<void>;
  editStore: (id: string, data: Partial<Store>) => Promise<void>;
  removeStore: (id: string) => Promise<void>;
  addPosition: (pos: Omit<Position, "updated_at">) => Promise<void>;
  editPosition: (id: string, name: string) => Promise<void>;
  removePosition: (id: string) => Promise<void>;
}

export const useStoreStore = create<StoreState>((set, get) => ({
  stores: [],
  positions: [],
  loading: false,

  fetchStores: async () => {
    set({ loading: true });
    const stores = await storeQueries.getStores();
    set({ stores, loading: false });
  },

  fetchPositions: async (storeId?: string) => {
    const positions = storeId
      ? await positionQueries.getPositionsByStore(storeId)
      : await positionQueries.getAllPositions();
    set({ positions });
  },

  addStore: async (store) => {
    await storeQueries.createStore(store);
    await get().fetchStores();
  },

  editStore: async (id, data) => {
    await storeQueries.updateStore(id, data);
    await get().fetchStores();
  },

  removeStore: async (id) => {
    await storeQueries.deleteStore(id);
    await get().fetchStores();
  },

  addPosition: async (pos) => {
    await positionQueries.createPosition(pos);
    await get().fetchPositions();
  },

  editPosition: async (id, name) => {
    await positionQueries.updatePosition(id, name);
    await get().fetchPositions();
  },

  removePosition: async (id) => {
    await positionQueries.deletePosition(id);
    await get().fetchPositions();
  },
}));
