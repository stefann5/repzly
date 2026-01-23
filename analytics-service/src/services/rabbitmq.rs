use chrono::{DateTime, Utc};
use futures::StreamExt;
use lapin::{
    options::{BasicAckOptions, BasicConsumeOptions, QueueDeclareOptions},
    types::FieldTable,
    Connection, ConnectionProperties,
};

use crate::db::Collections;
use crate::error::AppError;
use crate::models::{AnalyticsMessage, ExerciseTimeseries, TimeseriesMetadata};

pub const ANALYTICS_QUEUE: &str = "analytics_queue";

/// Start the RabbitMQ consumer
pub async fn start_consumer(rabbitmq_url: &str, collections: Collections) -> Result<(), AppError> {
    let connection = Connection::connect(rabbitmq_url, ConnectionProperties::default())
        .await
        .map_err(|e| {
            AppError::InternalServerError(format!("Failed to connect to RabbitMQ: {}", e))
        })?;

    let channel = connection.create_channel().await.map_err(|e| {
        AppError::InternalServerError(format!("Failed to create RabbitMQ channel: {}", e))
    })?;

    // Declare the queue
    channel
        .queue_declare(
            ANALYTICS_QUEUE,
            QueueDeclareOptions::default(),
            FieldTable::default(),
        )
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to declare queue: {}", e)))?;

    println!(
        "RabbitMQ consumer connected, listening on queue '{}'",
        ANALYTICS_QUEUE
    );

    // Start consuming messages
    let mut consumer = channel
        .basic_consume(
            ANALYTICS_QUEUE,
            "analytics_consumer",
            BasicConsumeOptions::default(),
            FieldTable::default(),
        )
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to create consumer: {}", e)))?;

    // Spawn task to handle incoming messages
    tokio::spawn(async move {
        while let Some(delivery_result) = consumer.next().await {
            match delivery_result {
                Ok(delivery) => {
                    // Parse the message
                    match serde_json::from_slice::<AnalyticsMessage>(&delivery.data) {
                        Ok(message) => {
                            // Convert to timeseries document
                            let timestamp = DateTime::parse_from_rfc3339(&message.timestamp)
                                .map(|dt| dt.with_timezone(&Utc))
                                .unwrap_or_else(|_| Utc::now());

                            let doc = ExerciseTimeseries {
                                timestamp,
                                meta_field: TimeseriesMetadata {
                                    user_id: message.user_id,
                                    started_program_id: message.started_program_id,
                                    exercise_id: message.exercise_id,
                                    set_number: message.set_number,
                                },
                                muscles: message.muscles,
                            };

                            // Insert into timeseries collection
                            if let Err(e) = collections.exercise_timeseries.insert_one(&doc).await {
                                eprintln!("Failed to insert timeseries document: {}", e);
                            } else {
                                println!(
                                    "Inserted timeseries document for exercise: {}",
                                    doc.meta_field.exercise_id
                                );
                            }
                        }
                        Err(e) => {
                            eprintln!("Failed to parse analytics message: {}", e);
                        }
                    }

                    // Acknowledge the message
                    if let Err(e) = delivery.ack(BasicAckOptions::default()).await {
                        eprintln!("Failed to ack message: {}", e);
                    }
                }
                Err(e) => {
                    eprintln!("Error receiving message: {}", e);
                }
            }
        }
    });

    Ok(())
}
