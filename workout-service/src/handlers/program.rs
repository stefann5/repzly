use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    Json,
};
use axum_jwt_auth::Claims;

use crate::error::AppError;
use crate::models::{Claims as MyClaims, CreateProgramRequest, ProgramResponse, UpdateProgramRequest};
use crate::services;
use crate::state::AppState;

const MAX_IMAGE_SIZE: usize = 5 * 1024 * 1024; // 5MB

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
    // Get the program first to check if it has an image to delete
    let program = services::get_program(&state.collections, &user.claims.sub, &program_id).await?;

    // Delete S3 image if exists
    if let Some(ref image_url) = program.image_url {
        if let Some(key) = services::extract_s3_key_from_url(image_url, &state.s3_bucket) {
            let _ = services::delete_image(&state.s3_client, &state.s3_bucket, &key).await;
        }
    }

    services::delete_program(&state.collections, &user.claims.sub, &program_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

/// POST /programs/:id/image - Upload program image
pub async fn upload_program_image(
    State(state): State<AppState>,
    user: Claims<MyClaims>,
    Path(program_id): Path<String>,
    mut multipart: Multipart,
) -> Result<Json<ProgramResponse>, AppError> {
    // Verify program ownership
    let program = services::get_program(&state.collections, &user.claims.sub, &program_id).await?;

    // Extract image from multipart
    let mut file_data: Option<Vec<u8>> = None;
    let mut content_type: Option<String> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Failed to read multipart: {}", e)))?
    {
        let name = field.name().unwrap_or("").to_string();
        if name == "image" {
            content_type = field.content_type().map(|s| s.to_string());
            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("Failed to read file data: {}", e)))?;

            if data.len() > MAX_IMAGE_SIZE {
                return Err(AppError::BadRequest("Image too large. Max size: 5MB".to_string()));
            }

            file_data = Some(data.to_vec());
            break;
        }
    }

    let file_data = file_data.ok_or_else(|| AppError::BadRequest("No image field found".to_string()))?;
    let content_type = content_type.ok_or_else(|| AppError::BadRequest("Missing content type".to_string()))?;

    // Validate content type
    let extension = match content_type.as_str() {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        _ => return Err(AppError::BadRequest("Invalid image type. Allowed: JPEG, PNG, WebP".to_string())),
    };

    // Delete old image if exists
    if let Some(ref old_url) = program.image_url {
        if let Some(key) = services::extract_s3_key_from_url(old_url, &state.s3_bucket) {
            let _ = services::delete_image(&state.s3_client, &state.s3_bucket, &key).await;
        }
    }

    // Generate S3 key
    let file_id = uuid::Uuid::new_v4();
    let s3_key = format!("programs/{}/{}.{}", program_id, file_id, extension);

    // Upload to S3
    let image_url = services::upload_image(
        &state.s3_client,
        &state.s3_bucket,
        &s3_key,
        file_data,
        &content_type,
    ).await?;

    // Update program with new image URL
    let updated = services::update_program(
        &state.collections,
        &user.claims.sub,
        &program_id,
        UpdateProgramRequest {
            name: None,
            description: None,
            image_url: Some(image_url),
            tags: None,
            total_weeks: None,
            public: None,
            created: None,
        },
    ).await?;

    Ok(Json(updated))
}
