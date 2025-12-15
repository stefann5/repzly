use std::sync::Arc;
use axum::{
    extract::FromRef,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use axum_jwt_auth::{Claims, Decoder, LocalDecoder};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct MyClaims {
    sub: String,
    exp: usize,
    aud: String,
    role: String,
}

#[derive(Clone, FromRef)]
struct AppState {
    decoder: Decoder<MyClaims>,
    jwt_secret: String,
    db: PgPool,
}

#[derive(Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Deserialize)]
struct RegisterRequest {
    username: String,
    password: String,
}

#[derive(Deserialize)]
struct RefreshRequest {
    refresh_token: String,
}

#[derive(Serialize)]
struct AuthResponse {
    access_token: String,
    refresh_token: String,
    expires_in: i64,
}

#[derive(Serialize)]
struct RegisterResponse {
    message: String,
    user_id: i32,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

#[derive(sqlx::FromRow)]
struct User {
    id: i32,
    username: String,
    password_hash: String,
    role: String,
}

#[derive(sqlx::FromRow)]
struct RefreshToken {
    id: i32,
    user_id: i32,
    token: String,
    expires_at: chrono::DateTime<chrono::Utc>,
}

enum AppError {
    Unauthorized(String),
    InternalServerError(String),
    BadRequest(String),
    Conflict(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::InternalServerError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg),
        };

        let body = Json(ErrorResponse {
            error: error_message,
        });

        (status, body).into_response()
    }
}

const ACCESS_TOKEN_DURATION_HOURS: i64 = 10; // for testing
const REFRESH_TOKEN_DURATION_DAYS: i64 = 7;

fn generate_access_token(user: &User, secret: &str) -> Result<String, AppError> {
    let claims = MyClaims {
        sub: user.username.clone(),
        exp: (chrono::Utc::now() + chrono::Duration::seconds(ACCESS_TOKEN_DURATION_HOURS)).timestamp() as usize,
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

async fn create_refresh_token(db: &PgPool, user_id: i32) -> Result<String, AppError> {
    let token = Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now() + chrono::Duration::days(REFRESH_TOKEN_DURATION_DAYS);

    sqlx::query(
        "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)"
    )
    .bind(user_id)
    .bind(&token)
    .bind(expires_at)
    .execute(db)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Failed to store refresh token: {}", e)))?;

    Ok(token)
}

async fn register(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<RegisterResponse>, AppError> {
    if payload.username.is_empty() || payload.password.is_empty() {
        return Err(AppError::BadRequest("Username and password required".to_string()));
    }

    if payload.password.len() < 8 {
        return Err(AppError::BadRequest("Password must be at least 8 characters".to_string()));
    }

    let existing: Option<(i32,)> = sqlx::query_as("SELECT id FROM users WHERE username = $1")
        .bind(&payload.username)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| AppError::InternalServerError(format!("Database error: {}", e)))?;

    if existing.is_some() {
        return Err(AppError::Conflict("Username already exists".to_string()));
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(payload.password.as_bytes(), &salt)
        .map_err(|e| AppError::InternalServerError(format!("Password hashing failed: {}", e)))?
        .to_string();

    let row: (i32,) = sqlx::query_as(
        "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id"
    )
    .bind(&payload.username)
    .bind(&password_hash)
    .bind("user")
    .fetch_one(&state.db)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Failed to create user: {}", e)))?;

    Ok(Json(RegisterResponse {
        message: "User registered successfully".to_string(),
        user_id: row.0,
    }))
}

async fn login(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let user: User = sqlx::query_as("SELECT id, username, password_hash, role FROM users WHERE username = $1")
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

    let access_token = generate_access_token(&user, &state.jwt_secret)?;
    let refresh_token = create_refresh_token(&state.db, user.id).await?;

    Ok(Json(AuthResponse {
        access_token,
        refresh_token,
        expires_in: ACCESS_TOKEN_DURATION_HOURS * 3600,
    }))
}

async fn refresh(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    // Find and validate refresh token
    let stored_token: RefreshToken = sqlx::query_as(
        "SELECT id, user_id, token, expires_at FROM refresh_tokens WHERE token = $1"
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
    let user: User = sqlx::query_as("SELECT id, username, password_hash, role FROM users WHERE id = $1")
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

async fn logout(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(payload): Json<RefreshRequest>,
) -> Result<StatusCode, AppError> {
    sqlx::query("DELETE FROM refresh_tokens WHERE token = $1")
        .bind(&payload.refresh_token)
        .execute(&state.db)
        .await
        .map_err(|e| AppError::InternalServerError(format!("Database error: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}

async fn protected(user: Claims<MyClaims>) -> Json<MyClaims> {
    Json(user.claims)
}

async fn public() -> &'static str {
    "This is a public endpoint - no auth needed!"
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let jwt_secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET must be set");

    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let db = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Create tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'user',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#
    )
    .execute(&db)
    .await
    .expect("Failed to create users table");

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(255) UNIQUE NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#
    )
    .execute(&db)
    .await
    .expect("Failed to create refresh_tokens table");

    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_audience(&["my-app"]);
    validation.leeway = 0; // NEED TO REMOVE LATER
    let decoder = LocalDecoder::builder()
        .keys(vec![DecodingKey::from_secret(jwt_secret.as_bytes())])
        .validation(validation)
        .build()
        .unwrap();

    let state = AppState {
        decoder: Arc::new(decoder),
        jwt_secret,
        db,
    };

    let app = Router::new()
        .route("/", get(public))
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/refresh", post(refresh))
        .route("/logout", post(logout))
        .route("/protected", get(protected))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("192.168.1.9:3000")
        .await
        .unwrap();

    println!("Server running on http://192.168.1.9:3000");
    axum::serve(listener, app).await.unwrap();
}