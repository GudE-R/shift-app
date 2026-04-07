import { create } from "zustand";
import type { ShiftEntry, ShiftEntryWithNames, ValidationResult, Staff } from "@/types";
import * as shiftQueries from "@/db/queries/shift-entries";
import { validateShifts } from "@/validation/rules";

interface ShiftState {
  shifts: ShiftEntryWithNames[];
  validationResults: ValidationResult[];
  loading: boolean;
  fetchShifts: (start: string, end: string, storeId?: string) => Promise<void>;
  addShift: (entry: Omit<ShiftEntry, "updated_at">) => Promise<void>;
  editShift: (id: string, data: Partial<ShiftEntry>) => Promise<void>;
  removeShift: (id: string) => Promise<void>;
  runValidation: (staffList: Staff[]) => void;
  deleteNonManualShifts: (storeId: string, start: string, end: string) => Promise<void>;
  bulkInsertShifts: (entries: Omit<ShiftEntry, "updated_at">[]) => Promise<void>;
  _currentRange: { start: string; end: string; storeId?: string } | null;
}

export const useShiftStore = create<ShiftState>((set, get) => ({
  shifts: [],
  validationResults: [],
  loading: false,
  _currentRange: null,

  fetchShifts: async (start, end, storeId) => {
    set({ loading: true, _currentRange: { start, end, storeId } });
    const shifts = await shiftQueries.getShiftsByDateRange(start, end, storeId);
    set({ shifts, loading: false });
  },

  addShift: async (entry) => {
    await shiftQueries.createShiftEntry(entry);
    const range = get()._currentRange;
    if (range) await get().fetchShifts(range.start, range.end, range.storeId);
  },

  editShift: async (id, data) => {
    await shiftQueries.updateShiftEntry(id, data);
    const range = get()._currentRange;
    if (range) await get().fetchShifts(range.start, range.end, range.storeId);
  },

  removeShift: async (id) => {
    await shiftQueries.deleteShiftEntry(id);
    const range = get()._currentRange;
    if (range) await get().fetchShifts(range.start, range.end, range.storeId);
  },

  runValidation: (staffList) => {
    const { shifts } = get();
    const validationResults = validateShifts(shifts, staffList);
    set({ validationResults });
  },

  deleteNonManualShifts: async (storeId, start, end) => {
    await shiftQueries.deleteNonManualShifts(storeId, start, end);
  },

  bulkInsertShifts: async (entries) => {
    await shiftQueries.bulkInsertShifts(entries);
    const range = get()._currentRange;
    if (range) await get().fetchShifts(range.start, range.end, range.storeId);
  },
}));
