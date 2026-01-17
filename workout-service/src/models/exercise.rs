use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MuscleIntensity {
    pub muscle: String,
    pub intensity: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Exercise {
    #[serde(rename = "_id")]
    pub id: String,
    pub name: String,
    pub demonstration_link: String,
    pub muscles: Vec<MuscleIntensity>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateExerciseRequest {
    pub id: String, // client-generated UUID
    pub name: String,
    pub demonstration_link: String,
    pub muscles: Vec<MuscleIntensity>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateExerciseRequest {
    pub name: Option<String>,
    pub demonstration_link: Option<String>,
    pub muscles: Option<Vec<MuscleIntensity>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExerciseResponse {
    pub id: String,
    pub name: String,
    pub demonstration_link: String,
    pub muscles: Vec<MuscleIntensity>,
}

#[derive(Debug, Deserialize)]
pub struct ExerciseQueryParams {
    pub search: Option<String>,
    pub page: Option<u64>,
    pub limit: Option<u64>,
}

#[derive(Debug, Serialize)]
pub struct PaginatedExerciseResponse {
    pub exercises: Vec<ExerciseResponse>,
    pub total: u64,
    pub page: u64,
    pub limit: u64,
    pub total_pages: u64,
}

impl From<Exercise> for ExerciseResponse {
    fn from(e: Exercise) -> Self {
        Self {
            id: e.id,
            name: e.name,
            demonstration_link: e.demonstration_link,
            muscles: e.muscles,
        }
    }
}
