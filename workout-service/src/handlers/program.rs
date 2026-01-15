use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use axum_jwt_auth::Claims;

use crate::error::AppError;
use crate::models::{Claims as MyClaims, CreateProgramRequest, ProgramResponse, UpdateProgramRequest};
use crate::services;
use crate::state::AppState;

/// POST /programs - Create a new program
pub async fn create_program(
    State(state): State<AppState>,
    user: Claims<MyClaims>,
    Json(payload): Json<CreateProgramRequest>,
) -> Result<(StatusCode, Json<ProgramResponse>), AppError> {
    let program = services::create_program(&state.collections, &user.claims.sub, payload).await?;
    Ok((StatusCode::CREATED, Json(program)))
}

/// GET /programs - List user's programs
pub async fn get_programs(
    State(state): State<AppState>,
    user: Claims<MyClaims>,
) -> Result<Json<Vec<ProgramResponse>>, AppError> {
    let programs = services::get_user_programs(&state.collections, &user.claims.sub).await?;
    Ok(Json(programs))
}

/// GET /programs/:id - Get a specific program
pub async fn get_program(
    State(state): State<AppState>,
    user: Claims<MyClaims>,
    Path(program_id): Path<String>,
) -> Result<Json<ProgramResponse>, AppError> {
    let program =
        services::get_program(&state.collections, &user.claims.sub, &program_id).await?;
    Ok(Json(program))
}

/// PATCH /programs/:id - Update program info
pub async fn update_program(
    State(state): State<AppState>,
    user: Claims<MyClaims>,
    Path(program_id): Path<String>,
    Json(payload): Json<UpdateProgramRequest>,
) -> Result<Json<ProgramResponse>, AppError> {
    let program =
        services::update_program(&state.collections, &user.claims.sub, &program_id, payload)
            .await?;
    Ok(Json(program))
}

/// DELETE /programs/:id - Delete a program
pub async fn delete_program(
    State(state): State<AppState>,
    user: Claims<MyClaims>,
    Path(program_id): Path<String>,
) -> Result<StatusCode, AppError> {
    services::delete_program(&state.collections, &user.claims.sub, &program_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
