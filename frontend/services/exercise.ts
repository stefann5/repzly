import workoutApi from "@/utils/workoutApi";
import { Exercise, PaginatedExerciseResponse, MuscleIntensity } from "@/types/exercise";

export interface ExerciseQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateExerciseRequest {
  name: string;
  demonstration_link: string;
  muscles: MuscleIntensity[];
}

export interface UpdateExerciseRequest {
  name?: string;
  demonstration_link?: string;
  muscles?: MuscleIntensity[];
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

  // Create a new exercise (Admin only)
  create: async (data: CreateExerciseRequest): Promise<Exercise> => {
    const response = await workoutApi.post<Exercise>("/exercises", data);
    return response.data;
  },

  // Update an exercise (Admin only)
  update: async (exerciseId: string, data: UpdateExerciseRequest): Promise<Exercise> => {
    const response = await workoutApi.patch<Exercise>(`/exercises/${exerciseId}`, data);
    return response.data;
  },

  // Delete an exercise (Admin only)
  delete: async (exerciseId: string): Promise<void> => {
    await workoutApi.delete(`/exercises/${exerciseId}`);
  },
};
