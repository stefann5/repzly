import workoutApi from "@/utils/workoutApi";
import {
  StartedProgram,
  StartProgramRequest,
  CurrentWorkoutResponse,
  StartedWorkoutExercise,
  UpdateExerciseProgressRequest,
  WorkoutHistoryResponse,
  WorkoutHistoryDetailResponse,
} from "@/types/startedProgram";

export const startedProgramService = {
  // Start a new program
  startProgram: async (programId: string): Promise<StartedProgram> => {
    const response = await workoutApi.post<StartedProgram>("/started-programs", {
      program_id: programId,
    } as StartProgramRequest);
    return response.data;
  },

  // Get all started programs for the current user
  getAll: async (): Promise<StartedProgram[]> => {
    const response = await workoutApi.get<StartedProgram[]>("/started-programs");
    return response.data;
  },

  // Get a specific started program
  get: async (startedProgramId: string): Promise<StartedProgram> => {
    const response = await workoutApi.get<StartedProgram>(
      `/started-programs/${startedProgramId}`
    );
    return response.data;
  },

  // Delete a started program
  delete: async (startedProgramId: string): Promise<void> => {
    await workoutApi.delete(`/started-programs/${startedProgramId}`);
  },

  // Start a workout (set workout_started to true)
  startWorkout: async (startedProgramId: string): Promise<StartedProgram> => {
    const response = await workoutApi.post<StartedProgram>(
      `/started-programs/${startedProgramId}/start-workout`
    );
    return response.data;
  },

  // Finish a workout
  finishWorkout: async (startedProgramId: string): Promise<StartedProgram> => {
    const response = await workoutApi.post<StartedProgram>(
      `/started-programs/${startedProgramId}/finish-workout`
    );
    return response.data;
  },

  // Get current workout exercises
  getCurrentWorkout: async (
    startedProgramId: string
  ): Promise<CurrentWorkoutResponse> => {
    const response = await workoutApi.get<CurrentWorkoutResponse>(
      `/started-programs/${startedProgramId}/current-workout`
    );
    return response.data;
  },

  // Update exercise progress
  updateExerciseProgress: async (
    startedProgramId: string,
    exerciseId: string,
    request: UpdateExerciseProgressRequest
  ): Promise<StartedWorkoutExercise> => {
    const response = await workoutApi.patch<StartedWorkoutExercise>(
      `/started-programs/${startedProgramId}/exercises/${exerciseId}`,
      request
    );
    return response.data;
  },

  // Get workout history overview (all completed workouts grouped by week)
  getWorkoutHistory: async (
    startedProgramId: string
  ): Promise<WorkoutHistoryResponse> => {
    const response = await workoutApi.get<WorkoutHistoryResponse>(
      `/started-programs/${startedProgramId}/workout-history`
    );
    return response.data;
  },

  // Get specific workout history detail
  getWorkoutHistoryDetail: async (
    startedProgramId: string,
    workoutNumber: number
  ): Promise<WorkoutHistoryDetailResponse> => {
    const response = await workoutApi.get<WorkoutHistoryDetailResponse>(
      `/started-programs/${startedProgramId}/workout-history/${workoutNumber}`
    );
    return response.data;
  },
};
