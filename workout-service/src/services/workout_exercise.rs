use bson::doc;
use futures::TryStreamExt;
use mongodb::options::ReplaceOptions;

use crate::db::Collections;
use crate::error::AppError;
use crate::models::{
    DeleteExercisesRequest, DeleteWorkoutsRequest, UpsertExercisesRequest, WeekResponse,
    WorkoutExercise, WorkoutGroup,
};

pub async fn get_week(
    collections: &Collections,
    user_id: &str,
    program_id: &str,
    week: i32,
) -> Result<WeekResponse, AppError> {
    // Verify program ownership
    let program = collections
        .programs
        .find_one(doc! { "_id": program_id, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Program not found".to_string()))?;

    // Get all exercises for this week
    let cursor = collections
        .workout_exercises
        .find(doc! { "program_id": program_id, "week": week })
        .sort(doc! { "workout_number": 1, "order": 1 })
        .await?;

    let exercises: Vec<WorkoutExercise> = cursor.try_collect().await?;

    // Group by workout_number
    let mut workouts: Vec<WorkoutGroup> = Vec::new();
    let mut current_workout_number: Option<i32> = None;

    for exercise in exercises {
        if current_workout_number != Some(exercise.workout_number) {
            workouts.push(WorkoutGroup {
                workout_number: exercise.workout_number,
                exercises: vec![exercise],
            });
            current_workout_number = Some(workouts.last().unwrap().workout_number);
        } else {
            workouts.last_mut().unwrap().exercises.push(exercise);
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
) -> Result<(), AppError> {
    // Verify program ownership
    let program = collections
        .programs
        .find_one(doc! { "_id": program_id, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Program not found".to_string()))?;

    // Find max workout_number in request
    let max_workout_number = req
        .exercises
        .iter()
        .map(|e| e.workout_number)
        .max()
        .unwrap_or(0);

    // Upsert each exercise
    let options = ReplaceOptions::builder().upsert(true).build();

    for exercise_input in req.exercises {
        let exercise = WorkoutExercise {
            id: exercise_input.id.clone(),
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

        collections
            .workout_exercises
            .replace_one(doc! { "_id": &exercise_input.id }, &exercise)
            .with_options(options.clone())
            .await?;
    }

    // Update last_workout_number if needed
    if max_workout_number > program.last_workout_number {
        collections
            .programs
            .update_one(
                doc! { "_id": program_id },
                doc! { "$set": { "last_workout_number": max_workout_number } },
            )
            .await?;
    }

    Ok(())
}

pub async fn delete_workouts(
    collections: &Collections,
    user_id: &str,
    program_id: &str,
    req: DeleteWorkoutsRequest,
) -> Result<(), AppError> {
    // Verify program ownership
    collections
        .programs
        .find_one(doc! { "_id": program_id, "user_id": user_id })
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
    // Verify program ownership
    collections
        .programs
        .find_one(doc! { "_id": program_id, "user_id": user_id })
        .await?
        .ok_or_else(|| AppError::NotFound("Program not found".to_string()))?;

    // Delete exercises by IDs
    collections
        .workout_exercises
        .delete_many(doc! {
            "_id": { "$in": &req.ids },
            "program_id": program_id
        })
        .await?;

    Ok(())
}
