import { useState } from "react";
import { useProgramStore, generateId } from "@/utils/programStore";
import { programService } from "@/services/program";
import { CreateProgramRequest, UpdateProgramRequest } from "@/types/program";

export function useProgram() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    currentProgram,
    setCurrentProgram,
    programs,
    setPrograms,
    currentWeek,
    setCurrentWeek,
    workouts,
    setWorkouts,
    addWorkout,
    addExercise,
    addSet,
    updateExercise,
    updateSet,
    deleteWorkout,
    deleteExercise,
    deleteSet,
    getChangedExercisesArray,
    clearChanges,
  } = useProgramStore();

  // Fetch all programs
  const fetchPrograms = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await programService.getAll();
      setPrograms(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch programs");
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new program (draft)
  const createProgram = async (data: Omit<CreateProgramRequest, "id">) => {
    setIsLoading(true);
    setError(null);
    try {
      const program = await programService.create({
        ...data,
        id: generateId(),
        created: false,
      });
      setCurrentProgram(program);
      setCurrentWeek(1);
      setWorkouts([]);
      clearChanges();
      return program;
    } catch (err: any) {
      setError(err.message || "Failed to create program");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update program info
  const updateProgram = async (programId: string, data: UpdateProgramRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const program = await programService.update(programId, data);
      setCurrentProgram(program);
      return program;
    } catch (err: any) {
      setError(err.message || "Failed to update program");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Finish program (set created: true)
  const finishProgram = async (programId: string) => {
    return updateProgram(programId, { created: true });
  };

  // Load a program for editing
  const loadProgram = async (programId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const program = await programService.get(programId);
      setCurrentProgram(program);
      setCurrentWeek(1);
      await loadWeek(programId, 1);
      return program;
    } catch (err: any) {
      setError(err.message || "Failed to load program");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Load workouts for a specific week
  const loadWeek = async (programId: string, week: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await programService.getWeek(programId, week);
      
      // Assign IDs to sets using exerciseId-number pattern
      const normalizedWorkouts = data.workouts.map((workout) => ({
        ...workout,
        exercises: workout.exercises.map((exercise) => ({
          ...exercise,
          sets: exercise.sets.map((set) => ({
            ...set,
            id: `${exercise.id}-${set.number}`,
          })),
        })),
      }));
      
      setWorkouts(normalizedWorkouts);
      setCurrentWeek(week);
    } catch (err: any) {
      setError(err.message || "Failed to load week");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Save changes (upsert changed exercises)
  const saveChanges = async (programId: string) => {
    const changedExercises = getChangedExercisesArray();
    if (changedExercises.length === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      // Find max workout number to update last_workout_number
      const maxWorkoutNumber = Math.max(
        ...changedExercises.map((e) => e.workout_number),
        currentProgram?.last_workout_number || 0
      );

      await programService.upsertExercises(programId, {
        exercises: changedExercises.map((e) => ({
          id: e.id,
          week: e.week,
          workout_number: e.workout_number,
          order: e.order,
          exercise_id: e.exercise_id,
          notes: e.notes,
          sets: e.sets,
        })),
      });

      // Update local program with new last_workout_number
      if (currentProgram && maxWorkoutNumber > currentProgram.last_workout_number) {
        setCurrentProgram({ ...currentProgram, last_workout_number: maxWorkoutNumber });
      }

      clearChanges();
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a workout
  const removeWorkout = async (programId: string, workoutNumber: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await programService.deleteWorkouts(programId, { workout_numbers: [workoutNumber] });
      deleteWorkout(workoutNumber);
    } catch (err: any) {
      setError(err.message || "Failed to delete workout");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete an exercise
  const removeExercise = async (programId: string, exerciseId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await programService.deleteExercises(programId, { ids: [exerciseId] });
      deleteExercise(exerciseId);
    } catch (err: any) {
      setError(err.message || "Failed to delete exercise");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a program
  const removeProgram = async (programId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await programService.delete(programId);
      setPrograms(programs.filter((p) => p.id !== programId));
    } catch (err: any) {
      setError(err.message || "Failed to delete program");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // State
    currentProgram,
    programs,
    currentWeek,
    workouts,
    isLoading,
    error,

    // Program operations
    fetchPrograms,
    createProgram,
    updateProgram,
    finishProgram,
    loadProgram,
    loadWeek,
    saveChanges,
    removeProgram,

    // Workout operations
    addWorkout: (week: number) => {
      const newWorkoutNumber = addWorkout(week, currentProgram?.last_workout_number || 0);
      // Update local program with new last_workout_number
      if (currentProgram) {
        setCurrentProgram({ ...currentProgram, last_workout_number: newWorkoutNumber });
      }
      return newWorkoutNumber;
    },
    removeWorkout,

    // Exercise operations
    addExercise,
    updateExercise,
    removeExercise,

    // Set operations
    addSet,
    updateSet,
    deleteSet,

    // Utils
    setCurrentWeek,
    clearCurrentProgram: () => setCurrentProgram(null),
    hasChanges: getChangedExercisesArray().length > 0,
  };
}
