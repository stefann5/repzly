use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};

use crate::error::AppError;
use crate::models::{CreateExerciseRequest, ExerciseQueryParams, ExerciseResponse, PaginatedExerciseResponse, UpdateExerciseRequest};
use crate::services;
use crate::state::AppState;

/// POST /exercises - Create a new exercise
pub async fn create_exercise(
    State(state): State<AppState>,
    Json(payload): Json<CreateExerciseRequest>,
) -> Result<(StatusCode, Json<ExerciseResponse>), AppError> {
    let exercise = services::create_exercise(&state.collections, payload).await?;
    Ok((StatusCode::CREATED, Json(exercise)))
}

/// GET /exercises - List all exercises with pagination and search
pub async fn get_exercises(
    State(state): State<AppState>,
    Query(params): Query<ExerciseQueryParams>,
) -> Result<Json<PaginatedExerciseResponse>, AppError> {
    let result = services::get_all_exercises(&state.collections, params).await?;
    Ok(Json(result))
}

/// GET /exercises/:id - Get a specific exercise
pub async fn get_exercise(
    State(state): State<AppState>,
    Path(exercise_id): Path<String>,
) -> Result<Json<ExerciseResponse>, AppError> {
    let exercise = services::get_exercise(&state.collections, &exercise_id).await?;
    Ok(Json(exercise))
}

/// PATCH /exercises/:id - Update exercise info
pub async fn update_exercise(
    State(state): State<AppState>,
    Path(exercise_id): Path<String>,
    Json(payload): Json<UpdateExerciseRequest>,
) -> Result<Json<ExerciseResponse>, AppError> {
    let exercise =
        services::update_exercise(&state.collections, &exercise_id, payload).await?;
    Ok(Json(exercise))
}

/// DELETE /exercises/:id - Delete an exercise
pub async fn delete_exercise(
    State(state): State<AppState>,
    Path(exercise_id): Path<String>,
) -> Result<StatusCode, AppError> {
    services::delete_exercise(&state.collections, &exercise_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
