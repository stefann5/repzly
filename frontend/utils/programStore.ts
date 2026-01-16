import { create } from "zustand";
import { Program, WorkoutExercise, WorkoutGroup, Set } from "@/types/program";

// Generate UUID
export const generateId = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface ProgramState {
  // Current program being edited
  currentProgram: Program | null;
  setCurrentProgram: (program: Program | null) => void;

  // Programs list
  programs: Program[];
  setPrograms: (programs: Program[]) => void;

  // Current week being viewed
  currentWeek: number;
  setCurrentWeek: (week: number) => void;

  // Current workout being edited
  currentWorkoutNumber: number | null;
  setCurrentWorkoutNumber: (workoutNumber: number | null) => void;

  // Order of workout being edited within the week
  currentWorkoutOrder: number | null;
  setCurrentWorkoutOrder: (order: number | null) => void;

  // Workouts for current week (grouped)
  workouts: WorkoutGroup[];
  setWorkouts: (workouts: WorkoutGroup[]) => void;

  // Track changes for saving
  changedExercises: Map<string, WorkoutExercise>;
  markExerciseChanged: (exercise: WorkoutExercise) => void;
  clearChanges: () => void;

  // Local workout operations
  addWorkout: (week: number, lastWorkoutNumber: number, exerciseIds: string[]) => number;
  addExercise: (workoutNumber: number, week: number, exerciseId: string) => void;
  addMultipleExercises: (workoutNumber: number, week: number, exerciseIds: string[]) => void;
  addSet: (exerciseId: string) => void;
  updateExercise: (exerciseId: string, updates: Partial<WorkoutExercise>) => void;
  updateSet: (exerciseId: string, setNumber: number, updates: Partial<Set>) => void;
  deleteWorkout: (workoutNumber: number) => void;
  deleteExercise: (exerciseId: string) => void;
  deleteSet: (exerciseId: string, setNumber: number) => void;

  // Get all changed exercises as array
  getChangedExercisesArray: () => WorkoutExercise[];
}

