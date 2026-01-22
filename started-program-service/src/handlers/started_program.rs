use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};

use crate::error::AppError;
use crate::models::{
    CurrentWorkoutResponse, StartProgramRequest, StartedProgramResponse,
    StartedWorkoutExerciseResponse, UpdateExerciseProgressRequest, WorkoutHistoryDetailResponse,
    WorkoutHistoryResponse,
};
use crate::services;
use crate::services::workout_client::WorkoutClient;
use crate::state::AppState;

fn extract_user_id(headers: &HeaderMap) -> Result<String, AppError> {
    headers
        .get("X-User-Id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::Unauthorized("Missing X-User-Id header".to_string()))
}

/// POST /started-programs - Start a new program
pub async fn start_program(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<StartProgramRequest>,
) -> Result<(StatusCode, Json<StartedProgramResponse>), AppError> {
    let user_id = extract_user_id(&headers)?;

    let workout_client = WorkoutClient::new(&state.http_client, &state.workout_service_url);

    let response = services::start_program(
        &state.collections,
        &workout_client,
        &user_id,
        &payload.program_id,
    )
    .await?;

    Ok((StatusCode::CREATED, Json(response)))
}

/// GET /started-programs - Get all started programs for user
pub async fn get_started_programs(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<StartedProgramResponse>>, AppError> {
    let user_id = extract_user_id(&headers)?;

    let programs = services::get_started_programs(&state.collections, &user_id).await?;

    Ok(Json(programs))
}

/// GET /started-programs/:id - Get a specific started program
pub async fn get_started_program(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(started_program_id): Path<String>,
) -> Result<Json<StartedProgramResponse>, AppError> {
    let user_id = extract_user_id(&headers)?;

    let program =
        services::get_started_program(&state.collections, &user_id, &started_program_id).await?;

    Ok(Json(program))
}

/// DELETE /started-programs/:id - Delete a started program
pub async fn delete_started_program(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(started_program_id): Path<String>,
) -> Result<StatusCode, AppError> {
    let user_id = extract_user_id(&headers)?;

    services::delete_started_program(&state.collections, &user_id, &started_program_id).await?;

    Ok(StatusCode::NO_CONTENT)
}

/// POST /started-programs/:id/start-workout - Start the current workout
pub async fn start_workout(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(started_program_id): Path<String>,
) -> Result<Json<StartedProgramResponse>, AppError> {
    let user_id = extract_user_id(&headers)?;

    let response =
        services::start_workout(&state.collections, &user_id, &started_program_id).await?;

    Ok(Json(response))
}

/// POST /started-programs/:id/finish-workout - Finish the current workout
pub async fn finish_workout(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(started_program_id): Path<String>,
) -> Result<Json<StartedProgramResponse>, AppError> {
    let user_id = extract_user_id(&headers)?;

    let workout_client = WorkoutClient::new(&state.http_client, &state.workout_service_url);

    let response = services::finish_workout(
        &state.collections,
        &workout_client,
        &user_id,
        &started_program_id,
    )
    .await?;

    Ok(Json(response))
}

/// GET /started-programs/:id/current-workout - Get current workout exercises
pub async fn get_current_workout(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(started_program_id): Path<String>,
) -> Result<Json<CurrentWorkoutResponse>, AppError> {
    let user_id = extract_user_id(&headers)?;

    let response =
        services::get_current_workout(&state.collections, &user_id, &started_program_id).await?;

    Ok(Json(response))
}

/// PATCH /started-programs/:id/exercises/:exercise_id - Update exercise progress
pub async fn update_exercise_progress(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((started_program_id, exercise_id)): Path<(String, String)>,
    Json(payload): Json<UpdateExerciseProgressRequest>,
) -> Result<Json<StartedWorkoutExerciseResponse>, AppError> {
    let user_id = extract_user_id(&headers)?;

    let response = services::update_exercise_progress(
        &state.collections,
        &user_id,
        &started_program_id,
        &exercise_id,
        payload.sets,
    )
    .await?;

    Ok(Json(response))
}

/// GET /started-programs/:id/workout-history - Get workout history overview
pub async fn get_workout_history(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(started_program_id): Path<String>,
) -> Result<Json<WorkoutHistoryResponse>, AppError> {
    let user_id = extract_user_id(&headers)?;

    let response =
        services::get_workout_history(&state.collections, &user_id, &started_program_id).await?;

    Ok(Json(response))
}

/// GET /started-programs/:id/workout-history/:workout_number - Get specific workout history detail
pub async fn get_workout_history_detail(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((started_program_id, workout_number)): Path<(String, i32)>,
) -> Result<Json<WorkoutHistoryDetailResponse>, AppError> {
    let user_id = extract_user_id(&headers)?;

    let response = services::get_workout_history_detail(
        &state.collections,
        &user_id,
        &started_program_id,
        workout_number,
    )
    .await?;

    Ok(Json(response))
}
