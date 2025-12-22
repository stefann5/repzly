use axum::extract::FromRef;
use axum_jwt_auth::Decoder;
use sqlx::PgPool;

use crate::config::SmtpConfig;
use crate::models::MyClaims;

#[derive(Clone, FromRef)]
pub struct AppState {
    pub decoder: Decoder<MyClaims>,
    pub jwt_secret: String,
    pub db: PgPool,
    pub smtp_config: SmtpConfig,
}