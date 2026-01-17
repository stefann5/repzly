import { create } from "zustand";
import { Program, WorkoutGroup } from "@/types/program";
import { programService } from "@/services/program";

interface ViewProgramState {
  // Current viewed program
  viewedProgram: Program | null;
  currentWeek: number;
  workouts: WorkoutGroup[];
  currentWorkoutNumber: number | null;
  currentWorkoutOrder: number | null;

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Actions
  setViewedProgram: (program: Program) => void;
  setCurrentWeek: (week: number) => void;
  setCurrentWorkoutNumber: (workoutNumber: number | null) => void;
  setCurrentWorkoutOrder: (order: number | null) => void;
  loadProgram: (programId: string) => Promise<void>;
  loadWeek: (programId: string, week: number) => Promise<void>;
  clearViewState: () => void;
}

export const useViewProgramStore = create<ViewProgramState>((set, get) => ({
  viewedProgram: null,
  currentWeek: 1,
  workouts: [],
  currentWorkoutNumber: null,
  currentWorkoutOrder: null,
  isLoading: false,
  error: null,

  setViewedProgram: (program) => set({ viewedProgram: program }),

  setCurrentWeek: (week) => set({ currentWeek: week }),

  setCurrentWorkoutNumber: (workoutNumber) => set({ currentWorkoutNumber: workoutNumber }),

  setCurrentWorkoutOrder: (order) => set({ currentWorkoutOrder: order }),

  loadProgram: async (programId) => {
    set({ isLoading: true, error: null });
    try {
      const program = await programService.get(programId);
      set({ viewedProgram: program, currentWeek: 1 });
      // Load the first week
      await get().loadWeek(programId, 1);
    } catch (err) {
      set({ error: "Failed to load program" });
      console.error("Failed to load program:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  loadWeek: async (programId, week) => {
    set({ isLoading: true, error: null });
    try {
      const response = await programService.getWeek(programId, week);
      set({
        workouts: response.workouts,
        currentWeek: week,
      });
    } catch (err) {
      set({ error: "Failed to load week" });
      console.error("Failed to load week:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  clearViewState: () => set({
    viewedProgram: null,
    currentWeek: 1,
    workouts: [],
    currentWorkoutNumber: null,
    currentWorkoutOrder: null,
    isLoading: false,
    error: null,
  }),
}));
