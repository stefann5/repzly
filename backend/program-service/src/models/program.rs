use bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::workout_exercise::IdMapping;

/// Program model for MongoDB storage - uses native ObjectId
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Program {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub tags: Vec<String>,
    pub total_weeks: i32,
    pub last_workout_number: i32,
    pub public: bool,
    pub created_at: Option<DateTime<Utc>>, // None = draft, Some = published
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProgramRequest {
    pub id: String, // temp ID from client (will be replaced with MongoDB ObjectId)
    pub name: String,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub total_weeks: Option<i32>,
    pub public: Option<bool>,
    pub created: Option<bool>,
}

/// Response for create program with ID mapping
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProgramResponse {
    #[serde(flatten)]
    pub program: ProgramResponse,
    /// ID mapping if a temp ID was replaced (None if ID was already valid)
    pub id_mapping: Option<IdMapping>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProgramRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub image_url: Option<String>,
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
    pub image_url: Option<String>,
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
            id: p.id.to_hex(),
            name: p.name,
            description: p.description,
            image_url: p.image_url,
            tags: p.tags,
            total_weeks: p.total_weeks,
            last_workout_number: p.last_workout_number,
            public: p.public,
            created_at: p.created_at,
            updated_at: p.updated_at,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct ProgramSearchParams {
    pub search: Option<String>,
    pub page: Option<u64>,
    pub limit: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedProgramResponse {
    pub programs: Vec<ProgramResponse>,
    pub total: u64,
    pub page: u64,
    pub limit: u64,
    pub total_pages: u64,
}
