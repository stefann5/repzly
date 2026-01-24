use mongodb::{Collection, Database};

use crate::models::{StartedProgram, StartedWorkoutExercise};

#[derive(Clone)]
pub struct Collections {
    pub started_programs: Collection<StartedProgram>,
    pub started_workout_exercises: Collection<StartedWorkoutExercise>,
}

impl Collections {
    pub fn new(db: &Database) -> Self {
        Self {
            started_programs: db.collection("started_programs"),
            started_workout_exercises: db.collection("started_workout_exercises"),
        }
    }
}
