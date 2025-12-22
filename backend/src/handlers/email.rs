use axum::{extract::Query, extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::error::AppError;
use crate::models::UserBasic;
use crate::services::{create_verification_token, send_verification_email};
use crate::state::AppState;

#[derive(Deserialize)]
pub struct VerifyEmailQuery {
    pub token: String,
}

#[derive(Serialize)]
pub struct VerifyEmailResponse {
    pub message: String,
}

#[derive(Deserialize)]
pub struct ResendVerificationRequest {
    pub email: String,
}

pub async fn verify_email(
    State(state): State<AppState>,
    Query(query): Query<VerifyEmailQuery>,
) -> Result<Json<VerifyEmailResponse>, AppError> {
    // Find the verification token
    let token_record: Option<(i32, i32, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        "SELECT id, user_id, expires_at FROM email_verification_tokens WHERE token = $1",
    )
    .bind(&query.token)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Database error: {}", e)))?;

    let (token_id, user_id, expires_at) = token_record.ok_or_else(|| {
        AppError::BadRequest("Invalid or expired verification token".to_string())
    })?;

    // Check if token is expired
    if expires_at < chrono::Utc::now() {
        // Delete expired token
        sqlx::query("DELETE FROM email_verification_tokens WHERE id = $1")
            .bind(token_id)
            .execute(&state.db)
            .await
            .ok();
        return Err(AppError::BadRequest(
            "Verification token has expired. Please request a new one.".to_string(),
        ));
    }

    // Mark user as verified
    sqlx::query("UPDATE users SET email_verified = true WHERE id = $1")
        .bind(user_id)
        .execute(&state.db)
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to verify user: {}", e)))?;

    // Delete the used token
    sqlx::query("DELETE FROM email_verification_tokens WHERE id = $1")
        .bind(token_id)
        .execute(&state.db)
        .await
        .ok();

    Ok(Json(VerifyEmailResponse {
        message: "Email verified successfully. You can now log in.".to_string(),
    }))
}

pub async fn resend_verification(
    State(state): State<AppState>,
    Json(payload): Json<ResendVerificationRequest>,
) -> Result<Json<VerifyEmailResponse>, AppError> {
    // Find user by email
    let user: Option<UserBasic> = sqlx::query_as(
        "SELECT id, email FROM users WHERE email = $1 AND email_verified = false",
    )
    .bind(&payload.email)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Database error: {}", e)))?;

    // Always return success to prevent email enumeration
    let Some(user) = user else {
        return Ok(Json(VerifyEmailResponse {
            message:
                "If an unverified account exists with this email, a verification link has been sent."
                    .to_string(),
        }));
    };

    // Create new verification token and send email
    let verification_token = create_verification_token(&state.db, user.id).await?;
    send_verification_email(&state.smtp_config, &user.email, &verification_token).await?;

    Ok(Json(VerifyEmailResponse {
        message:
            "If an unverified account exists with this email, a verification link has been sent."
                .to_string(),
    }))
}