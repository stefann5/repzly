use axum::{
    extract::{Query, State},
    http::HeaderMap,
    Json,
};
use chrono::{DateTime, Utc};

use crate::error::AppError;
use crate::models::{
    IntensityOverTimeQuery, IntensityOverTimeResponse, TotalIntensityQuery, TotalIntensityResponse,
};
use crate::services;
use crate::state::AppState;

fn extract_user_id(headers: &HeaderMap) -> Result<String, AppError> {
    headers
        .get("X-User-Id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| AppError::Unauthorized("Missing X-User-Id header".to_string()))
}

fn parse_date(date_str: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(date_str)
        .ok()
        .map(|dt| dt.with_timezone(&Utc))
}

/// GET /analytics/total-intensity - Get total intensity per muscle
pub async fn get_total_intensity(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TotalIntensityQuery>,
) -> Result<Json<Vec<TotalIntensityResponse>>, AppError> {
    let user_id = extract_user_id(&headers)?;

    let start_date = query.start_date.as_deref().and_then(parse_date);
    let end_date = query.end_date.as_deref().and_then(parse_date);

    let response =
        services::get_total_intensity(&state.collections, &user_id, start_date, end_date).await?;

    Ok(Json(response))
}

/// GET /analytics/intensity-over-time - Get intensity over time
pub async fn get_intensity_over_time(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<IntensityOverTimeQuery>,
) -> Result<Json<Vec<IntensityOverTimeResponse>>, AppError> {
    let user_id = extract_user_id(&headers)?;

    let start_date = query.start_date.as_deref().and_then(parse_date);
    let end_date = query.end_date.as_deref().and_then(parse_date);

    let response = services::get_intensity_over_time(
        &state.collections,
        &user_id,
        query.muscle.as_deref(),
        start_date,
        end_date,
    )
    .await?;

    Ok(Json(response))
}
