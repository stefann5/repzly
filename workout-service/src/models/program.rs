use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Program {
    #[serde(rename = "_id")]
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub total_weeks: i32,
    pub last_workout_number: i32,
    pub public: bool,
    pub created_at: Option<DateTime<Utc>>, // None = draft, Some = published
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProgramRequest {
    pub id: String, // client-generated UUID
    pub name: String,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub total_weeks: Option<i32>,
    pub public: Option<bool>,
    pub created: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProgramRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub total_weeks: Option<i32>,
    pub public: Option<bool>,
    pub created: Option<bool>, // one-way: draft -> published
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProgramResponse {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub tags: Vec<String>,
    pub total_weeks: i32,
    pub last_workout_number: i32,
    pub public: bool,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: DateTime<Utc>,
}

impl From<Program> for ProgramResponse {
    fn from(p: Program) -> Self {
        Self {
            id: p.id,
            name: p.name,
            description: p.description,
            tags: p.tags,
            total_weeks: p.total_weeks,
            last_workout_number: p.last_workout_number,
            public: p.public,
            created_at: p.created_at,
            updated_at: p.updated_at,
        }
    }
}
