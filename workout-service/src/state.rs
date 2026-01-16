use aws_sdk_s3::Client as S3Client;
use axum::extract::FromRef;
use axum_jwt_auth::Decoder;

use crate::db::Collections;
use crate::models::Claims;

#[derive(Clone, FromRef)]
pub struct AppState {
    pub decoder: Decoder<Claims>,
    pub collections: Collections,
    pub s3_client: S3Client,
    pub s3_bucket: String,
}
