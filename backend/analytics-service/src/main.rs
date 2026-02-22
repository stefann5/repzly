use axum::{routing::get, Router};
use bson::doc;
use mongodb::{
    options::{CreateCollectionOptions, TimeseriesGranularity, TimeseriesOptions},
    Client,
};
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
use handlers::{get_intensity_over_time, get_total_intensity};
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

    // Create timeseries collection if it doesn't exist
    create_timeseries_collection(&db).await;

    // Create collections struct
    let collections = Collections::new(&db);

    // Start RabbitMQ consumer
    services::rabbitmq::start_consumer(&config.rabbitmq_url, collections.clone())
        .await
        .expect("Failed to start RabbitMQ consumer");

    let state = AppState { collections };

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // Analytics query routes
        .route("/analytics/total-intensity", get(get_total_intensity))
        .route(
            "/analytics/intensity-over-time",
            get(get_intensity_over_time),
        )
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3004")
        .await
        .unwrap();

    println!("Analytics Service running on http://0.0.0.0:3004");
    axum::serve(listener, app).await.unwrap();
}

async fn create_timeseries_collection(db: &mongodb::Database) {
    // Check if collection already exists
    let collections = db.list_collection_names().await.unwrap_or_default();
    if collections.contains(&"exercise_timeseries".to_string()) {
        println!("Timeseries collection already exists");
        return;
    }

    // Create timeseries collection with options
    let timeseries_options = TimeseriesOptions::builder()
        .time_field("timestamp".to_string())
        .meta_field(Some("metaField".to_string()))
        .granularity(Some(TimeseriesGranularity::Minutes))
        .build();

    let options = CreateCollectionOptions::builder()
        .timeseries(timeseries_options)
        .build();

    match db
        .create_collection("exercise_timeseries")
        .with_options(options)
        .await
    {
        Ok(_) => println!("Timeseries collection 'exercise_timeseries' created"),
        Err(e) => {
            // Collection might already exist, which is fine
            println!(
                "Note: Could not create timeseries collection (may already exist): {}",
                e
            );
        }
    }

    // Create index on metaField.userId for query performance
    let collection = db.collection::<bson::Document>("exercise_timeseries");
    match collection
        .create_index(mongodb::IndexModel::builder()
            .keys(doc! { "metaField.userId": 1 })
            .build())
        .await
    {
        Ok(_) => println!("Index on metaField.userId created"),
        Err(e) => println!("Note: Could not create index: {}", e),
    }
}
