use jsonwebtoken::{EncodingKey, Header};
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::{ACCESS_TOKEN_DURATION_HOURS, REFRESH_TOKEN_DURATION_DAYS};
use crate::error::AppError;
use crate::models::{MyClaims, User};

pub fn generate_access_token(user: &User, secret: &str) -> Result<String, AppError> {
    let claims = MyClaims {
        sub: user.username.clone(),
        exp: (chrono::Utc::now() + chrono::Duration::hours(ACCESS_TOKEN_DURATION_HOURS)).timestamp()
            as usize,
        aud: "my-app".to_string(),
        role: user.role.clone(),
    };

    jsonwebtoken::encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::InternalServerError(format!("Token generation failed: {}", e)))
}

pub async fn create_refresh_token(db: &PgPool, user_id: i32) -> Result<String, AppError> {
    let token = Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now() + chrono::Duration::days(REFRESH_TOKEN_DURATION_DAYS);

    sqlx::query("INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)")
        .bind(user_id)
        .bind(&token)
        .bind(expires_at)
        .execute(db)
        .await
        .map_err(|e| {
            AppError::InternalServerError(format!("Failed to store refresh token: {}", e))
        })?;

    Ok(token)
}