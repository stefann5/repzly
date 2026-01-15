#[derive(Clone)]
pub struct AppConfig {
    pub jwt_secret: String,
    pub mongodb_uri: String,
    pub database_name: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            jwt_secret: std::env::var("JWT_SECRET").expect("JWT_SECRET must be set"),
            mongodb_uri: std::env::var("MONGODB_URI")
                .unwrap_or_else(|_| "mongodb://localhost:27017".to_string()),
            database_name: std::env::var("DATABASE_NAME")
                .unwrap_or_else(|_| "workout_db".to_string()),
        }
    }
}
