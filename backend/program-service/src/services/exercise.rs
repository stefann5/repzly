use bson::doc;
use futures::TryStreamExt;

use crate::db::Collections;
use crate::error::AppError;
use crate::models::{CreateExerciseRequest, Exercise, ExerciseQueryParams, ExerciseResponse, PaginatedExerciseResponse, UpdateExerciseRequest};

pub async fn create_exercise(
    collections: &Collections,
    req: CreateExerciseRequest,
) -> Result<ExerciseResponse, AppError> {
    let exercise = Exercise {
        id: req.id,
        name: req.name,
        demonstration_link: req.demonstration_link,
        muscles: req.muscles,
    };

    collections.exercises.insert_one(&exercise).await?;

    Ok(exercise.into())
}

pub async fn get_exercise(
    collections: &Collections,
    exercise_id: &str,
) -> Result<ExerciseResponse, AppError> {
    let exercise = collections
        .exercises
        .find_one(doc! { "_id": exercise_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Exercise not found".to_string()))?;

    Ok(exercise.into())
}

/// Get all exercises with pagination using MongoDB $facet aggregation
/// This approach fetches both total count and paginated data in a single query,
/// avoiding data inconsistency and improving performance
pub async fn get_all_exercises(
    collections: &Collections,
    params: ExerciseQueryParams,
) -> Result<PaginatedExerciseResponse, AppError> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);
    let skip = ((page - 1) * limit) as i64;

    // Build match filter based on search query
    let match_filter = if let Some(search) = &params.search {
        if search.trim().is_empty() {
            doc! {}
        } else {
            // Case-insensitive regex search on name
            doc! { "name": { "$regex": search, "$options": "i" } }
        }
    } else {
        doc! {}
    };

    // Build aggregation pipeline with $facet for efficient pagination
    let pipeline = vec![
        doc! { "$match": match_filter },
        doc! { "$sort": { "name": 1 } },
        doc! {
            "$facet": {
                "metadata": [{ "$count": "totalCount" }],
                "data": [{ "$skip": skip }, { "$limit": limit as i64 }]
            }
        },
    ];

    let mut cursor = collections.exercises.aggregate(pipeline).await?;

    // Parse the aggregation result
    if let Some(result) = cursor.try_next().await? {
        let metadata = result.get_array("metadata").ok();
        let data = result.get_array("data").ok();

        let total = metadata
            .and_then(|m| m.first())
            .and_then(|d| d.as_document())
            .and_then(|d| d.get_i32("totalCount").ok())
            .unwrap_or(0) as u64;

        let exercises: Vec<ExerciseResponse> = data
            .map(|arr| {
                arr.iter()
                    .filter_map(|b| b.as_document())
                    .filter_map(|d| bson::from_document::<Exercise>(d.clone()).ok())
                    .map(|e| e.into())
                    .collect()
            })
            .unwrap_or_default();

        let total_pages = if total == 0 {
            0
        } else {
            (total as f64 / limit as f64).ceil() as u64
        };

        Ok(PaginatedExerciseResponse {
            exercises,
            total,
            page,
            limit,
            total_pages,
        })
    } else {
        Ok(PaginatedExerciseResponse {
            exercises: vec![],
            total: 0,
            page,
            limit,
            total_pages: 0,
        })
    }
}

pub async fn update_exercise(
    collections: &Collections,
    exercise_id: &str,
    req: UpdateExerciseRequest,
) -> Result<ExerciseResponse, AppError> {
    // Verify exercise exists
    collections
        .exercises
        .find_one(doc! { "_id": exercise_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Exercise not found".to_string()))?;

    let mut update_doc = doc! {};

    if let Some(name) = req.name {
        update_doc.insert("name", name);
    }
    if let Some(demonstration_link) = req.demonstration_link {
        update_doc.insert("demonstration_link", demonstration_link);
    }
    if let Some(muscles) = req.muscles {
        let muscles_bson: Vec<bson::Document> = muscles
            .iter()
            .map(|m| doc! { "muscle": &m.muscle, "intensity": m.intensity })
            .collect();
        update_doc.insert("muscles", muscles_bson);
    }

    if !update_doc.is_empty() {
        collections
            .exercises
            .update_one(doc! { "_id": exercise_id }, doc! { "$set": update_doc })
            .await?;
    }

    get_exercise(collections, exercise_id).await
}

pub async fn delete_exercise(
    collections: &Collections,
    exercise_id: &str,
) -> Result<(), AppError> {
    let result = collections
        .exercises
        .delete_one(doc! { "_id": exercise_id })
        .await?;

    if result.deleted_count == 0 {
        return Err(AppError::NotFound("Exercise not found".to_string()));
    }

    Ok(())
}
