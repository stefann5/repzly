use reqwest::Client;

#[derive(Clone)]
pub struct AppState {
    pub http_client: Client,
    pub jwt_secret: String,
    pub backend_url: String,
    pub workout_service_url: String,
    pub started_program_service_url: String,
}
