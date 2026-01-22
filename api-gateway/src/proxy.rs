use axum::{
    body::Body,
    extract::{Request, State},
    http::{HeaderMap, Method, StatusCode, Uri},
    response::{IntoResponse, Response},
};
use bytes::Bytes;
use reqwest::Client;

use crate::error::AppError;
use crate::middleware::auth::extract_and_validate_token;
use crate::state::AppState;

async fn proxy_request(
    client: &Client,
    method: Method,
    target_url: &str,
    headers: &HeaderMap,
    body: Bytes,
    user_info: Option<(&str, &str)>,
) -> Result<Response, AppError> {
    let mut request_builder = client.request(method.clone(), target_url);

    // Forward relevant headers (skip hop-by-hop and authorization)
    for (key, value) in headers.iter() {
        let key_str = key.as_str().to_lowercase();
        if !matches!(
            key_str.as_str(),
            "host" | "connection" | "keep-alive" | "proxy-authenticate"
                | "proxy-authorization" | "te" | "trailers" | "transfer-encoding"
                | "upgrade" | "authorization"
        ) {
            if let Ok(header_str) = value.to_str() {
                request_builder = request_builder.header(key.as_str(), header_str);
            }
        }
    }

    // Add user info headers if authenticated
    if let Some((user_id, role)) = user_info {
        request_builder = request_builder
            .header("X-User-Id", user_id)
            .header("X-User-Role", role);
    }

    // Set body
    request_builder = request_builder.body(body.to_vec());

    // Execute request
    let response = request_builder
        .send()
        .await
        .map_err(|e| AppError::InternalServerError(format!("Proxy error: {}", e)))?;

    // Convert reqwest response to axum response
    let status = response.status();
    let resp_headers = response.headers().clone();
    let body_bytes = response
        .bytes()
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to read response: {}", e)))?;

    let mut builder = Response::builder().status(StatusCode::from_u16(status.as_u16()).unwrap());
    for (key, value) in resp_headers.iter() {
        let key_str = key.as_str().to_lowercase();
        // Skip hop-by-hop headers in response
        if !matches!(
            key_str.as_str(),
            "connection" | "keep-alive" | "transfer-encoding" | "upgrade"
        ) {
            builder = builder.header(key, value);
        }
    }

    Ok(builder.body(Body::from(body_bytes)).unwrap())
}

/// Proxy to backend without authentication (for login, register, etc.)
pub async fn proxy_to_backend_public(
    State(state): State<AppState>,
    request: Request,
) -> Result<impl IntoResponse, AppError> {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let headers = request.headers().clone();

    let body = axum::body::to_bytes(request.into_body(), usize::MAX)
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to read body: {}", e)))?;

    let target_url = build_target_url(&state.backend_url, &uri);
    proxy_request(&state.http_client, method, &target_url, &headers, body, None).await
}

/// Proxy to backend with authentication
pub async fn proxy_to_backend_protected(
    State(state): State<AppState>,
    request: Request,
) -> Result<impl IntoResponse, AppError> {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let headers = request.headers().clone();

    // Validate JWT
    let claims = extract_and_validate_token(&headers, &state.jwt_secret)?;

    let body = axum::body::to_bytes(request.into_body(), usize::MAX)
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to read body: {}", e)))?;

    let target_url = build_target_url(&state.backend_url, &uri);
    proxy_request(
        &state.http_client,
        method,
        &target_url,
        &headers,
        body,
        Some((&claims.sub, &claims.role)),
    )
    .await
}

/// Proxy to workout service with authentication
pub async fn proxy_to_workout_protected(
    State(state): State<AppState>,
    request: Request,
) -> Result<impl IntoResponse, AppError> {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let headers = request.headers().clone();

    // Validate JWT
    let claims = extract_and_validate_token(&headers, &state.jwt_secret)?;

    let body = axum::body::to_bytes(request.into_body(), usize::MAX)
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to read body: {}", e)))?;

    let target_url = build_target_url(&state.workout_service_url, &uri);
    proxy_request(
        &state.http_client,
        method,
        &target_url,
        &headers,
        body,
        Some((&claims.sub, &claims.role)),
    )
    .await
}

/// Proxy to started program service with authentication
pub async fn proxy_to_started_program_protected(
    State(state): State<AppState>,
    request: Request,
) -> Result<impl IntoResponse, AppError> {
    let method = request.method().clone();
    let uri = request.uri().clone();
    let headers = request.headers().clone();

    // Validate JWT
    let claims = extract_and_validate_token(&headers, &state.jwt_secret)?;

    let body = axum::body::to_bytes(request.into_body(), usize::MAX)
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to read body: {}", e)))?;

    let target_url = build_target_url(&state.started_program_service_url, &uri);
    proxy_request(
        &state.http_client,
        method,
        &target_url,
        &headers,
        body,
        Some((&claims.sub, &claims.role)),
    )
    .await
}

fn build_target_url(base_url: &str, uri: &Uri) -> String {
    let path_and_query = uri.path_and_query().map(|pq| pq.as_str()).unwrap_or("/");
    format!("{}{}", base_url, path_and_query)
}
