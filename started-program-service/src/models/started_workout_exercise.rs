use bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Set with tracking for completed work
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StartedSet {
    pub number: i32,
    pub volume_lower: Option<f64>,
    pub volume_upper: Option<f64>,
    pub intensity_lower: Option<f64>,
    pub intensity_upper: Option<f64>,
    pub done_volume: Option<f64>,
    pub done_intensity: Option<f64>,
}

/// StartedWorkoutExercise model for MongoDB storage
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StartedWorkoutExercise {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub user_id: String,
    pub started_program_id: String,
    pub workout_number: i32,
    pub week: i32,
    pub order: i32,
    pub exercise_id: String,
    pub volume_metric: Option<String>,
    pub intensity_metric: Option<String>,
    pub notes: Option<String>,
    pub sets: Vec<StartedSet>,
    /// When this workout exercise was completed (null if still in progress)
    pub completed_at: Option<DateTime<Utc>>,
    /// Last time this exercise was updated
    pub updated_at: DateTime<Utc>,
}

/// StartedWorkoutExercise response for JSON output
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StartedWorkoutExerciseResponse {
    pub id: String,
    pub started_program_id: String,
    pub workout_number: i32,
    pub week: i32,
    pub order: i32,
    pub exercise_id: String,
    pub volume_metric: Option<String>,
    pub intensity_metric: Option<String>,
    pub notes: Option<String>,
    pub sets: Vec<StartedSet>,
    pub completed_at: Option<String>,
    pub updated_at: String,
}

impl From<StartedWorkoutExercise> for StartedWorkoutExerciseResponse {
    fn from(e: StartedWorkoutExercise) -> Self {
        Self {
            id: e.id.to_hex(),
            started_program_id: e.started_program_id,
            workout_number: e.workout_number,
            week: e.week,
            order: e.order,
            exercise_id: e.exercise_id,
            volume_metric: e.volume_metric,
            intensity_metric: e.intensity_metric,
            notes: e.notes,
            sets: e.sets,
            completed_at: e.completed_at.map(|d| d.to_rfc3339()),
            updated_at: e.updated_at.to_rfc3339(),
        }
    }
}

/// Request to update exercise progress
#[derive(Debug, Deserialize)]
pub struct UpdateExerciseProgressRequest {
    pub sets: Vec<StartedSet>,
}

/// Response for current workout
#[derive(Debug, Serialize)]
pub struct CurrentWorkoutResponse {
    pub started_program_id: String,
    pub workout_number: i32,
    pub exercises: Vec<StartedWorkoutExerciseResponse>,
}

/// Workout info for history (grouped by week)
#[derive(Debug, Serialize)]
pub struct WorkoutHistoryItem {
    pub workout_number: i32,
    pub week: i32,
    pub completed_at: Option<String>,
}

/// Week group for workout history
#[derive(Debug, Serialize)]
pub struct WeekHistoryGroup {
    pub week: i32,
    pub workouts: Vec<WorkoutHistoryItem>,
}

/// Response for workout history overview (grouped by weeks)
#[derive(Debug, Serialize)]
pub struct WorkoutHistoryResponse {
    pub started_program_id: String,
    pub program_name: String,
    pub program_image_url: Option<String>,
    pub weeks: Vec<WeekHistoryGroup>,
}

/// Response for a specific historical workout's exercises
#[derive(Debug, Serialize)]
pub struct WorkoutHistoryDetailResponse {
    pub started_program_id: String,
    pub workout_number: i32,
    pub week: i32,
    pub completed_at: Option<String>,
    pub exercises: Vec<StartedWorkoutExerciseResponse>,
}

/// Response for exercise history (all instances of an exercise the user has done)
#[derive(Debug, Serialize)]
pub struct ExerciseHistoryResponse {
    pub exercise_id: String,
    pub history: Vec<StartedWorkoutExerciseResponse>,
}
