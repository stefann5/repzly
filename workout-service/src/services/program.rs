use bson::{doc, Document};
use chrono::Utc;
use futures::TryStreamExt;

use crate::db::Collections;
use crate::error::AppError;
use crate::models::{
    CreateProgramRequest, PaginatedProgramResponse, Program, ProgramResponse, ProgramSearchParams,
    UpdateProgramRequest,
};

pub async fn create_program(
    collections: &Collections,
    user_id: &str,
    req: CreateProgramRequest,
) -> Result<ProgramResponse, AppError> {
    let now = Utc::now();

    let created_at = if req.created == Some(true) {
        Some(now)
    } else {
        None
    };

    let program = Program {
        id: req.id,
        user_id: user_id.to_string(),
        name: req.name,
        description: req.description,
        image_url: None,
        tags: req.tags.unwrap_or_default(),
        total_weeks: req.total_weeks.unwrap_or(1),
        last_workout_number: 0,
        public: req.public.unwrap_or(false),
        created_at,
        updated_at: now,
    };

    collections.programs.insert_one(&program).await?;

    Ok(program.into())
}

pub async fn get_program(
    collections: &Collections,
    user_id: &str,
    program_id: &str,
) -> Result<ProgramResponse, AppError> {
    let program = collections
        .programs
        .find_one(doc! { "_id": program_id, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Program not found".to_string()))?;

    Ok(program.into())
}

pub async fn get_user_programs(
    collections: &Collections,
    user_id: &str,
) -> Result<Vec<ProgramResponse>, AppError> {
    let cursor = collections
        .programs
        .find(doc! { "user_id": user_id })
        .await?;

    let programs: Vec<Program> = cursor.try_collect().await?;
    Ok(programs.into_iter().map(|p| p.into()).collect())
}

pub async fn update_program(
    collections: &Collections,
    user_id: &str,
    program_id: &str,
    req: UpdateProgramRequest,
) -> Result<ProgramResponse, AppError> {
    // Fetch current program
    let program = collections
        .programs
        .find_one(doc! { "_id": program_id, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Program not found".to_string()))?;

    let now = Utc::now();
    let mut update_doc = doc! { "updated_at": now.to_rfc3339() };

    if let Some(name) = req.name {
        update_doc.insert("name", name);
    }
    if let Some(description) = req.description {
        update_doc.insert("description", description);
    }
    if let Some(image_url) = req.image_url {
        update_doc.insert("image_url", image_url);
    }
    if let Some(tags) = req.tags {
        update_doc.insert("tags", tags);
    }
    if let Some(total_weeks) = req.total_weeks {
        update_doc.insert("total_weeks", total_weeks);
    }
    if let Some(public) = req.public {
        update_doc.insert("public", public);
    }

    // One-way transition: draft -> published
    if req.created == Some(true) && program.created_at.is_none() {
        update_doc.insert("created_at", now.to_rfc3339());
    }

    collections
        .programs
        .update_one(
            doc! { "_id": program_id, "user_id": user_id },
            doc! { "$set": update_doc },
        )
        .await?;

    // Return updated program
    get_program(collections, user_id, program_id).await
}

pub async fn delete_program(
    collections: &Collections,
    user_id: &str,
    program_id: &str,
) -> Result<(), AppError> {
    // Verify ownership and delete
    let result = collections
        .programs
        .delete_one(doc! { "_id": program_id, "user_id": user_id })
        .await?;

    if result.deleted_count == 0 {
        return Err(AppError::NotFound("Program not found".to_string()));
    }

    // Cascade delete all workout_exercises
    collections
        .workout_exercises
        .delete_many(doc! { "program_id": program_id })
        .await?;

    Ok(())
}

/// Search public programs (public=true and created_at is not null)
/// Uses MongoDB $facet aggregation for efficient pagination
pub async fn search_public_programs(
    collections: &Collections,
    params: ProgramSearchParams,
) -> Result<PaginatedProgramResponse, AppError> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);
    let skip = ((page - 1) * limit) as i64;

    // Build match filter: must be public AND have created_at set
    let mut match_filter = doc! {
        "public": true,
        "created_at": { "$ne": null }
    };

    // Add search by name OR tags (case-insensitive regex)
    if let Some(search) = &params.search {
        if !search.trim().is_empty() {
            match_filter.insert("$or", vec![
                doc! { "name": { "$regex": search, "$options": "i" } },
                doc! { "tags": { "$regex": search, "$options": "i" } },
            ]);
        }
    }

    // Build aggregation pipeline with $facet for efficient pagination
    let pipeline = vec![
        doc! { "$match": match_filter },
        doc! { "$sort": { "updated_at": -1 } },
        doc! {
            "$facet": {
                "metadata": [{ "$count": "totalCount" }],
                "data": [{ "$skip": skip }, { "$limit": limit as i64 }]
            }
        },
    ];

    let mut cursor = collections.programs.aggregate(pipeline).await?;

    // Parse the aggregation result
    if let Some(result) = cursor.try_next().await? {
        let metadata = result.get_array("metadata").ok();
        let data = result.get_array("data").ok();

        let total = metadata
            .and_then(|m| m.first())
            .and_then(|d| d.as_document())
            .and_then(|d| d.get_i32("totalCount").ok())
            .unwrap_or(0) as u64;

        let programs: Vec<ProgramResponse> = data
            .map(|arr| {
                arr.iter()
                    .filter_map(|b| b.as_document())
                    .filter_map(|d| bson::from_document::<Program>(d.clone()).ok())
                    .map(|p| p.into())
                    .collect()
            })
            .unwrap_or_default();

        let total_pages = if total == 0 {
            0
        } else {
            (total as f64 / limit as f64).ceil() as u64
        };

        Ok(PaginatedProgramResponse {
            programs,
            total,
            page,
            limit,
            total_pages,
        })
    } else {
        Ok(PaginatedProgramResponse {
            programs: vec![],
            total: 0,
            page,
            limit,
            total_pages: 0,
        })
    }
}

/// Search user's own programs with pagination
/// Uses MongoDB $facet aggregation for efficient pagination
pub async fn search_user_programs(
    collections: &Collections,
    user_id: &str,
    params: ProgramSearchParams,
) -> Result<PaginatedProgramResponse, AppError> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);
    let skip = ((page - 1) * limit) as i64;

    // Build match filter: must belong to user
    let mut match_filter = doc! { "user_id": user_id };

    // Add search by name OR tags (case-insensitive regex)
    if let Some(search) = &params.search {
        if !search.trim().is_empty() {
            match_filter.insert("$or", vec![
                doc! { "name": { "$regex": search, "$options": "i" } },
                doc! { "tags": { "$regex": search, "$options": "i" } },
            ]);
        }
    }

    // Build aggregation pipeline with $facet for efficient pagination
    let pipeline = vec![
        doc! { "$match": match_filter },
        doc! { "$sort": { "updated_at": -1 } },
        doc! {
            "$facet": {
                "metadata": [{ "$count": "totalCount" }],
                "data": [{ "$skip": skip }, { "$limit": limit as i64 }]
            }
        },
    ];

    let mut cursor = collections.programs.aggregate(pipeline).await?;

    // Parse the aggregation result
    if let Some(result) = cursor.try_next().await? {
        let metadata = result.get_array("metadata").ok();
        let data = result.get_array("data").ok();

        let total = metadata
            .and_then(|m| m.first())
            .and_then(|d| d.as_document())
            .and_then(|d| d.get_i32("totalCount").ok())
            .unwrap_or(0) as u64;

        let programs: Vec<ProgramResponse> = data
            .map(|arr| {
                arr.iter()
                    .filter_map(|b| b.as_document())
                    .filter_map(|d| bson::from_document::<Program>(d.clone()).ok())
                    .map(|p| p.into())
                    .collect()
            })
            .unwrap_or_default();

        let total_pages = if total == 0 {
            0
        } else {
            (total as f64 / limit as f64).ceil() as u64
        };

        Ok(PaginatedProgramResponse {
            programs,
            total,
            page,
            limit,
            total_pages,
        })
    } else {
        Ok(PaginatedProgramResponse {
            programs: vec![],
            total: 0,
            page,
            limit,
            total_pages: 0,
        })
    }
}
