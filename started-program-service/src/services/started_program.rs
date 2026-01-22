use bson::{doc, oid::ObjectId};
use chrono::Utc;
use futures::TryStreamExt;

use crate::db::Collections;
use crate::error::AppError;
use crate::models::{
    CurrentWorkoutResponse, StartedProgram, StartedProgramResponse, StartedSet,
    StartedWorkoutExercise, StartedWorkoutExerciseResponse, WeekHistoryGroup,
    WorkoutHistoryDetailResponse, WorkoutHistoryItem, WorkoutHistoryResponse,
};
use crate::services::workout_client::{NextWorkoutResponse, WorkoutClient};

/// Start a new program for a user
pub async fn start_program(
    collections: &Collections,
    workout_client: &WorkoutClient<'_>,
    user_id: &str,
    program_id: &str,
) -> Result<StartedProgramResponse, AppError> {
    // 1. Verify program exists by calling workout-service
    let program = workout_client.get_program(program_id, user_id).await?;

    // 2. Check if user already has this program started
    let existing = collections
        .started_programs
        .find_one(doc! { "user_id": user_id, "program_id": program_id })
        .await?;

    if existing.is_some() {
        return Err(AppError::BadRequest(
            "Program already started".to_string(),
        ));
    }

    // 3. Get next workout (starting from 0)
    let next_workout = workout_client
        .get_next_workout(program_id, 0, user_id)
        .await?;

    let now = Utc::now();
    // 4. Create started program
    let started_program = StartedProgram {
        id: ObjectId::new(),
        user_id: user_id.to_string(),
        program_id: program_id.to_string(),
        program_name: program.name,
        program_image_url: program.image_url,
        current_workout_number: next_workout.as_ref().map(|w| w.workout_number),
        workout_started: false,
        updated_at: now,
    };

    collections
        .started_programs
        .insert_one(&started_program)
        .await?;

    // 5. If next workout exists, create started workout exercises
    if let Some(workout) = next_workout {
        initialize_workout_exercises(collections, &started_program.id.to_hex(), &workout).await?;
    }

    Ok(started_program.into())
}

/// Initialize workout exercises from workout-service response
pub async fn initialize_workout_exercises(
    collections: &Collections,
    started_program_id: &str,
    workout: &NextWorkoutResponse,
) -> Result<(), AppError> {
    let exercises: Vec<StartedWorkoutExercise> = workout
        .exercises
        .iter()
        .map(|e| StartedWorkoutExercise {
            id: ObjectId::new(),
            started_program_id: started_program_id.to_string(),
            workout_number: e.workout_number,
            week: e.week,
            order: e.order,
            exercise_id: e.exercise_id.clone(),
            volume_metric: e.volume_metric.clone(),
            intensity_metric: e.intensity_metric.clone(),
            notes: e.notes.clone(),
            sets: e
                .sets
                .iter()
                .map(|s| StartedSet {
                    number: s.number,
                    volume_lower: s.volume_lower,
                    volume_upper: s.volume_upper,
                    intensity_lower: s.intensity_lower,
                    intensity_upper: s.intensity_upper,
                    done_volume: None,
                    done_intensity: None,
                })
                .collect(),
            completed_at: None,
        })
        .collect();

    if !exercises.is_empty() {
        collections
            .started_workout_exercises
            .insert_many(&exercises)
            .await?;
    }

    Ok(())
}

