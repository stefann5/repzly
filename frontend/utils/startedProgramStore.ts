import { create } from "zustand";
import {
  StartedProgram,
  CurrentWorkoutResponse,
  StartedSet,
  WorkoutHistoryResponse,
  WorkoutHistoryDetailResponse,
} from "@/types/startedProgram";
import { startedProgramService } from "@/services/startedProgram";

interface StartedProgramState {
  // List of all started programs
  startedPrograms: StartedProgram[];
  isLoadingPrograms: boolean;

  // Active workout state
  activeStartedProgram: StartedProgram | null;
  currentWorkout: CurrentWorkoutResponse | null;
  isLoadingWorkout: boolean;

  // Workout history state
  workoutHistory: WorkoutHistoryResponse | null;
  workoutHistoryDetail: WorkoutHistoryDetailResponse | null;
  isLoadingHistory: boolean;

  // Actions
  loadStartedPrograms: () => Promise<void>;
  startProgram: (programId: string) => Promise<StartedProgram>;
  deleteStartedProgram: (startedProgramId: string) => Promise<void>;
  setActiveStartedProgram: (program: StartedProgram | null) => void;
  startWorkout: (startedProgramId: string) => Promise<void>;
  loadCurrentWorkout: (startedProgramId: string) => Promise<void>;
  updateExerciseProgress: (
    exerciseId: string,
    sets: StartedSet[]
  ) => Promise<void>;
  finishWorkout: (startedProgramId: string) => Promise<void>;
  clearActiveWorkout: () => void;

  // Workout history actions
  loadWorkoutHistory: (startedProgramId: string) => Promise<void>;
  loadWorkoutHistoryDetail: (
    startedProgramId: string,
    workoutNumber: number
  ) => Promise<void>;
  clearWorkoutHistory: () => void;
}

export const useStartedProgramStore = create<StartedProgramState>((set, get) => ({
  startedPrograms: [],
  isLoadingPrograms: false,
  activeStartedProgram: null,
  currentWorkout: null,
  isLoadingWorkout: false,
  workoutHistory: null,
  workoutHistoryDetail: null,
  isLoadingHistory: false,

  loadStartedPrograms: async () => {
    set({ isLoadingPrograms: true });
    try {
      const programs = await startedProgramService.getAll();
      set({ startedPrograms: programs, isLoadingPrograms: false });
    } catch (error) {
      console.error("Failed to load started programs:", error);
      set({ isLoadingPrograms: false });
    }
  },

  startProgram: async (programId: string) => {
    const newProgram = await startedProgramService.startProgram(programId);
    set((state) => ({
      startedPrograms: [newProgram, ...state.startedPrograms],
    }));
    return newProgram;
  },

  deleteStartedProgram: async (startedProgramId: string) => {
    await startedProgramService.delete(startedProgramId);
    set((state) => ({
      startedPrograms: state.startedPrograms.filter(
        (p) => p.id !== startedProgramId
      ),
    }));
  },

  setActiveStartedProgram: (program: StartedProgram | null) => {
    set({ activeStartedProgram: program });
  },

  startWorkout: async (startedProgramId: string) => {
    const updatedProgram = await startedProgramService.startWorkout(
      startedProgramId
    );
    set((state) => ({
      activeStartedProgram: updatedProgram,
      startedPrograms: state.startedPrograms.map((p) =>
        p.id === startedProgramId ? updatedProgram : p
      ),
    }));
  },

  loadCurrentWorkout: async (startedProgramId: string) => {
    set({ isLoadingWorkout: true });
    try {
      const workout = await startedProgramService.getCurrentWorkout(
        startedProgramId
      );
      set({ currentWorkout: workout, isLoadingWorkout: false });
    } catch (error) {
      console.error("Failed to load current workout:", error);
      set({ isLoadingWorkout: false });
    }
  },

  updateExerciseProgress: async (exerciseId: string, sets: StartedSet[]) => {
    const { activeStartedProgram, currentWorkout } = get();
    if (!activeStartedProgram || !currentWorkout) return;

    const updatedExercise = await startedProgramService.updateExerciseProgress(
      activeStartedProgram.id,
      exerciseId,
      { sets }
    );

    // Update local state
    set({
      currentWorkout: {
        ...currentWorkout,
        exercises: currentWorkout.exercises.map((e) =>
          e.id === exerciseId ? updatedExercise : e
        ),
      },
    });
  },

  finishWorkout: async (startedProgramId: string) => {
    const updatedProgram = await startedProgramService.finishWorkout(
      startedProgramId
    );
    set((state) => ({
      activeStartedProgram: updatedProgram,
      currentWorkout: null,
      startedPrograms: state.startedPrograms.map((p) =>
        p.id === startedProgramId ? updatedProgram : p
      ),
    }));
  },

  clearActiveWorkout: () => {
    set({ activeStartedProgram: null, currentWorkout: null });
  },

  loadWorkoutHistory: async (startedProgramId: string) => {
    set({ isLoadingHistory: true });
    try {
      const history = await startedProgramService.getWorkoutHistory(
        startedProgramId
      );
      set({ workoutHistory: history, isLoadingHistory: false });
    } catch (error) {
      console.error("Failed to load workout history:", error);
      set({ isLoadingHistory: false });
    }
  },

  loadWorkoutHistoryDetail: async (
    startedProgramId: string,
    workoutNumber: number
  ) => {
    set({ isLoadingHistory: true });
    try {
      const detail = await startedProgramService.getWorkoutHistoryDetail(
        startedProgramId,
        workoutNumber
      );
      set({ workoutHistoryDetail: detail, isLoadingHistory: false });
    } catch (error) {
      console.error("Failed to load workout history detail:", error);
      set({ isLoadingHistory: false });
    }
  },

  clearWorkoutHistory: () => {
    set({ workoutHistory: null, workoutHistoryDetail: null });
  },
}));
