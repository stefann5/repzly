use std::sync::Arc;

use axum::{
    routing::{get, post},
    Router,
};
use axum_jwt_auth::LocalDecoder;
use jsonwebtoken::{Algorithm, DecodingKey, Validation};
use sqlx::postgres::PgPoolOptions;

mod config;
mod error;
mod handlers;
mod models;
mod services;
mod state;

use config::SmtpConfig;
use handlers::{login, logout, protected, public, refresh, register, resend_verification, verify_email};
use state::AppState;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let jwt_secret = std::env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let smtp_config = SmtpConfig::from_env();

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
        "#,
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
        "#,
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
        "#,
    )
    .execute(&db)
    .await
    .expect("Failed to create email_verification_tokens table");

    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_audience(&["my-app"]);

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