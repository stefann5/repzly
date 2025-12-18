use std::sync::Arc;
use axum::{
    extract::{FromRef, Query},
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
use lettre::{
    message::header::ContentType,
    transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};
use rand::Rng;

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
    smtp_config: SmtpConfig,
}

#[derive(Clone)]
struct SmtpConfig {
    smtp_host: String,
    smtp_username: String,
    smtp_password: String,
    from_email: String,
    app_url: String,
}

#[derive(Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Deserialize)]
struct RegisterRequest {
    username: String,
    email: String,
    password: String,
    confirm_password: String,
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

#[derive(Deserialize)]
struct VerifyEmailQuery {
    token: String,
}

#[derive(Serialize)]
struct VerifyEmailResponse {
    message: String,
}

#[derive(Deserialize)]
struct ResendVerificationRequest {
    email: String,
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
    email_verified: bool,
}

#[derive(sqlx::FromRow)]
struct UserBasic {
    id: i32,
    email: String,
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
const VERIFICATION_TOKEN_DURATION_HOURS: i64 = 24;

fn generate_verification_code() -> String {
    let mut rng = rand::thread_rng();
    let code: u32 = rng.gen_range(100000..999999);
    code.to_string()
}

async fn send_verification_email(
    smtp_config: &SmtpConfig,
    to_email: &str,
    verification_token: &str,
) -> Result<(), AppError> {
    let verification_url = format!(
        "{}/verify-email?token={}",
        smtp_config.app_url, verification_token
    );

    let email_body = format!(
        r#"
        <html>
        <body>
            <h2>Welcome! Please verify your email</h2>
            <p>Thank you for registering. Please click the link below to verify your email address:</p>
            <p><a href="{}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; display: inline-block;">Verify Email</a></p>
            <p>Or copy and paste this link in your browser:</p>
            <p>{}</p>
            <p>Your verification code is: <strong>{}</strong></p>
            <p>This link will expire in 24 hours.</p>
            <br>
            <p>If you did not create an account, please ignore this email.</p>
        </body>
        </html>
        "#,
        verification_url, verification_url, verification_token
    );

    let email = Message::builder()
        .from(smtp_config.from_email.parse().map_err(|e| {
            AppError::InternalServerError(format!("Invalid from email: {}", e))
        })?)
        .to(to_email.parse().map_err(|e| {
            AppError::InternalServerError(format!("Invalid to email: {}", e))
        })?)
        .subject("Verify your email address")
        .header(ContentType::TEXT_HTML)
        .body(email_body)
        .map_err(|e| AppError::InternalServerError(format!("Failed to build email: {}", e)))?;

    let creds = Credentials::new(
        smtp_config.smtp_username.clone(),
        smtp_config.smtp_password.clone(),
    );

    let mailer: AsyncSmtpTransport<Tokio1Executor> =
        AsyncSmtpTransport::<Tokio1Executor>::relay(&smtp_config.smtp_host)
            .map_err(|e| AppError::InternalServerError(format!("SMTP connection failed: {}", e)))?
            .credentials(creds)
            .build();

    mailer
        .send(email)
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to send email: {}", e)))?;

    Ok(())
}

async fn create_verification_token(db: &PgPool, user_id: i32) -> Result<String, AppError> {
    // Delete any existing tokens for this user
    sqlx::query("DELETE FROM email_verification_tokens WHERE user_id = $1")
        .bind(user_id)
        .execute(db)
        .await
        .ok();

    let token = generate_verification_code();
    let expires_at = chrono::Utc::now() + chrono::Duration::hours(VERIFICATION_TOKEN_DURATION_HOURS);

    sqlx::query(
        "INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)"
    )
    .bind(user_id)
    .bind(&token)
    .bind(expires_at)
    .execute(db)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Failed to store verification token: {}", e)))?;

    Ok(token)
}

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

fn is_valid_email(email: &str) -> bool {
    email.contains('@') && email.len() >= 3 && email.contains('.')
}

async fn register(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<RegisterResponse>, AppError> {
    // Validate required fields
    if payload.username.is_empty() || payload.password.is_empty() || payload.email.is_empty() {
        return Err(AppError::BadRequest("Username, email, and password required".to_string()));
    }

    // Validate email format
    if !is_valid_email(&payload.email) {
        return Err(AppError::BadRequest("Invalid email format".to_string()));
    }

    // Validate password length
    if payload.password.len() < 8 {
        return Err(AppError::BadRequest("Password must be at least 8 characters".to_string()));
    }

    // Validate password confirmation
    if payload.password != payload.confirm_password {
        return Err(AppError::BadRequest("Passwords do not match".to_string()));
    }

    // Check if username already exists
    let existing_username: Option<(i32,)> = sqlx::query_as("SELECT id FROM users WHERE username = $1")
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
    .bind("user")
    .fetch_one(&state.db)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Failed to create user: {}", e)))?;

    // Create verification token and send email
    let verification_token = create_verification_token(&state.db, row.0).await?;
    send_verification_email(&state.smtp_config, &payload.email, &verification_token).await?;

    Ok(Json(RegisterResponse {
        message: "User registered successfully. Please check your email to verify your account.".to_string(),
        user_id: row.0,
    }))
}

async fn login(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let user: User = sqlx::query_as("SELECT id, username, password_hash, role, email_verified FROM users WHERE username = $1")
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
        return Err(AppError::Unauthorized("Please verify your email before logging in".to_string()));
    }

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
    let user: User = sqlx::query_as("SELECT id, username, password_hash, role, email_verified FROM users WHERE id = $1")
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

async fn verify_email(
    axum::extract::State(state): axum::extract::State<AppState>,
    Query(query): Query<VerifyEmailQuery>,
) -> Result<Json<VerifyEmailResponse>, AppError> {
    // Find the verification token
    let token_record: Option<(i32, i32, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
        "SELECT id, user_id, expires_at FROM email_verification_tokens WHERE token = $1"
    )
    .bind(&query.token)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Database error: {}", e)))?;

    let (token_id, user_id, expires_at) = token_record
        .ok_or_else(|| AppError::BadRequest("Invalid or expired verification token".to_string()))?;

    // Check if token is expired
    if expires_at < chrono::Utc::now() {
        // Delete expired token
        sqlx::query("DELETE FROM email_verification_tokens WHERE id = $1")
            .bind(token_id)
            .execute(&state.db)
            .await
            .ok();
        return Err(AppError::BadRequest("Verification token has expired. Please request a new one.".to_string()));
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

async fn resend_verification(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(payload): Json<ResendVerificationRequest>,
) -> Result<Json<VerifyEmailResponse>, AppError> {
    // Find user by email
    let user: Option<UserBasic> = sqlx::query_as(
        "SELECT id, email FROM users WHERE email = $1 AND email_verified = false"
    )
    .bind(&payload.email)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::InternalServerError(format!("Database error: {}", e)))?;

    // Always return success to prevent email enumeration
    let Some(user) = user else {
        return Ok(Json(VerifyEmailResponse {
            message: "If an unverified account exists with this email, a verification link has been sent.".to_string(),
        }));
    };

    // Create new verification token and send email
    let verification_token = create_verification_token(&state.db, user.id).await?;
    send_verification_email(&state.smtp_config, &user.email, &verification_token).await?;

    Ok(Json(VerifyEmailResponse {
        message: "If an unverified account exists with this email, a verification link has been sent.".to_string(),
    }))
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

    // SMTP configuration for email verification
    let smtp_config = SmtpConfig {
        smtp_host: std::env::var("SMTP_HOST")
            .expect("SMTP_HOST must be set"),
        smtp_username: std::env::var("SMTP_USERNAME")
            .expect("SMTP_USERNAME must be set"),
        smtp_password: std::env::var("SMTP_PASSWORD")
            .expect("SMTP_PASSWORD must be set"),
        from_email: std::env::var("SMTP_FROM_EMAIL")
            .expect("SMTP_FROM_EMAIL must be set"),
        app_url: std::env::var("APP_URL")
            .unwrap_or_else(|_| "http://localhost:3000".to_string()),
    };

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
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'user',
            email_verified BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#
    )
    .execute(&db)
    .await
    .expect("Failed to create users table");

    // Add email_verified column if it doesn't exist (for existing databases)
    sqlx::query(
        r#"
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                           WHERE table_name = 'users' AND column_name = 'email_verified') THEN
                ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
            END IF;
        END $$;
        "#
    )
    .execute(&db)
    .await
    .expect("Failed to add email_verified column");

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

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS email_verification_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(10) NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#
    )
    .execute(&db)
    .await
    .expect("Failed to create email_verification_tokens table");

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
        smtp_config,
    };

    let app = Router::new()
        .route("/", get(public))
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/refresh", post(refresh))
        .route("/logout", post(logout))
        .route("/verify-email", get(verify_email))
        .route("/resend-verification", post(resend_verification))
        .route("/protected", get(protected))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("192.168.1.9:3000")
        .await
        .unwrap();

    println!("Server running on http://192.168.1.9:3000");
    axum::serve(listener, app).await.unwrap();
}