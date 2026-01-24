use axum::{
    routing::{any, delete, get, patch, post, put},
    Router,
};
use reqwest::Client;
use std::time::Duration;
use tower_http::cors::{Any, CorsLayer};

mod config;
mod error;
mod middleware;
mod proxy;
mod state;

use config::Config;
use proxy::{
    proxy_to_analytics_protected, proxy_to_backend_protected, proxy_to_backend_public,
    proxy_to_started_program_protected, proxy_to_workout_protected,
};
use state::AppState;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let config = Config::from_env();

    let http_client = Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .expect("Failed to create HTTP client");

    let state = AppState {
        http_client,
        jwt_secret: config.jwt_secret,
        backend_url: config.backend_url,
        workout_service_url: config.workout_service_url,
        started_program_service_url: config.started_program_service_url,
        analytics_service_url: config.analytics_service_url,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Public auth routes (no JWT validation) -> Backend
    let public_routes = Router::new()
        .route("/", get(proxy_to_backend_public))
        .route("/login", post(proxy_to_backend_public))
        .route("/register", post(proxy_to_backend_public))
        .route("/refresh", post(proxy_to_backend_public))
        .route("/logout", post(proxy_to_backend_public))
        .route("/verify-email", get(proxy_to_backend_public))
        .route("/resend-verification", post(proxy_to_backend_public));

    // Protected backend routes -> Backend
    let protected_backend_routes =
        Router::new().route("/protected", get(proxy_to_backend_protected));

    // Protected workout service routes -> Workout Service
    let workout_routes = Router::new()
        // Program search routes
        .route("/programs/search/public", get(proxy_to_workout_protected))
        .route("/programs/search/mine", get(proxy_to_workout_protected))
        // Program CRUD
        .route(
            "/programs",
            get(proxy_to_workout_protected).post(proxy_to_workout_protected),
        )
        .route(
            "/programs/{program_id}",
            get(proxy_to_workout_protected)
                .patch(proxy_to_workout_protected)
                .delete(proxy_to_workout_protected),
        )
        .route(
            "/programs/{program_id}/image",
            post(proxy_to_workout_protected),
        )
        // Next workout (for started-program-service)
        .route(
            "/programs/{program_id}/next-workout",
            get(proxy_to_workout_protected),
        )
        // Workout exercises
        .route(
            "/programs/{program_id}/workouts",
            get(proxy_to_workout_protected).delete(proxy_to_workout_protected),
        )
        .route(
            "/programs/{program_id}/workout-exercises",
            put(proxy_to_workout_protected).delete(proxy_to_workout_protected),
        )
        // Exercise catalog
        .route(
            "/exercises",
            get(proxy_to_workout_protected).post(proxy_to_workout_protected),
        )
        .route(
            "/exercises/{exercise_id}",
            get(proxy_to_workout_protected)
                .patch(proxy_to_workout_protected)
                .delete(proxy_to_workout_protected),
        );

    // Protected started program service routes -> Started Program Service
    let started_program_routes = Router::new()
        .route(
            "/started-programs",
            get(proxy_to_started_program_protected).post(proxy_to_started_program_protected),
        )
        .route(
            "/started-programs/{started_program_id}",
            get(proxy_to_started_program_protected).delete(proxy_to_started_program_protected),
        )
        .route(
            "/started-programs/{started_program_id}/start-workout",
            post(proxy_to_started_program_protected),
        )
        .route(
            "/started-programs/{started_program_id}/finish-workout",
            post(proxy_to_started_program_protected),
        )
        .route(
            "/started-programs/{started_program_id}/current-workout",
            get(proxy_to_started_program_protected),
        )
        .route(
            "/started-programs/{started_program_id}/exercises/{exercise_id}",
            patch(proxy_to_started_program_protected),
        )
        // Workout history routes
        .route(
            "/started-programs/{started_program_id}/workout-history",
            get(proxy_to_started_program_protected),
        )
        .route(
            "/started-programs/{started_program_id}/workout-history/{workout_number}",
            get(proxy_to_started_program_protected),
        )
        // Exercise history route
        .route(
            "/exercises/{exercise_id}/history",
            get(proxy_to_started_program_protected),
        );

    // Protected analytics service routes -> Analytics Service
    let analytics_routes = Router::new()
        .route(
            "/analytics/total-intensity",
            get(proxy_to_analytics_protected),
        )
        .route(
            "/analytics/intensity-over-time",
            get(proxy_to_analytics_protected),
        );

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_backend_routes)
        .merge(workout_routes)
        .merge(started_program_routes)
        .merge(analytics_routes)
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    println!("API Gateway running on http://0.0.0.0:3000");
    axum::serve(listener, app).await.unwrap();
}
