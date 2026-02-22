use std::env;

pub struct AppConfig {
    pub mongodb_uri: String,
    pub database_name: String,
    pub workout_service_url: String,
    pub rabbitmq_url: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            mongodb_uri: env::var("MONGODB_URI")
                .unwrap_or_else(|_| "mongodb://localhost:27017".to_string()),
            database_name: env::var("DATABASE_NAME")
                .unwrap_or_else(|_| "started_program_db".to_string()),
            workout_service_url: env::var("WORKOUT_SERVICE_URL")
                .unwrap_or_else(|_| "http://192.168.1.9:3001".to_string()),
            rabbitmq_url: env::var("RABBITMQ_URL")
                .unwrap_or_else(|_| "amqp://guest:guest@localhost:5672".to_string()),
        }
    }
}
