use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::error::AppError;

/// Response from workout-service for program details
#[derive(Debug, Deserialize)]
pub struct ProgramResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub total_weeks: i32,
    pub last_workout_number: i32,
    pub public: bool,
}

/// Set from workout-service
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkoutSet {
    pub number: i32,
    pub volume_lower: Option<f64>,
    pub volume_upper: Option<f64>,
    pub intensity_lower: Option<f64>,
    pub intensity_upper: Option<f64>,
}

/// WorkoutExercise from workout-service
#[derive(Debug, Deserialize, Clone)]
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
    pub sets: Vec<WorkoutSet>,
}

/// Response from find_next_workout endpoint
#[derive(Debug, Deserialize)]
pub struct NextWorkoutResponse {
    pub workout_number: i32,
    pub week: i32,
    pub exercises: Vec<WorkoutExerciseResponse>,
}

/// Muscle intensity from exercise definition
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MuscleIntensity {
    pub muscle: String,
    pub intensity: f64,
}

/// Response from get_exercise endpoint
#[derive(Debug, Deserialize)]
pub struct ExerciseResponse {
    pub id: String,
    pub name: String,
    pub demonstration_link: String,
    pub muscles: Vec<MuscleIntensity>,
}

/// Client for calling workout-service
pub struct WorkoutClient<'a> {
    client: &'a Client,
    base_url: &'a str,
}

impl<'a> WorkoutClient<'a> {
    pub fn new(client: &'a Client, base_url: &'a str) -> Self {
        Self { client, base_url }
    }

    /// Get program by ID to verify it exists
    pub async fn get_program(
        &self,
        program_id: &str,
        user_id: &str,
    ) -> Result<ProgramResponse, AppError> {
        let url = format!("{}/programs/{}", self.base_url, program_id);

        let response = self
            .client
            .get(&url)
            .header("X-User-Id", user_id)
            .send()
            .await?;

        if response.status().is_success() {
            response.json().await.map_err(|e| {
                AppError::InternalServerError(format!("Failed to parse program response: {}", e))
            })
        } else if response.status().as_u16() == 404 {
            Err(AppError::NotFound("Program not found".to_string()))
        } else {
            Err(AppError::InternalServerError(format!(
                "Workout service error: {}",
                response.status()
            )))
        }
    }

    /// Get next workout from a program
    /// Returns None if there are no more workouts
    pub async fn get_next_workout(
        &self,
        program_id: &str,
        last_workout_number: i32,
        user_id: &str,
    ) -> Result<Option<NextWorkoutResponse>, AppError> {
        let url = format!(
            "{}/programs/{}/next-workout?last_workout_number={}",
            self.base_url, program_id, last_workout_number
        );

        let response = self
            .client
            .get(&url)
            .header("X-User-Id", user_id)
            .send()
            .await?;

        if response.status().is_success() {
            let workout: NextWorkoutResponse = response.json().await.map_err(|e| {
                AppError::InternalServerError(format!("Failed to parse workout response: {}", e))
            })?;
            Ok(Some(workout))
        } else if response.status().as_u16() == 404 {
            // No more workouts
            Ok(None)
        } else {
            Err(AppError::InternalServerError(format!(
                "Workout service error: {}",
                response.status()
            )))
        }
    }

    /// Get exercise by ID to retrieve muscle information
    pub async fn get_exercise(
        &self,
        exercise_id: &str,
        user_id: &str,
    ) -> Result<ExerciseResponse, AppError> {
        let url = format!("{}/exercises/{}", self.base_url, exercise_id);

        let response = self
            .client
            .get(&url)
            .header("X-User-Id", user_id)
            .send()
            .await?;

        if response.status().is_success() {
            response.json().await.map_err(|e| {
                AppError::InternalServerError(format!("Failed to parse exercise response: {}", e))
            })
        } else if response.status().as_u16() == 404 {
            Err(AppError::NotFound("Exercise not found".to_string()))
        } else {
            Err(AppError::InternalServerError(format!(
                "Workout service error: {}",
                response.status()
            )))
        }
    }
}
