use aws_sdk_s3::Client;
use aws_sdk_s3::primitives::ByteStream;

use crate::error::AppError;

pub async fn upload_image(
    client: &Client,
    bucket: &str,
    key: &str,
    data: Vec<u8>,
    content_type: &str,
) -> Result<String, AppError> {
    client
        .put_object()
        .bucket(bucket)
        .key(key)
        .body(ByteStream::from(data))
        .content_type(content_type)
        .send()
        .await
        .map_err(|e| AppError::InternalServerError(format!("S3 upload failed: {}", e)))?;

    let url = format!("https://{}.s3.eu-central-1.amazonaws.com/{}", bucket, key);
    Ok(url)
}

pub async fn delete_image(client: &Client, bucket: &str, key: &str) -> Result<(), AppError> {
    client
        .delete_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .map_err(|e| AppError::InternalServerError(format!("S3 delete failed: {}", e)))?;

    Ok(())
}

pub fn extract_s3_key_from_url(url: &str, bucket: &str) -> Option<String> {
    let prefix = format!("https://{}.s3.eu-central-1.amazonaws.com/", bucket);
    if url.starts_with(&prefix) {
        Some(url[prefix.len()..].to_string())
    } else {
        None
    }
}
