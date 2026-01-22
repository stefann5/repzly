use reqwest::Client as HttpClient;

use crate::db::Collections;

#[derive(Clone)]
pub struct AppState {
    pub collections: Collections,
    pub http_client: HttpClient,
    pub workout_service_url: String,
}
