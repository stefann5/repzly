use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use axum::{
    routing::{get, post},
    Router,
};
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

/// Seed users for development/testing purposes
async fn seed_users(db: &sqlx::PgPool) {
    let seed_users = vec![
        ("admin", "admin@example.com", "password123", "admin"),
        ("coach1", "coach1@example.com", "password123", "coach"),
        ("coach2", "coach2@example.com", "password123", "coach"),
        ("user1", "user1@example.com", "password123", "user"),
        ("user2", "user2@example.com", "password123", "user"),
        ("user3", "user3@example.com", "password123", "user"),
    ];

    let argon2 = Argon2::default();

    for (username, email, password, role) in seed_users {
        // Check if user already exists
        let exists: Option<(i32,)> = sqlx::query_as("SELECT id FROM users WHERE username = $1")
            .bind(username)
            .fetch_optional(db)
            .await
            .ok()
            .flatten();

        if exists.is_some() {
            continue;
        }

        // Hash password
        let salt = SaltString::generate(&mut OsRng);
        let password_hash = match argon2.hash_password(password.as_bytes(), &salt) {
            Ok(hash) => hash.to_string(),
            Err(e) => {
                eprintln!("Failed to hash password for {}: {}", username, e);
                continue;
            }
        };

        // Insert user
        match sqlx::query(
            "INSERT INTO users (username, email, password_hash, role, email_verified) VALUES ($1, $2, $3, $4, true)"
        )
        .bind(username)
        .bind(email)
        .bind(&password_hash)
        .bind(role)
        .execute(db)
        .await
        {
            Ok(_) => println!("Seeded user: {} (role: {})", username, role),
            Err(e) => eprintln!("Failed to seed user {}: {}", username, e),
        }
    }
}

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

    // Seed users for development
    println!("Seeding database with test users...");
    seed_users(&db).await;
    println!("Database seeding complete.");

    let state = AppState {
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

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3002")
        .await
        .unwrap();

    println!("Backend service running on http://0.0.0.0:3002");
    axum::serve(listener, app).await.unwrap();
}