export const useProgramStore = create<ProgramState>((set, get) => ({
  currentProgram: null,
  setCurrentProgram: (program) => set({ currentProgram: program }),

  programs: [],
  setPrograms: (programs) => set({ programs }),

  currentWeek: 1,
  setCurrentWeek: (week) => set({ currentWeek: week }),

  currentWorkoutNumber: null,
  setCurrentWorkoutNumber: (workoutNumber) => set({ currentWorkoutNumber: workoutNumber }),

  currentWorkoutOrder: null,
  setCurrentWorkoutOrder: (order) => set({ currentWorkoutOrder: order }),

  workouts: [],
  setWorkouts: (workouts) => set({ workouts }),

  changedExercises: new Map(),
  markExerciseChanged: (exercise) => {
    set((state) => {
      const newMap = new Map(state.changedExercises);
      newMap.set(exercise.id, exercise);
      return { changedExercises: newMap };
    });
  },
  clearChanges: () => set({ changedExercises: new Map() }),

  addWorkout: (week, lastWorkoutNumber, exerciseIds) => {
    const newWorkoutNumber = lastWorkoutNumber + 1;
    const programId = get().currentProgram?.id || "";

    const newExercises: WorkoutExercise[] = exerciseIds.map((exId, index) => {
      const id = generateId();
      return {
        id,
        program_id: programId,
        week,
        workout_number: newWorkoutNumber,
        order: index + 1,
        exercise_id: exId,
        sets: [{ id: `${id}-1`, number: 1 }],
      };
    });

    set((state) => {
      const newWorkouts = [
        ...state.workouts,
        { workout_number: newWorkoutNumber, exercises: newExercises },
      ];
      const newChanges = new Map(state.changedExercises);
      newExercises.forEach((e) => newChanges.set(e.id, e));
      return { workouts: newWorkouts, changedExercises: newChanges };
    });

    return newWorkoutNumber;
  },

  addExercise: (workoutNumber, week, exerciseId) => {
    const id = generateId();
    const newExercise: WorkoutExercise = {
      id,
      program_id: get().currentProgram?.id || "",
      week,
      workout_number: workoutNumber,
      order: 0,
      exercise_id: exerciseId,
      sets: [{ id: `${id}-1`, number: 1 }],
    };

    set((state) => {
      const newWorkouts = state.workouts.map((w) => {
        if (w.workout_number === workoutNumber) {
          const newOrder = w.exercises.length + 1;
          newExercise.order = newOrder;
          return { ...w, exercises: [...w.exercises, newExercise] };
        }
        return w;
      });
      const newChanges = new Map(state.changedExercises);
      newChanges.set(newExercise.id, newExercise);
      return { workouts: newWorkouts, changedExercises: newChanges };
    });
  },

  addMultipleExercises: (workoutNumber, week, exerciseIds) => {
    const programId = get().currentProgram?.id || "";

    set((state) => {
      const workout = state.workouts.find((w) => w.workout_number === workoutNumber);
      const startOrder = workout ? workout.exercises.length + 1 : 1;

      const newExercises: WorkoutExercise[] = exerciseIds.map((exId, index) => {
        const id = generateId();
        return {
          id,
          program_id: programId,
          week,
          workout_number: workoutNumber,
          order: startOrder + index,
          exercise_id: exId,
          sets: [{ id: `${id}-1`, number: 1 }],
        };
      });

      const newWorkouts = state.workouts.map((w) => {
        if (w.workout_number === workoutNumber) {
          return { ...w, exercises: [...w.exercises, ...newExercises] };
        }
        return w;
      });

      const newChanges = new Map(state.changedExercises);
      newExercises.forEach((e) => newChanges.set(e.id, e));
      return { workouts: newWorkouts, changedExercises: newChanges };
    });
  },

  addSet: (exerciseId) => {
    set((state) => {
      let updatedExerciseId: string | null = null;
      let updatedExerciseData: WorkoutExercise | null = null;

      const newWorkouts = state.workouts.map((w) => ({
        ...w,
        exercises: w.exercises.map((e) => {
          if (e.id === exerciseId) {
            const newSetNumber = e.sets.length + 1;
            const updated: WorkoutExercise = { ...e, sets: [...e.sets, { id: `${exerciseId}-${newSetNumber}`, number: newSetNumber }] };
            updatedExerciseId = updated.id;
            updatedExerciseData = updated;
            return updated;
          }
          return e;
        }),
      }));
      
      const newChanges = new Map(state.changedExercises);
      if (updatedExerciseId && updatedExerciseData) {
        newChanges.set(updatedExerciseId, updatedExerciseData);
      }
      
      return { workouts: newWorkouts, changedExercises: newChanges };
    });
  },

  updateExercise: (exerciseId, updates) => {
    set((state) => {
      let updatedExerciseId: string | null = null;
      let updatedExerciseData: WorkoutExercise | null = null;
      
      const newWorkouts = state.workouts.map((w) => ({
        ...w,
        exercises: w.exercises.map((e) => {
          if (e.id === exerciseId) {
            const updated: WorkoutExercise = { ...e, ...updates };
            updatedExerciseId = updated.id;
            updatedExerciseData = updated;
            return updated;
          }
          return e;
        }),
      }));
      
      const newChanges = new Map(state.changedExercises);
      if (updatedExerciseId && updatedExerciseData) {
        newChanges.set(updatedExerciseId, updatedExerciseData);
      }
      
      return { workouts: newWorkouts, changedExercises: newChanges };
    });
  },

  updateSet: (exerciseId, setNumber, updates) => {
    set((state) => {
      let updatedExerciseId: string | null = null;
      let updatedExerciseData: WorkoutExercise | null = null;
      
      const newWorkouts = state.workouts.map((w) => ({
        ...w,
        exercises: w.exercises.map((e) => {
          if (e.id === exerciseId) {
            const updated: WorkoutExercise = {
              ...e,
              sets: e.sets.map((s) =>
                s.number === setNumber ? { ...s, ...updates } : s
              ),
            };
            updatedExerciseId = updated.id;
            updatedExerciseData = updated;
            return updated;
          }
          return e;
        }),
      }));
      
      const newChanges = new Map(state.changedExercises);
      if (updatedExerciseId && updatedExerciseData) {
        newChanges.set(updatedExerciseId, updatedExerciseData);
      }
      
      return { workouts: newWorkouts, changedExercises: newChanges };
    });
  },

  deleteWorkout: (workoutNumber) => {
    set((state) => ({
      workouts: state.workouts.filter((w) => w.workout_number !== workoutNumber),
    }));
  },

  deleteExercise: (exerciseId) => {
    set((state) => {
      const newWorkouts = state.workouts.map((w) => ({
        ...w,
        exercises: w.exercises.filter((e) => e.id !== exerciseId),
      }));
      // Remove empty workouts
      return { workouts: newWorkouts.filter((w) => w.exercises.length > 0) };
    });
  },

  deleteSet: (exerciseId, setNumber) => {
    set((state) => {
      let updatedExerciseId: string | null = null;
      let updatedExerciseData: WorkoutExercise | null = null;
      
      const newWorkouts = state.workouts.map((w) => ({
        ...w,
        exercises: w.exercises.map((e) => {
          if (e.id === exerciseId) {
            const updated: WorkoutExercise = {
              ...e,
              sets: e.sets
                .filter((s) => s.number !== setNumber)
                .map((s, idx) => ({ ...s, number: idx + 1 })),
            };
            updatedExerciseId = updated.id;
            updatedExerciseData = updated;
            return updated;
          }
          return e;
        }),
      }));
      
      const newChanges = new Map(state.changedExercises);
      if (updatedExerciseId && updatedExerciseData) {
        newChanges.set(updatedExerciseId, updatedExerciseData);
      }
      
      return { workouts: newWorkouts, changedExercises: newChanges };
    });
  },

  getChangedExercisesArray: () => {
    return Array.from(get().changedExercises.values());
  },
}));