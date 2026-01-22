use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use serde::Deserialize;

use crate::error::AppError;
use crate::models::{
    DeleteExercisesRequest, DeleteWorkoutsRequest, NextWorkoutResponse, UpsertExercisesRequest,
    UpsertExercisesResponse, WeekResponse,
};
use crate::services;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct WeekQuery {
    pub week: Option<i32>,
}

#[derive(Deserialize)]
pub struct NextWorkoutQuery {
    pub last_workout_number: i32,
}

fn extract_user_id(headers: &HeaderMap) -> Result<String, AppError> {
    headers
        .get("X-User-Id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::Unauthorized("Missing X-User-Id header".to_string()))
}

/// GET /programs/:id/workouts?week=1 - Get workouts for a week
pub async fn get_week(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(program_id): Path<String>,
    Query(query): Query<WeekQuery>,
) -> Result<Json<WeekResponse>, AppError> {
    let user_id = extract_user_id(&headers)?;
    let week = query.week.unwrap_or(1);
    let response =
        services::get_week(&state.collections, &user_id, &program_id, week).await?;
    Ok(Json(response))
}

/// PUT /programs/:id/workout-exercises - Upsert exercises
/// Returns ID mappings for any temporary IDs that were converted to real ObjectIds
pub async fn upsert_exercises(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(program_id): Path<String>,
    Json(payload): Json<UpsertExercisesRequest>,
) -> Result<Json<UpsertExercisesResponse>, AppError> {
    let user_id = extract_user_id(&headers)?;
    let response =
        services::upsert_exercises(&state.collections, &user_id, &program_id, payload)
            .await?;
    Ok(Json(response))
}

/// DELETE /programs/:id/workouts - Delete workouts by workout_numbers
pub async fn delete_workouts(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(program_id): Path<String>,
    Json(payload): Json<DeleteWorkoutsRequest>,
) -> Result<StatusCode, AppError> {
    let user_id = extract_user_id(&headers)?;
    services::delete_workouts(&state.collections, &user_id, &program_id, payload).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// DELETE /programs/:id/workout-exercises - Delete exercises by IDs
pub async fn delete_exercises(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(program_id): Path<String>,
    Json(payload): Json<DeleteExercisesRequest>,
) -> Result<StatusCode, AppError> {
    let user_id = extract_user_id(&headers)?;
    services::delete_exercises(&state.collections, &user_id, &program_id, payload).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// GET /programs/:id/next-workout?last_workout_number=0 - Get next workout
/// Returns 404 if no more workouts exist
pub async fn get_next_workout(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(program_id): Path<String>,
    Query(query): Query<NextWorkoutQuery>,
) -> Result<Json<NextWorkoutResponse>, AppError> {
    let user_id = extract_user_id(&headers)?;
    let response = services::get_next_workout(
        &state.collections,
        &user_id,
        &program_id,
        query.last_workout_number,
    )
    .await?;

    match response {
        Some(workout) => Ok(Json(workout)),
        None => Err(AppError::NotFound("No more workouts".to_string())),
    }
}
