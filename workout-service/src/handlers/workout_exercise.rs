use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use axum_jwt_auth::Claims;
use serde::Deserialize;

use crate::error::AppError;
use crate::models::{
    Claims as MyClaims, DeleteExercisesRequest, DeleteWorkoutsRequest, UpsertExercisesRequest,
    UpsertExercisesResponse, WeekResponse,
};
use crate::services;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct WeekQuery {
    pub week: Option<i32>,
}

/// GET /programs/:id/workouts?week=1 - Get workouts for a week
pub async fn get_week(
    State(state): State<AppState>,
    user: Claims<MyClaims>,
    Path(program_id): Path<String>,
    Query(query): Query<WeekQuery>,
) -> Result<Json<WeekResponse>, AppError> {
    let week = query.week.unwrap_or(1);
    let response =
        services::get_week(&state.collections, &user.claims.sub, &program_id, week).await?;
    Ok(Json(response))
}

/// PUT /programs/:id/workout-exercises - Upsert exercises
/// Returns ID mappings for any temporary IDs that were converted to real ObjectIds
pub async fn upsert_exercises(
    State(state): State<AppState>,
    user: Claims<MyClaims>,
    Path(program_id): Path<String>,
    Json(payload): Json<UpsertExercisesRequest>,
) -> Result<Json<UpsertExercisesResponse>, AppError> {
    let response =
        services::upsert_exercises(&state.collections, &user.claims.sub, &program_id, payload)
            .await?;
    Ok(Json(response))
}

/// DELETE /programs/:id/workouts - Delete workouts by workout_numbers
pub async fn delete_workouts(
    State(state): State<AppState>,
    user: Claims<MyClaims>,
    Path(program_id): Path<String>,
    Json(payload): Json<DeleteWorkoutsRequest>,
) -> Result<StatusCode, AppError> {
    services::delete_workouts(&state.collections, &user.claims.sub, &program_id, payload).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// DELETE /programs/:id/workout-exercises - Delete exercises by IDs
pub async fn delete_exercises(
    State(state): State<AppState>,
    user: Claims<MyClaims>,
    Path(program_id): Path<String>,
    Json(payload): Json<DeleteExercisesRequest>,
) -> Result<StatusCode, AppError> {
    services::delete_exercises(&state.collections, &user.claims.sub, &program_id, payload).await?;
    Ok(StatusCode::NO_CONTENT)
}
