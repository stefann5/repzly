use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{extract::State, http::StatusCode, Json};
use axum_jwt_auth::Claims;
use serde::{Deserialize, Serialize};

use crate::config::ACCESS_TOKEN_DURATION_HOURS;
use crate::error::AppError;
use crate::models::{MyClaims, RefreshToken, Role, User};
use crate::services::{
    create_refresh_token, create_verification_token, generate_access_token, send_verification_email,
};
use crate::state::AppState;

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
    pub confirm_password: String,
    pub role: Role,
}

#[derive(Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
}

#[derive(Serialize)]
pub struct RegisterResponse {
    pub message: String,
    pub user_id: i32,
}

fn is_valid_email(email: &str) -> bool {
    email.contains('@') && email.len() >= 3 && email.contains('.')
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<RegisterResponse>, AppError> {
    // Validate email format
    if !is_valid_email(&payload.email) {
        return Err(AppError::BadRequest("Invalid email format".to_string()));
    }

    // Validate password length
    if payload.password.len() < 8 {
        return Err(AppError::BadRequest(
            "Password must be at least 8 characters".to_string(),
        ));
    }

    // Validate password confirmation
    if payload.password != payload.confirm_password {
        return Err(AppError::BadRequest("Passwords do not match".to_string()));
    }

    if payload.role == Role::Admin {
        return Err(AppError::BadRequest(
            "Cannot self-register as admin".to_string(),
        ));
    }

    // Check if username already exists
    let existing_username: Option<(i32,)> =
        sqlx::query_as("SELECT id FROM users WHERE username = $1")
            .bind(&payload.username)
            .fetch_optional(&state.db)
            .await
            .map_err(|e| AppError::InternalServerError(format!("Database error: {}", e)))?;

    if existing_username.is_some() {
        return Err(AppError::Conflict("Username already exists".to_string()));
    }

    // Check if email already exists
    let existing_email: Option<(i32,)> = sqlx::query_as("SELECT id FROM users WHERE email = $1")
        .bind(&payload.email)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| AppError::InternalServerError(format!("Database error: {}", e)))?;

    if existing_email.is_some() {
        return Err(AppError::Conflict("Email already exists".to_string()));
    }

    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|e| AppError::InternalServerError(format!("Password hashing failed: {}", e)))?
        .to_string();

    // Create user (email_verified defaults to false)
    let row: (i32,) = sqlx::query_as(
        "INSERT INTO users (username, email, password_hash, role, email_verified) VALUES ($1, $2, $3, $4, false) RETURNING id"
    )
    .bind(&payload.username)
    .bind(&payload.email)
    .bind(&password_hash)
    .bind(payload.role.to_string())
    .fetch_one(&state.db)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Failed to create user: {}", e)))?;

    // Create verification token and send email
    let verification_token = create_verification_token(&state.db, row.0).await?;
    send_verification_email(&state.smtp_config, &payload.email, &verification_token).await?;

    Ok(Json(RegisterResponse {
        message: "User registered successfully. Please check your email to verify your account."
            .to_string(),
        user_id: row.0,
    }))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let user: User = sqlx::query_as(
        "SELECT id, username, password_hash, role, email_verified FROM users WHERE username = $1",
    )
    .bind(&payload.username)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Database error: {}", e)))?
    .ok_or_else(|| AppError::Unauthorized("Invalid username or password".to_string()))?;

    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|e| AppError::InternalServerError(format!("Hash parsing failed: {}", e)))?;

    Argon2::default()
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Unauthorized("Invalid username or password".to_string()))?;

    // Check if email is verified
    if !user.email_verified {
        return Err(AppError::Unauthorized(
            "Please verify your email before logging in".to_string(),
        ));
    }

    let access_token = generate_access_token(&user, &state.jwt_secret)?;
    let refresh_token = create_refresh_token(&state.db, user.id).await?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        expires_in: ACCESS_TOKEN_DURATION_HOURS * 3600,
    }))
}

pub async fn refresh(
    State(state): State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    // Find and validate refresh token
    let stored_token: RefreshToken = sqlx::query_as(
        "SELECT id, user_id, token, expires_at FROM refresh_tokens WHERE token = $1",
    )
    .bind(&payload.refresh_token)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Database error: {}", e)))?
    .ok_or_else(|| AppError::Unauthorized("Invalid refresh token".to_string()))?;

    // Check expiration
    if stored_token.expires_at < chrono::Utc::now() {
        // Delete expired token
        sqlx::query("DELETE FROM refresh_tokens WHERE id = $1")
            .bind(stored_token.id)
            .execute(&state.db)
            .await
            .ok();
        return Err(AppError::Unauthorized("Refresh token expired".to_string()));
    }

    // Get user
    let user: User = sqlx::query_as(
        "SELECT id, username, password_hash, role, email_verified FROM users WHERE id = $1",
    )
    .bind(stored_token.user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Database error: {}", e)))?
    .ok_or_else(|| AppError::Unauthorized("User not found".to_string()))?;

    // Delete old refresh token (rotation)
    sqlx::query("DELETE FROM refresh_tokens WHERE id = $1")
        .bind(stored_token.id)
        .execute(&state.db)
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to rotate token: {}", e)))?;

    // Generate new tokens
    let access_token = generate_access_token(&user, &state.jwt_secret)?;
    let refresh_token = create_refresh_token(&state.db, user.id).await?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        expires_in: ACCESS_TOKEN_DURATION_HOURS * 3600,
    }))
}

pub async fn logout(
    State(state): State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> Result<StatusCode, AppError> {
    sqlx::query("DELETE FROM refresh_tokens WHERE token = $1")
        .bind(&payload.refresh_token)
        .execute(&state.db)
        .await
        .map_err(|e| AppError::InternalServerError(format!("Database error: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn protected(user: Claims<MyClaims>) -> Json<MyClaims> {
    Json(user.claims)
}

pub async fn public() -> &'static str {
    "This is a public endpoint - no auth needed!"
}