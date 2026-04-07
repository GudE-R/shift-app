import { create } from "zustand";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks } from "date-fns";

type ViewMode = "month" | "week";

interface CalendarState {
  currentDate: Date;
  viewMode: ViewMode;
  selectedStoreId: string | null;
  setViewMode: (mode: ViewMode) => void;
  setSelectedStoreId: (id: string | null) => void;
  goNext: () => void;
  goPrev: () => void;
  goToday: () => void;
  getDateRange: () => { start: string; end: string };
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  currentDate: new Date(),
  viewMode: "month",
  selectedStoreId: null,

  setViewMode: (viewMode) => set({ viewMode }),
  setSelectedStoreId: (selectedStoreId) => set({ selectedStoreId }),

  goNext: () => {
    const { currentDate, viewMode } = get();
    set({ currentDate: viewMode === "month" ? addMonths(currentDate, 1) : addWeeks(currentDate, 1) });
  },

  goPrev: () => {
    const { currentDate, viewMode } = get();
    set({ currentDate: viewMode === "month" ? subMonths(currentDate, 1) : subWeeks(currentDate, 1) });
  },

  goToday: () => set({ currentDate: new Date() }),

  getDateRange: () => {
    const { currentDate, viewMode } = get();
    if (viewMode === "month") {
      return {
        start: format(startOfMonth(currentDate), "yyyy-MM-dd"),
        end: format(endOfMonth(currentDate), "yyyy-MM-dd"),
      };
    }
    return {
      start: format(startOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      end: format(endOfWeek(currentDate, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
  },
}));
