use lapin::{
    options::{BasicPublishOptions, QueueDeclareOptions},
    types::FieldTable,
    BasicProperties, Channel, Connection, ConnectionProperties,
};
use serde::Serialize;

use crate::error::AppError;
use crate::services::workout_client::MuscleIntensity;

pub const ANALYTICS_QUEUE: &str = "analytics_queue";

/// Message sent to analytics service for timeseries data
#[derive(Debug, Serialize, Clone)]
pub struct AnalyticsMessage {
    pub timestamp: String,
    pub user_id: String,
    pub started_program_id: String,
    pub exercise_id: String,
    pub set_number: i32,
    pub muscles: Vec<MuscleIntensity>,
}

/// RabbitMQ publisher for analytics messages
#[derive(Clone)]
pub struct RabbitMQPublisher {
    channel: Channel,
}

impl RabbitMQPublisher {
    pub async fn new(rabbitmq_url: &str) -> Result<Self, AppError> {
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
            .map_err(|e| {
                AppError::InternalServerError(format!("Failed to declare queue: {}", e))
            })?;

        println!("RabbitMQ connected, queue '{}' declared", ANALYTICS_QUEUE);

        Ok(Self { channel })
    }

    pub async fn publish_analytics(&self, message: &AnalyticsMessage) -> Result<(), AppError> {
        let payload = serde_json::to_vec(message).map_err(|e| {
            AppError::InternalServerError(format!("Failed to serialize analytics message: {}", e))
        })?;

        self.channel
            .basic_publish(
                "",
                ANALYTICS_QUEUE,
                BasicPublishOptions::default(),
                &payload,
                BasicProperties::default()
                    .with_content_type("application/json".into())
                    .with_delivery_mode(2), // Persistent
            )
            .await
            .map_err(|e| {
                AppError::InternalServerError(format!("Failed to publish message: {}", e))
            })?;

        Ok(())
    }
}
