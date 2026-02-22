use mongodb::{Collection, Database};

use crate::models::ExerciseTimeseries;

#[derive(Clone)]
pub struct Collections {
    pub exercise_timeseries: Collection<ExerciseTimeseries>,
}

impl Collections {
    pub fn new(db: &Database) -> Self {
        Self {
            exercise_timeseries: db.collection("exercise_timeseries"),
        }
    }
}
