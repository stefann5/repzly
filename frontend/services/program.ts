import workoutApi from "@/utils/workoutApi";
import {
  Program,
  CreateProgramRequest,
  UpdateProgramRequest,
  WeekResponse,
  UpsertExercisesRequest,
  DeleteWorkoutsRequest,
  DeleteExercisesRequest,
} from "@/types/program";

export const programService = {
  // Create a new program
  create: async (data: CreateProgramRequest): Promise<Program> => {
    const response = await workoutApi.post<Program>("/programs", data);
    return response.data;
  },

  // Get all programs for user
  getAll: async (): Promise<Program[]> => {
    const response = await workoutApi.get<Program[]>("/programs");
    return response.data;
  },

  // Get a specific program
  get: async (programId: string): Promise<Program> => {
    const response = await workoutApi.get<Program>(`/programs/${programId}`);
    return response.data;
  },

  // Update program info
  update: async (programId: string, data: UpdateProgramRequest): Promise<Program> => {
    const response = await workoutApi.patch<Program>(`/programs/${programId}`, data);
    return response.data;
  },

  // Delete a program
  delete: async (programId: string): Promise<void> => {
    await workoutApi.delete(`/programs/${programId}`);
  },

  // Get workouts for a specific week
  getWeek: async (programId: string, week: number): Promise<WeekResponse> => {
    const response = await workoutApi.get<WeekResponse>(
      `/programs/${programId}/workouts?week=${week}`
    );
    return response.data;
  },

  // Upsert workout exercises
  upsertExercises: async (programId: string, data: UpsertExercisesRequest): Promise<void> => {
    await workoutApi.put(`/programs/${programId}/workout-exercises`, data);
  },

  // Delete workouts by workout numbers
  deleteWorkouts: async (programId: string, data: DeleteWorkoutsRequest): Promise<void> => {
    await workoutApi.delete(`/programs/${programId}/workouts`, { data });
  },

  // Delete exercises by IDs
  deleteExercises: async (programId: string, data: DeleteExercisesRequest): Promise<void> => {
    await workoutApi.delete(`/programs/${programId}/workout-exercises`, { data });
  },

  // Upload program image
  uploadImage: async (programId: string, imageUri: string): Promise<Program> => {
    const formData = new FormData();

    // Get file extension from URI
    const uriParts = imageUri.split(".");
    const fileType = uriParts[uriParts.length - 1];

    formData.append("image", {
      uri: imageUri,
      name: `program-image.${fileType}`,
      type: `image/${fileType === "jpg" ? "jpeg" : fileType}`,
    } as unknown as Blob);

    const response = await workoutApi.post<Program>(
      `/programs/${programId}/image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },
};
