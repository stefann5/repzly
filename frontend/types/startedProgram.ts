// Started Program types

export interface StartedProgram {
  id: string;
  user_id: string;
  program_id: string;
  program_name: string;
  program_image_url?: string;
  /** null means program is finished */
  current_workout_number: number | null;
  workout_started: boolean;
  updated_at: string;
}

export interface StartProgramRequest {
  program_id: string;
}

// Started Workout Exercise types

export interface StartedSet {
  number: number;
  volume_lower?: number;
  volume_upper?: number;
  intensity_lower?: number;
  intensity_upper?: number;
  done_volume?: number;
  done_intensity?: number;
}

export interface StartedWorkoutExercise {
  id: string;
  started_program_id: string;
  workout_number: number;
  week: number;
  order: number;
  exercise_id: string;
  volume_metric?: string;
  intensity_metric?: string;
  notes?: string;
  sets: StartedSet[];
  completed_at?: string;
}

export interface CurrentWorkoutResponse {
  started_program_id: string;
  workout_number: number;
  exercises: StartedWorkoutExercise[];
}

export interface UpdateExerciseProgressRequest {
  sets: StartedSet[];
}

// Workout History types

export interface WorkoutHistoryItem {
  workout_number: number;
  week: number;
  completed_at?: string;
}

export interface WeekHistoryGroup {
  week: number;
  workouts: WorkoutHistoryItem[];
}

export interface WorkoutHistoryResponse {
  started_program_id: string;
  program_name: string;
  program_image_url?: string;
  weeks: WeekHistoryGroup[];
}

export interface WorkoutHistoryDetailResponse {
  started_program_id: string;
  workout_number: number;
  week: number;
  completed_at?: string;
  exercises: StartedWorkoutExercise[];
}
