import workoutApi from "@/utils/workoutApi";
import {
  TotalIntensityResponse,
  IntensityOverTimeResponse,
  TotalIntensityQuery,
  IntensityOverTimeQuery,
} from "@/types/analytics";

export const analyticsService = {
  // Get total intensity per muscle within a date range
  getTotalIntensity: async (
    params?: TotalIntensityQuery
  ): Promise<TotalIntensityResponse[]> => {
    const response = await workoutApi.get<TotalIntensityResponse[]>(
      "/analytics/total-intensity",
      { params }
    );
    return response.data;
  },

  // Get intensity over time for a specific muscle or all muscles
  getIntensityOverTime: async (
    params?: IntensityOverTimeQuery
  ): Promise<IntensityOverTimeResponse[]> => {
    const response = await workoutApi.get<IntensityOverTimeResponse[]>(
      "/analytics/intensity-over-time",
      { params }
    );
    return response.data;
  },
};
