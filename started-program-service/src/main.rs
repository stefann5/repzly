use axum::{
    routing::{get, patch, post},
    Router,
};
use mongodb::{bson::doc, Client, IndexModel};
use reqwest::Client as HttpClient;
use std::time::Duration;
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
    delete_started_program, finish_workout, get_current_workout, get_exercise_history,
    get_started_program, get_started_programs, get_workout_history, get_workout_history_detail,
    start_program, start_workout, update_exercise_progress,
};
use services::RabbitMQPublisher;
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

    // Setup HTTP client for inter-service communication
    let http_client = HttpClient::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .expect("Failed to create HTTP client");

    // Connect to RabbitMQ
    let rabbitmq = RabbitMQPublisher::new(&config.rabbitmq_url)
        .await
        .expect("Failed to connect to RabbitMQ");

    let state = AppState {
        collections,
        http_client,
        workout_service_url: config.workout_service_url,
        rabbitmq,
    };

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // Started programs routes
        .route(
            "/started-programs",
            get(get_started_programs).post(start_program),
        )
        .route(
            "/started-programs/{started_program_id}",
            get(get_started_program).delete(delete_started_program),
        )
        // Workout control routes
        .route(
            "/started-programs/{started_program_id}/start-workout",
            post(start_workout),
        )
        .route(
            "/started-programs/{started_program_id}/finish-workout",
            post(finish_workout),
        )
        .route(
            "/started-programs/{started_program_id}/current-workout",
            get(get_current_workout),
        )
        // Exercise progress route
        .route(
            "/started-programs/{started_program_id}/exercises/{exercise_id}",
            patch(update_exercise_progress),
        )
        // Workout history routes
        .route(
            "/started-programs/{started_program_id}/workout-history",
            get(get_workout_history),
        )
        .route(
            "/started-programs/{started_program_id}/workout-history/{workout_number}",
            get(get_workout_history_detail),
        )
        // Exercise history route
        .route(
            "/exercises/{exercise_id}/history",
            get(get_exercise_history),
        )
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("192.168.1.9:3003")
        .await
        .unwrap();

    println!("Started Program Service running on http://192.168.1.9:3003");
    axum::serve(listener, app).await.unwrap();
}

async fn create_indexes(collections: &Collections) {
    // Index for started_programs: user_id
    let user_index = IndexModel::builder()
        .keys(doc! { "user_id": 1 })
        .build();

    collections
        .started_programs
        .create_index(user_index)
        .await
        .ok();

    // Index for started_programs: user_id + program_id (unique)
    let unique_program_index = IndexModel::builder()
        .keys(doc! { "user_id": 1, "program_id": 1 })
        .build();

    collections
        .started_programs
        .create_index(unique_program_index)
        .await
        .ok();

    // Index for started_workout_exercises: started_program_id + workout_number
    let exercise_index = IndexModel::builder()
        .keys(doc! { "started_program_id": 1, "workout_number": 1 })
        .build();

    collections
        .started_workout_exercises
        .create_index(exercise_index)
        .await
        .ok();

    // Index for started_workout_exercises: user_id + exercise_id (for exercise history)
    let exercise_history_index = IndexModel::builder()
        .keys(doc! { "user_id": 1, "exercise_id": 1 })
        .build();

    collections
        .started_workout_exercises
        .create_index(exercise_history_index)
        .await
        .ok();

    println!("Database indexes created");
}
