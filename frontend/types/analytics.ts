// Response for total intensity per muscle
export interface TotalIntensityResponse {
  muscle: string;
  total_intensity: number;
}

// Response for intensity over time
export interface IntensityOverTimeResponse {
  timestamp: string;
  muscle: string;
  intensity: number;
}

// Query parameters for total intensity
export interface TotalIntensityQuery {
  start_date?: string;
  end_date?: string;
}

// Query parameters for intensity over time
export interface IntensityOverTimeQuery {
  muscle?: string;
  start_date?: string;
  end_date?: string;
}
