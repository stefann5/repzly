export interface MuscleIntensity {
  muscle: string;
  intensity: number;
}

export interface Exercise {
  id: string;
  name: string;
  demonstration_link: string;
  muscles: MuscleIntensity[];
}

export interface PaginatedExerciseResponse {
  exercises: Exercise[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
