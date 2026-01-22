use aws_sdk_s3::Client as S3Client;

use crate::db::Collections;

#[derive(Clone)]
pub struct AppState {
    pub collections: Collections,
    pub s3_client: S3Client,
    pub s3_bucket: String,
}
