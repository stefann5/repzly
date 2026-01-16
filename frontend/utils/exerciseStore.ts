import { create } from "zustand";
import { Exercise } from "@/types/exercise";
import { exerciseService } from "@/services/exercise";

interface ExerciseState {
  exercises: Exercise[];
  exerciseMap: Map<string, Exercise>;
  isLoaded: boolean;
  isLoading: boolean;

  // Actions
  loadExercises: () => Promise<void>;
  getExerciseName: (exerciseId: string) => string;
  getExercise: (exerciseId: string) => Exercise | undefined;
  addToCache: (exercises: Exercise[]) => void;
}

export const useExerciseStore = create<ExerciseState>((set, get) => ({
  exercises: [],
  exerciseMap: new Map(),
  isLoaded: false,
  isLoading: false,

  loadExercises: async () => {
    if (get().isLoaded || get().isLoading) return;

    set({ isLoading: true });
    try {
      // Load all exercises for the cache (high limit for initial load)
      const response = await exerciseService.getAll({ limit: 1000 });
      const exercises = response.exercises;
      const exerciseMap = new Map<string, Exercise>();
      exercises.forEach((e) => exerciseMap.set(e.id, e));
      set({ exercises, exerciseMap, isLoaded: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error("Failed to load exercises:", error);
    }
  },

  getExerciseName: (exerciseId: string) => {
    const exercise = get().exerciseMap.get(exerciseId);
    return exercise?.name || exerciseId || "Select Exercise";
  },

  getExercise: (exerciseId: string) => {
    return get().exerciseMap.get(exerciseId);
  },

  addToCache: (exercises: Exercise[]) => {
    set((state) => {
      const newMap = new Map(state.exerciseMap);
      exercises.forEach((e) => newMap.set(e.id, e));
      return {
        exercises: [...state.exercises, ...exercises.filter(e => !state.exerciseMap.has(e.id))],
        exerciseMap: newMap,
      };
    });
  },
}));
