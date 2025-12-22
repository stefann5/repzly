use serde::{Deserialize, Serialize};

#[derive(sqlx::FromRow)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub password_hash: String,
    pub role: String,
    pub email_verified: bool,
}

#[derive(sqlx::FromRow)]
pub struct UserBasic {
    pub id: i32,
    pub email: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    User,
    Coach,
    Admin,
}

impl std::fmt::Display for Role {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Role::User => write!(f, "user"),
            Role::Coach => write!(f, "coach"),
            Role::Admin => write!(f, "admin"),
        }
    }
}