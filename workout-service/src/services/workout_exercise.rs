use bson::{doc, oid::ObjectId};
use futures::TryStreamExt;

use crate::db::Collections;
use crate::error::AppError;
use crate::models::{
    DeleteExercisesRequest, DeleteWorkoutsRequest, IdMapping, UpsertExercisesRequest,
    UpsertExercisesResponse, WeekResponse, WorkoutExercise, WorkoutExerciseResponse, WorkoutGroup,
};

/// Check if an ID is a temporary ID (starts with "temp-")
fn is_temp_id(id: &str) -> bool {
    id.starts_with("temp-")
}

pub async fn get_week(
    collections: &Collections,
    user_id: &str,
    program_id: &str,
    week: i32,
) -> Result<WeekResponse, AppError> {
    let program_oid = ObjectId::parse_str(program_id)
        .map_err(|e| AppError::BadRequest(format!("Invalid ObjectId: {}", e)))?;

    // Verify program ownership
    let program = collections
        .programs
        .find_one(doc! { "_id": program_oid, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Program not found".to_string()))?;

    // Get all exercises for this week (program_id stored as string in exercises)
    let cursor = collections
        .workout_exercises
        .find(doc! { "program_id": program_id, "week": week })
        .sort(doc! { "workout_number": 1, "order": 1 })
        .await?;

    let exercises: Vec<WorkoutExercise> = cursor.try_collect().await?;

    // Group by workout_number and convert to response types
    let mut workouts: Vec<WorkoutGroup> = Vec::new();
    let mut current_workout_number: Option<i32> = None;

    for exercise in exercises {
        let exercise_response: WorkoutExerciseResponse = exercise.clone().into();
        if current_workout_number != Some(exercise.workout_number) {
            workouts.push(WorkoutGroup {
                workout_number: exercise.workout_number,
                exercises: vec![exercise_response],
            });
            current_workout_number = Some(exercise.workout_number);
        } else {
            workouts.last_mut().unwrap().exercises.push(exercise_response);
        }
    }

    Ok(WeekResponse {
        program_id: program_id.to_string(),
        week,
        total_weeks: program.total_weeks,
        workouts,
    })
}

pub async fn upsert_exercises(
    collections: &Collections,
    user_id: &str,
    program_id: &str,
    req: UpsertExercisesRequest,
) -> Result<UpsertExercisesResponse, AppError> {
    let program_oid = ObjectId::parse_str(program_id)
        .map_err(|e| AppError::BadRequest(format!("Invalid ObjectId: {}", e)))?;

    // Verify program ownership
    let program = collections
        .programs
        .find_one(doc! { "_id": program_oid, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Program not found".to_string()))?;

    // Find max workout_number in request
    let max_workout_number = req
        .exercises
        .iter()
        .map(|e| e.workout_number)
        .max()
        .unwrap_or(0);

    // Track ID mappings for temp IDs
    let mut id_mappings: Vec<IdMapping> = Vec::new();

    // Separate exercises into new (temp IDs) and existing (real IDs)
    let mut new_exercises: Vec<WorkoutExercise> = Vec::new();
    let mut existing_exercises: Vec<WorkoutExercise> = Vec::new();
    let mut existing_ids: Vec<ObjectId> = Vec::new();

    for exercise_input in req.exercises {
        // Check if this is a temp ID and generate a real ObjectId if so
        let (real_id, is_new) = if is_temp_id(&exercise_input.id) {
            let new_id = ObjectId::new();
            id_mappings.push(IdMapping {
                temp_id: exercise_input.id.clone(),
                real_id: new_id.to_hex(),
            });
            (new_id, true)
        } else {
            // Parse existing hex string to ObjectId
            let oid = ObjectId::parse_str(&exercise_input.id)
                .map_err(|e| AppError::BadRequest(format!("Invalid ObjectId: {}", e)))?;
            (oid, false)
        };

        let exercise = WorkoutExercise {
            id: real_id,
            program_id: program_id.to_string(),
            week: exercise_input.week,
            workout_number: exercise_input.workout_number,
            order: exercise_input.order,
            exercise_id: exercise_input.exercise_id,
            notes: exercise_input.notes,
            sets: exercise_input.sets,
            volume_metric: exercise_input.volume_metric,
            intensity_metric: exercise_input.intensity_metric,
        };

        if is_new {
            new_exercises.push(exercise);
        } else {
            existing_ids.push(real_id);
            existing_exercises.push(exercise);
        }
    }

    // Insert all new exercises in one batch
    if !new_exercises.is_empty() {
        collections
            .workout_exercises
            .insert_many(&new_exercises)
            .await?;
    }

    // For existing exercises: delete then insert (more efficient than individual replaces)
    if !existing_exercises.is_empty() {
        collections
            .workout_exercises
            .delete_many(doc! { "_id": { "$in": &existing_ids } })
            .await?;
        collections
            .workout_exercises
            .insert_many(&existing_exercises)
            .await?;
    }

    // Update last_workout_number if needed
    if max_workout_number > program.last_workout_number {
        collections
            .programs
            .update_one(
                doc! { "_id": program_oid },
                doc! { "$set": { "last_workout_number": max_workout_number } },
            )
            .await?;
    }

    Ok(UpsertExercisesResponse { id_mappings })
}

pub async fn delete_workouts(
    collections: &Collections,
    user_id: &str,
    program_id: &str,
    req: DeleteWorkoutsRequest,
) -> Result<(), AppError> {
    let program_oid = ObjectId::parse_str(program_id)
        .map_err(|e| AppError::BadRequest(format!("Invalid ObjectId: {}", e)))?;

    // Verify program ownership
    collections
        .programs
        .find_one(doc! { "_id": program_oid, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Program not found".to_string()))?;

    // Delete all exercises with matching workout_numbers
    collections
        .workout_exercises
        .delete_many(doc! {
            "program_id": program_id,
            "workout_number": { "$in": &req.workout_numbers }
        })
        .await?;

    Ok(())
}

pub async fn delete_exercises(
    collections: &Collections,
    user_id: &str,
    program_id: &str,
    req: DeleteExercisesRequest,
) -> Result<(), AppError> {
    let program_oid = ObjectId::parse_str(program_id)
        .map_err(|e| AppError::BadRequest(format!("Invalid ObjectId: {}", e)))?;

    // Verify program ownership
    collections
        .programs
        .find_one(doc! { "_id": program_oid, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Program not found".to_string()))?;

    // Parse string IDs to ObjectIds
    let object_ids: Vec<ObjectId> = req
        .ids
        .iter()
        .filter_map(|id| ObjectId::parse_str(id).ok())
        .collect();

    if object_ids.is_empty() {
        return Ok(());
    }

    // Delete exercises by IDs
    collections
        .workout_exercises
        .delete_many(doc! {
            "_id": { "$in": object_ids },
            "program_id": program_id
        })
        .await?;

    Ok(())
}
