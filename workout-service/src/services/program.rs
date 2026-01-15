use bson::doc;
use chrono::Utc;
use futures::TryStreamExt;

use crate::db::Collections;
use crate::error::AppError;
use crate::models::{CreateProgramRequest, Program, ProgramResponse, UpdateProgramRequest};

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
