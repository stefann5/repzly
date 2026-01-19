use bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Set {
    pub number: i32,
    pub volume_lower: Option<f64>,
    pub volume_upper: Option<f64>,
    pub intensity_lower: Option<f64>,
    pub intensity_upper: Option<f64>,
}

/// WorkoutExercise model for MongoDB storage - uses native ObjectId
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkoutExercise {
    #[serde(rename = "_id")]
    pub id: ObjectId,
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

/// WorkoutExercise response for JSON output - uses hex string ID
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkoutExerciseResponse {
    pub id: String,
    pub program_id: String,
    pub week: i32,
    pub workout_number: i32,
    pub order: i32,
    pub exercise_id: String,
    pub volume_metric: Option<String>,
    pub intensity_metric: Option<String>,
    pub notes: Option<String>,
    pub sets: Vec<Set>,
}

impl From<WorkoutExercise> for WorkoutExerciseResponse {
    fn from(e: WorkoutExercise) -> Self {
        Self {
            id: e.id.to_hex(),
            program_id: e.program_id,
            week: e.week,
            workout_number: e.workout_number,
            order: e.order,
            exercise_id: e.exercise_id,
            volume_metric: e.volume_metric,
            intensity_metric: e.intensity_metric,
            notes: e.notes,
            sets: e.sets,
        }
    }
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

/// Response for upsert exercises with ID mappings
#[derive(Debug, Serialize, Deserialize)]
pub struct UpsertExercisesResponse {
    /// Mapping of temporary IDs to real MongoDB ObjectIds
    /// Only includes entries for IDs that were replaced
    pub id_mappings: Vec<IdMapping>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IdMapping {
    pub temp_id: String,
    pub real_id: String,
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
    pub exercises: Vec<WorkoutExerciseResponse>,
}
