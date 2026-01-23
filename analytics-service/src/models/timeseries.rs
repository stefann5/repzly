use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Muscle intensity data
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MuscleIntensity {
    pub muscle: String,
    pub intensity: f64,
}

/// Metadata for timeseries documents
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TimeseriesMetadata {
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "startedProgramId")]
    pub started_program_id: String,
    #[serde(rename = "exerciseId")]
    pub exercise_id: String,
    #[serde(rename = "setNumber")]
    pub set_number: i32,
}

/// Timeseries document for exercise analytics
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExerciseTimeseries {
    pub timestamp: DateTime<Utc>,
    #[serde(rename = "metaField")]
    pub meta_field: TimeseriesMetadata,
    pub muscles: Vec<MuscleIntensity>,
}

/// Message received from RabbitMQ
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalyticsMessage {
    pub timestamp: String,
    pub user_id: String,
    pub started_program_id: String,
    pub exercise_id: String,
    pub set_number: i32,
    pub muscles: Vec<MuscleIntensity>,
}

/// Query parameters for total intensity endpoint
#[derive(Debug, Deserialize)]
pub struct TotalIntensityQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

/// Query parameters for intensity over time endpoint
#[derive(Debug, Deserialize)]
pub struct IntensityOverTimeQuery {
    pub muscle: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

/// Response for total intensity per muscle
#[derive(Debug, Serialize)]
pub struct TotalIntensityResponse {
    pub muscle: String,
    pub total_intensity: f64,
}

/// Response for intensity over time
#[derive(Debug, Serialize)]
pub struct IntensityOverTimeResponse {
    pub timestamp: String,
    pub muscle: String,
    pub intensity: f64,
}