/// Start the current workout (set workout_started to true)
pub async fn start_workout(
    collections: &Collections,
    user_id: &str,
    started_program_id: &str,
) -> Result<StartedProgramResponse, AppError> {
    let oid = ObjectId::parse_str(started_program_id)
        .map_err(|e| AppError::BadRequest(format!("Invalid ObjectId: {}", e)))?;

    // Verify ownership and get program
    let started_program = collections
        .started_programs
        .find_one(doc! { "_id": &oid, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Started program not found".to_string()))?;

    if started_program.current_workout_number.is_none() {
        return Err(AppError::BadRequest("Program is finished".to_string()));
    }

    if started_program.workout_started {
        return Err(AppError::BadRequest("Workout already started".to_string()));
    }

    let now = Utc::now();

    // Update workout_started to true
    collections
        .started_programs
        .update_one(
            doc! { "_id": &oid },
            doc! { "$set": { "workout_started": true, "updated_at": now.to_rfc3339() } },
        )
        .await?;

    // Return updated program
    let updated = StartedProgram {
        workout_started: true,
        updated_at: now,
        ..started_program
    };

    Ok(updated.into())
}

/// Finish the current workout
pub async fn finish_workout(
    collections: &Collections,
    workout_client: &WorkoutClient<'_>,
    user_id: &str,
    started_program_id: &str,
) -> Result<StartedProgramResponse, AppError> {
    let oid = ObjectId::parse_str(started_program_id)
        .map_err(|e| AppError::BadRequest(format!("Invalid ObjectId: {}", e)))?;

    // Verify ownership and get program
    let started_program = collections
        .started_programs
        .find_one(doc! { "_id": &oid, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Started program not found".to_string()))?;

    let current_workout_number = started_program
        .current_workout_number
        .ok_or_else(|| AppError::BadRequest("Program is finished".to_string()))?;

    if !started_program.workout_started {
        return Err(AppError::BadRequest("No workout in progress".to_string()));
    }

    let now = Utc::now();

    // Mark current workout exercises as completed (instead of deleting them)
    collections
        .started_workout_exercises
        .update_many(
            doc! {
                "started_program_id": started_program_id,
                "workout_number": current_workout_number
            },
            doc! { "$set": { "completed_at": now.to_rfc3339() } },
        )
        .await?;

    // Try to find next workout
    let next_workout = workout_client
        .get_next_workout(&started_program.program_id, current_workout_number, user_id)
        .await?;

    let new_workout_number = if let Some(workout) = &next_workout {
        // Initialize new workout exercises
        initialize_workout_exercises(collections, started_program_id, workout).await?;
        Some(workout.workout_number)
    } else {
        // No more workouts - program completed
        None
    };

    // Update started program
    let update_doc = if let Some(num) = new_workout_number {
        doc! {
            "$set": {
                "current_workout_number": num,
                "workout_started": false,
                "updated_at": now.to_rfc3339()
            }
        }
    } else {
        doc! {
            "$set": {
                "current_workout_number": bson::Bson::Null,
                "workout_started": false,
                "updated_at": now.to_rfc3339()
            }
        }
    };

    collections
        .started_programs
        .update_one(doc! { "_id": &oid }, update_doc)
        .await?;

    // Return updated program
    let updated = StartedProgram {
        current_workout_number: new_workout_number,
        workout_started: false,
        updated_at: now,
        ..started_program
    };

    Ok(updated.into())
}

/// Get all started programs for a user (sorted by updated_at descending)
pub async fn get_started_programs(
    collections: &Collections,
    user_id: &str,
) -> Result<Vec<StartedProgramResponse>, AppError> {
    let cursor = collections
        .started_programs
        .find(doc! { "user_id": user_id })
        .sort(doc! { "updated_at": -1 })
        .await?;

    let programs: Vec<StartedProgram> = cursor.try_collect().await?;

    Ok(programs.into_iter().map(|p| p.into()).collect())
}

/// Get a specific started program
pub async fn get_started_program(
    collections: &Collections,
    user_id: &str,
    started_program_id: &str,
) -> Result<StartedProgramResponse, AppError> {
    let oid = ObjectId::parse_str(started_program_id)
        .map_err(|e| AppError::BadRequest(format!("Invalid ObjectId: {}", e)))?;

    let started_program = collections
        .started_programs
        .find_one(doc! { "_id": &oid, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Started program not found".to_string()))?;

    Ok(started_program.into())
}

/// Get current workout exercises
pub async fn get_current_workout(
    collections: &Collections,
    user_id: &str,
    started_program_id: &str,
) -> Result<CurrentWorkoutResponse, AppError> {
    let oid = ObjectId::parse_str(started_program_id)
        .map_err(|e| AppError::BadRequest(format!("Invalid ObjectId: {}", e)))?;

    // Verify ownership and get program
    let started_program = collections
        .started_programs
        .find_one(doc! { "_id": &oid, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Started program not found".to_string()))?;

    let current_workout_number = started_program
        .current_workout_number
        .ok_or_else(|| AppError::BadRequest("Program is finished".to_string()))?;

    // Get exercises for current workout
    let cursor = collections
        .started_workout_exercises
        .find(doc! {
            "started_program_id": started_program_id,
            "workout_number": current_workout_number
        })
        .sort(doc! { "order": 1 })
        .await?;

    let exercises: Vec<StartedWorkoutExercise> = cursor.try_collect().await?;

    Ok(CurrentWorkoutResponse {
        started_program_id: started_program_id.to_string(),
        workout_number: current_workout_number,
        exercises: exercises.into_iter().map(|e| e.into()).collect(),
    })
}

/// Update exercise progress (sets)
pub async fn update_exercise_progress(
    collections: &Collections,
    user_id: &str,
    started_program_id: &str,
    exercise_id: &str,
    sets: Vec<StartedSet>,
) -> Result<StartedWorkoutExerciseResponse, AppError> {
    let program_oid = ObjectId::parse_str(started_program_id)
        .map_err(|e| AppError::BadRequest(format!("Invalid ObjectId: {}", e)))?;

    let exercise_oid = ObjectId::parse_str(exercise_id)
        .map_err(|e| AppError::BadRequest(format!("Invalid exercise ObjectId: {}", e)))?;

    // Verify ownership
    collections
        .started_programs
        .find_one(doc! { "_id": &program_oid, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Started program not found".to_string()))?;

    // Update exercise sets
    let sets_bson = bson::to_bson(&sets)
        .map_err(|e| AppError::InternalServerError(format!("Failed to serialize sets: {}", e)))?;

    collections
        .started_workout_exercises
        .update_one(
            doc! { "_id": &exercise_oid, "started_program_id": started_program_id },
            doc! { "$set": { "sets": sets_bson } },
        )
        .await?;

    // Update started program updated_at
    let now = Utc::now();
    collections
        .started_programs
        .update_one(
            doc! { "_id": &program_oid },
            doc! { "$set": { "updated_at": now.to_rfc3339() } },
        )
        .await?;

    // Get updated exercise
    let exercise = collections
        .started_workout_exercises
        .find_one(doc! { "_id": &exercise_oid })
        .await?
        .ok_or_else(|| AppError::NotFound("Exercise not found".to_string()))?;

    Ok(exercise.into())
}

/// Delete a started program
pub async fn delete_started_program(
    collections: &Collections,
    user_id: &str,
    started_program_id: &str,
) -> Result<(), AppError> {
    let oid = ObjectId::parse_str(started_program_id)
        .map_err(|e| AppError::BadRequest(format!("Invalid ObjectId: {}", e)))?;

    // Verify ownership
    let result = collections
        .started_programs
        .delete_one(doc! { "_id": &oid, "user_id": user_id })
        .await?;

    if result.deleted_count == 0 {
        return Err(AppError::NotFound("Started program not found".to_string()));
    }

    // Delete all associated workout exercises
    collections
        .started_workout_exercises
        .delete_many(doc! { "started_program_id": started_program_id })
        .await?;

    Ok(())
}

/// Get workout history overview (all completed workouts grouped by week)
pub async fn get_workout_history(
    collections: &Collections,
    user_id: &str,
    started_program_id: &str,
) -> Result<WorkoutHistoryResponse, AppError> {
    let oid = ObjectId::parse_str(started_program_id)
        .map_err(|e| AppError::BadRequest(format!("Invalid ObjectId: {}", e)))?;

    // Verify ownership and get program
    let started_program = collections
        .started_programs
        .find_one(doc! { "_id": &oid, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Started program not found".to_string()))?;

    // Get all completed exercises (completed_at is set)
    let cursor = collections
        .started_workout_exercises
        .find(doc! {
            "started_program_id": started_program_id,
            "completed_at": { "$ne": bson::Bson::Null }
        })
        .sort(doc! { "week": 1, "workout_number": 1, "order": 1 })
        .await?;

    let exercises: Vec<StartedWorkoutExercise> = cursor.try_collect().await?;

    // Group by week and workout_number
    let mut weeks_map: std::collections::BTreeMap<i32, std::collections::BTreeMap<i32, Option<String>>> =
        std::collections::BTreeMap::new();

    for exercise in exercises {
        let week_entry = weeks_map.entry(exercise.week).or_default();
        // Use the first exercise's completed_at for the workout
        week_entry
            .entry(exercise.workout_number)
            .or_insert_with(|| exercise.completed_at.map(|d| d.to_rfc3339()));
    }

    let weeks: Vec<WeekHistoryGroup> = weeks_map
        .into_iter()
        .map(|(week, workouts_map)| WeekHistoryGroup {
            week,
            workouts: workouts_map
                .into_iter()
                .map(|(workout_number, completed_at)| WorkoutHistoryItem {
                    workout_number,
                    week,
                    completed_at,
                })
                .collect(),
        })
        .collect();

    Ok(WorkoutHistoryResponse {
        started_program_id: started_program_id.to_string(),
        program_name: started_program.program_name,
        program_image_url: started_program.program_image_url,
        weeks,
    })
}

/// Get a specific historical workout's exercises
pub async fn get_workout_history_detail(
    collections: &Collections,
    user_id: &str,
    started_program_id: &str,
    workout_number: i32,
) -> Result<WorkoutHistoryDetailResponse, AppError> {
    let oid = ObjectId::parse_str(started_program_id)
        .map_err(|e| AppError::BadRequest(format!("Invalid ObjectId: {}", e)))?;

    // Verify ownership
    collections
        .started_programs
        .find_one(doc! { "_id": &oid, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Started program not found".to_string()))?;

    // Get exercises for this workout that are completed
    let cursor = collections
        .started_workout_exercises
        .find(doc! {
            "started_program_id": started_program_id,
            "workout_number": workout_number,
            "completed_at": { "$ne": bson::Bson::Null }
        })
        .sort(doc! { "order": 1 })
        .await?;

    let exercises: Vec<StartedWorkoutExercise> = cursor.try_collect().await?;

    if exercises.is_empty() {
        return Err(AppError::NotFound(
            "No completed workout found for this workout number".to_string(),
        ));
    }

    let week = exercises[0].week;
    let completed_at = exercises[0].completed_at.map(|d| d.to_rfc3339());

    Ok(WorkoutHistoryDetailResponse {
        started_program_id: started_program_id.to_string(),
        workout_number,
        week,
        completed_at,
        exercises: exercises.into_iter().map(|e| e.into()).collect(),
    })
}
