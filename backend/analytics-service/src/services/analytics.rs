use bson::doc;
use chrono::{DateTime, Utc};
use futures::TryStreamExt;

use crate::db::Collections;
use crate::error::AppError;
use crate::models::{IntensityOverTimeResponse, TotalIntensityResponse};

/// Get total intensity per muscle in a date range for a user
pub async fn get_total_intensity(
    collections: &Collections,
    user_id: &str,
    start_date: Option<DateTime<Utc>>,
    end_date: Option<DateTime<Utc>>,
) -> Result<Vec<TotalIntensityResponse>, AppError> {
    // Build match stage
    let mut match_doc = doc! {
        "metaField.userId": user_id
    };

    // Add date range filter if provided
    if start_date.is_some() || end_date.is_some() {
        let mut timestamp_filter = doc! {};
        if let Some(start) = start_date {
            timestamp_filter.insert("$gte", start);
        }
        if let Some(end) = end_date {
            timestamp_filter.insert("$lte", end);
        }
        match_doc.insert("timestamp", timestamp_filter);
    }

    // Aggregation pipeline to sum intensity per muscle
    let pipeline = vec![
        doc! { "$match": match_doc },
        doc! { "$unwind": "$muscles" },
        doc! {
            "$group": {
                "_id": "$muscles.muscle",
                "total_intensity": { "$sum": "$muscles.intensity" }
            }
        },
        doc! {
            "$project": {
                "_id": 0,
                "muscle": "$_id",
                "total_intensity": 1
            }
        },
        doc! { "$sort": { "total_intensity": -1 } },
    ];

    let cursor = collections
        .exercise_timeseries
        .aggregate(pipeline)
        .await?;

    let results: Vec<bson::Document> = cursor.try_collect().await?;

    let response: Vec<TotalIntensityResponse> = results
        .into_iter()
        .filter_map(|doc| {
            let muscle = doc.get_str("muscle").ok()?.to_string();
            let total_intensity = doc.get_f64("total_intensity").ok()?;
            Some(TotalIntensityResponse {
                muscle,
                total_intensity,
            })
        })
        .collect();

    Ok(response)
}

/// Get intensity over time for a user, optionally filtered by muscle
pub async fn get_intensity_over_time(
    collections: &Collections,
    user_id: &str,
    muscle: Option<&str>,
    start_date: Option<DateTime<Utc>>,
    end_date: Option<DateTime<Utc>>,
) -> Result<Vec<IntensityOverTimeResponse>, AppError> {
    // Build match stage
    let mut match_doc = doc! {
        "metaField.userId": user_id
    };

    // Add date range filter if provided
    if start_date.is_some() || end_date.is_some() {
        let mut timestamp_filter = doc! {};
        if let Some(start) = start_date {
            timestamp_filter.insert("$gte", start);
        }
        if let Some(end) = end_date {
            timestamp_filter.insert("$lte", end);
        }
        match_doc.insert("timestamp", timestamp_filter);
    }

    // Aggregation pipeline
    let mut pipeline = vec![
        doc! { "$match": match_doc },
        doc! { "$unwind": "$muscles" },
    ];

    // Filter by muscle if provided
    if let Some(muscle_name) = muscle {
        pipeline.push(doc! {
            "$match": { "muscles.muscle": muscle_name }
        });
    }

    pipeline.extend(vec![
        doc! {
            "$project": {
                "_id": 0,
                "timestamp": { "$dateToString": { "format": "%Y-%m-%dT%H:%M:%SZ", "date": "$timestamp" } },
                "muscle": "$muscles.muscle",
                "intensity": "$muscles.intensity"
            }
        },
        doc! { "$sort": { "timestamp": 1 } },
    ]);

    let cursor = collections
        .exercise_timeseries
        .aggregate(pipeline)
        .await?;

    let results: Vec<bson::Document> = cursor.try_collect().await?;

    let response: Vec<IntensityOverTimeResponse> = results
        .into_iter()
        .filter_map(|doc| {
            let timestamp = doc.get_str("timestamp").ok()?.to_string();
            let muscle = doc.get_str("muscle").ok()?.to_string();
            let intensity = doc.get_f64("intensity").ok()?;
            Some(IntensityOverTimeResponse {
                timestamp,
                muscle,
                intensity,
            })
        })
        .collect();

    Ok(response)
}
