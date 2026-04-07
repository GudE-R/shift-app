import { create } from "zustand";
import type { Staff, StaffWithRelations } from "@/types";
import * as staffQueries from "@/db/queries/staff";

interface StaffState {
  staffList: StaffWithRelations[];
  loading: boolean;
  fetchStaff: () => Promise<void>;
  addStaff: (staff: Omit<Staff, "updated_at">) => Promise<void>;
  editStaff: (id: string, data: Partial<Staff>) => Promise<void>;
  removeStaff: (id: string) => Promise<void>;
  setStaffStores: (staffId: string, storeIds: string[]) => Promise<void>;
  setStaffPositions: (staffId: string, positionIds: string[]) => Promise<void>;
  setStaffAvailability: (staffId: string, availability: { day_of_week: number; status: string }[]) => Promise<void>;
  addNgDate: (staffId: string, date: string, reason?: string) => Promise<void>;
  removeNgDate: (id: string) => Promise<void>;
}

export const useStaffStore = create<StaffState>((set, get) => ({
  staffList: [],
  loading: false,

  fetchStaff: async () => {
    set({ loading: true });
    const staffList = await staffQueries.getAllStaffWithRelations();
    set({ staffList, loading: false });
  },

  addStaff: async (staff) => {
    await staffQueries.createStaff(staff);
    await get().fetchStaff();
  },

  editStaff: async (id, data) => {
    await staffQueries.updateStaff(id, data);
    await get().fetchStaff();
  },

  removeStaff: async (id) => {
    await staffQueries.deleteStaff(id);
    await get().fetchStaff();
  },

  setStaffStores: async (staffId, storeIds) => {
    await staffQueries.setStaffStores(staffId, storeIds);
    await get().fetchStaff();
  },

  setStaffPositions: async (staffId, positionIds) => {
    await staffQueries.setStaffPositions(staffId, positionIds);
    await get().fetchStaff();
  },

  setStaffAvailability: async (staffId, availability) => {
    await staffQueries.setStaffAvailability(staffId, availability);
    await get().fetchStaff();
  },

  addNgDate: async (staffId, date, reason) => {
    await staffQueries.addStaffNgDate({
      id: crypto.randomUUID(),
      staff_id: staffId,
      ng_date: date,
      reason: reason || null,
    });
    await get().fetchStaff();
  },

  removeNgDate: async (id) => {
    await staffQueries.deleteStaffNgDate(id);
    await get().fetchStaff();
  },
}));
