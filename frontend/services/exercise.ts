import workoutApi from "@/utils/workoutApi";
import { Exercise, PaginatedExerciseResponse } from "@/types/exercise";

export interface ExerciseQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const exerciseService = {
  // Get exercises with pagination and search
  getAll: async (params?: ExerciseQueryParams): Promise<PaginatedExerciseResponse> => {
    const response = await workoutApi.get<PaginatedExerciseResponse>("/exercises", {
      params: {
        search: params?.search,
        page: params?.page,
        limit: params?.limit,
      },
    });
    return response.data;
  },

  // Get a specific exercise
  get: async (exerciseId: string): Promise<Exercise> => {
    const response = await workoutApi.get<Exercise>(`/exercises/${exerciseId}`);
    return response.data;
  },
};
