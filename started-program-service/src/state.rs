use reqwest::Client as HttpClient;

use crate::db::Collections;
use crate::services::RabbitMQPublisher;

#[derive(Clone)]
pub struct AppState {
    pub collections: Collections,
    pub http_client: HttpClient,
    pub workout_service_url: String,
    pub rabbitmq: RabbitMQPublisher,
}
