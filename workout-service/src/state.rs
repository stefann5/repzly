use axum::extract::FromRef;
use axum_jwt_auth::Decoder;

use crate::db::Collections;
use crate::models::Claims;

#[derive(Clone, FromRef)]
pub struct AppState {
    pub decoder: Decoder<Claims>,
    pub collections: Collections,
}
