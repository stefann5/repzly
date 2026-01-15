use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Set {
    pub number: i32,
    pub volume_lower: Option<f64>,
    pub volume_upper: Option<f64>,
    pub intensity_lower: Option<f64>,
    pub intensity_upper: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkoutExercise {
    #[serde(rename(deserialize = "_id"))]
    pub id: String,
    pub program_id: String,
    pub week: i32,
    pub workout_number: i32, // global per program
    pub order: i32,          // order within workout
    pub exercise_id: String, // reference to exercise catalog
    pub volume_metric: Option<String>,    // "rep range", "reps", "time", etc.
    pub intensity_metric: Option<String>, // "RPE", "RIR", "percentage", etc.
    pub notes: Option<String>,
    pub sets: Vec<Set>,
}

/// Request body for upserting workout exercises
#[derive(Debug, Serialize, Deserialize)]
pub struct UpsertExercisesRequest {
    pub exercises: Vec<WorkoutExerciseInput>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkoutExerciseInput {
    pub id: String, // client-generated UUID
    pub week: i32,
    pub workout_number: i32,
    pub order: i32,
    pub exercise_id: String,
    pub volume_metric: Option<String>,    // "rep range", "reps", "time", etc.
    pub intensity_metric: Option<String>, // "RPE", "RIR", "percentage", etc.
    pub notes: Option<String>,
    pub sets: Vec<Set>,
}

/// Request body for deleting workouts by workout_number
#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteWorkoutsRequest {
    pub workout_numbers: Vec<i32>,
}

/// Request body for deleting exercises by ID
#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteExercisesRequest {
    pub ids: Vec<String>,
}

/// Response for a week's workouts (grouped)
#[derive(Debug, Serialize, Deserialize)]
pub struct WeekResponse {
    pub program_id: String,
    pub week: i32,
    pub total_weeks: i32,
    pub workouts: Vec<WorkoutGroup>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkoutGroup {
    pub workout_number: i32,
    pub exercises: Vec<WorkoutExercise>,
}
