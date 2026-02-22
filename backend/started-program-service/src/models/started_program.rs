use bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// StartedProgram model for MongoDB storage
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StartedProgram {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub user_id: String,
    pub program_id: String,
    pub program_name: String,
    pub program_image_url: Option<String>,
    /// None means program is finished
    pub current_workout_number: Option<i32>,
    pub workout_started: bool,
    pub updated_at: DateTime<Utc>,
}

/// StartedProgram response for JSON output
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StartedProgramResponse {
    pub id: String,
    pub user_id: String,
    pub program_id: String,
    pub program_name: String,
    pub program_image_url: Option<String>,
    /// null means program is finished
    pub current_workout_number: Option<i32>,
    pub workout_started: bool,
    pub updated_at: String,
}

impl From<StartedProgram> for StartedProgramResponse {
    fn from(p: StartedProgram) -> Self {
        Self {
            id: p.id.to_hex(),
            user_id: p.user_id,
            program_id: p.program_id,
            program_name: p.program_name,
            program_image_url: p.program_image_url,
            current_workout_number: p.current_workout_number,
            workout_started: p.workout_started,
            updated_at: p.updated_at.to_rfc3339(),
        }
    }
}

/// Request to start a program
#[derive(Debug, Deserialize)]
pub struct StartProgramRequest {
    pub program_id: String,
}
