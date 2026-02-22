#[derive(Clone)]
pub struct AppConfig {
    pub mongodb_uri: String,
    pub database_name: String,
    pub aws_region: String,
    pub s3_bucket_name: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self {
            mongodb_uri: std::env::var("MONGODB_URI")
                .unwrap_or_else(|_| "mongodb://localhost:27017".to_string()),
            database_name: std::env::var("DATABASE_NAME")
                .unwrap_or_else(|_| "workout_db".to_string()),
            aws_region: std::env::var("AWS_REGION")
                .unwrap_or_else(|_| "eu-central-1".to_string()),
            s3_bucket_name: std::env::var("S3_BUCKET_NAME")
                .unwrap_or_else(|_| "repzly-program-images".to_string()),
        }
    }
}
