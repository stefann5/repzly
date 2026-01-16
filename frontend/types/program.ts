// Program types
export interface Program {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  tags: string[];
  total_weeks: number;
  last_workout_number: number;
  public: boolean;
  created_at?: string;
  updated_at: string;
}

export interface CreateProgramRequest {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  total_weeks?: number;
  public?: boolean;
  created?: boolean;
}

export interface UpdateProgramRequest {
  name?: string;
  description?: string;
  tags?: string[];
  total_weeks?: number;
  public?: boolean;
  created?: boolean;
}

export interface ProgramSearchParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedProgramResponse {
  programs: Program[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Workout Exercise types
export interface Set {
  id?: string;
  number: number;
  volume_lower?: number;
  volume_upper?: number;
  intensity_lower?: number;
  intensity_upper?: number;
}

export interface WorkoutExercise {
  id: string;
  program_id: string;
  week: number;
  workout_number: number;
  order: number;
  exercise_id: string;
  volume_metric?: string;    // "reps", "rep range"
  intensity_metric?: string; // "rpe", "rpe range", "rir range"
  notes?: string;
  sets: Set[];
}

export interface WorkoutExerciseInput {
  id: string;
  week: number;
  workout_number: number;
  order: number;
  exercise_id: string;
  notes?: string;
  sets: Set[];
}

export interface UpsertExercisesRequest {
  exercises: WorkoutExerciseInput[];
}

export interface DeleteWorkoutsRequest {
  workout_numbers: number[];
}

export interface DeleteExercisesRequest {
  ids: string[];
}

export interface WorkoutGroup {
  workout_number: number;
  exercises: WorkoutExercise[];
}

export interface WeekResponse {
  program_id: string;
  week: number;
  total_weeks: number;
  workouts: WorkoutGroup[];
}
