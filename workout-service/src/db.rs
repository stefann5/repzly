use mongodb::{Collection, Database};

use crate::models::{Program, WorkoutExercise};

#[derive(Clone)]
pub struct Collections {
    pub programs: Collection<Program>,
    pub workout_exercises: Collection<WorkoutExercise>,
}

impl Collections {
    pub fn new(db: &Database) -> Self {
        Self {
            programs: db.collection("programs"),
            workout_exercises: db.collection("workout_exercises"),
        }
    }
}
