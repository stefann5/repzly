use std::sync::Arc;

use axum::{
    routing::{delete, get, patch, post, put},
    Router,
};
use axum_jwt_auth::LocalDecoder;
use jsonwebtoken::{Algorithm, DecodingKey, Validation};
use mongodb::{bson::doc, Client, IndexModel};
use tower_http::cors::{Any, CorsLayer};

mod config;
mod db;
mod error;
mod handlers;
mod models;
mod services;
mod state;

use config::AppConfig;
use db::Collections;
use handlers::{
    create_exercise, create_program, delete_exercise, delete_exercises, delete_program,
    delete_workouts, get_exercise, get_exercises, get_program, get_programs, get_week,
    update_exercise, update_program, upsert_exercises,
};
use state::AppState;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let config = AppConfig::from_env();

    // Connect to MongoDB
    let client = Client::with_uri_str(&config.mongodb_uri)
        .await
        .expect("Failed to connect to MongoDB");

    let db = client.database(&config.database_name);

    // Create collections struct
    let collections = Collections::new(&db);

    // Create indexes
    create_indexes(&collections).await;

    // Setup JWT decoder (same secret as auth service)
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_audience(&["my-app"]);

    let decoder = LocalDecoder::builder()
        .keys(vec![DecodingKey::from_secret(config.jwt_secret.as_bytes())])
        .validation(validation)
        .build()
        .unwrap();

    let state = AppState {
        decoder: Arc::new(decoder),
        collections,
    };

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // Program routes
        .route("/programs", get(get_programs).post(create_program))
        .route(
            "/programs/{program_id}",
            get(get_program).patch(update_program).delete(delete_program),
        )
        // Workout exercise routes
        .route("/programs/{program_id}/workouts", get(get_week).delete(delete_workouts))
        .route(
            "/programs/{program_id}/workout-exercises",
            put(upsert_exercises).delete(delete_exercises),
        )
        // Exercise catalog routes
        .route("/exercises", get(get_exercises).post(create_exercise))
        .route(
            "/exercises/{exercise_id}",
            get(get_exercise).patch(update_exercise).delete(delete_exercise),
        )
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("192.168.1.9:3001")
        .await
        .unwrap();

    println!("Workout service running on http://192.168.1.9:3001");
    axum::serve(listener, app).await.unwrap();
}

async fn create_indexes(collections: &Collections) {
    // Index for workout_exercises: program_id + week
    let exercise_index = IndexModel::builder()
        .keys(doc! { "program_id": 1, "week": 1 })
        .build();

    collections
        .workout_exercises
        .create_index(exercise_index)
        .await
        .ok();

    // Index for programs: user_id
    let program_index = IndexModel::builder()
        .keys(doc! { "user_id": 1 })
        .build();

    collections
        .programs
        .create_index(program_index)
        .await
        .ok();

    println!("Database indexes created");
}
