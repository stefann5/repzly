use sqlx::PgPool;

use crate::config::SmtpConfig;

#[derive(Clone)]
pub struct AppState {
    pub jwt_secret: String,
    pub db: PgPool,
    pub smtp_config: SmtpConfig,
}