use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MyClaims {
    pub sub: String,
    pub exp: usize,
    pub aud: String,
    pub role: String,
}

#[derive(sqlx::FromRow)]
pub struct RefreshToken {
    pub id: i32,
    pub user_id: i32,
    pub token: String,
    pub expires_at: chrono::DateTime<chrono::Utc>,
}