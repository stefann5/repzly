use std::env;

pub struct Config {
    pub jwt_secret: String,
    pub backend_url: String,
    pub workout_service_url: String,
    pub started_program_service_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            jwt_secret: env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
            backend_url: env::var("BACKEND_URL").unwrap_or_else(|_| "http://192.168.1.9:3002".to_string()),
            workout_service_url: env::var("WORKOUT_SERVICE_URL").unwrap_or_else(|_| "http://192.168.1.9:3001".to_string()),
            started_program_service_url: env::var("STARTED_PROGRAM_SERVICE_URL").unwrap_or_else(|_| "http://192.168.1.9:3003".to_string()),
        }
    }
}
