use std::sync::Arc;
use axum::{
    extract::FromRef,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use axum_jwt_auth::{Claims, Decoder, LocalDecoder};
use jsonwebtoken::{Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct MyClaims {
    sub: String,
    exp: usize,
    aud: String,
    role: String,
}

#[derive(Clone, FromRef)]
struct AppState {
    decoder: Decoder<MyClaims>,
    jwt_secret: String,
}

#[derive(Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Serialize)]
struct LoginResponse {
    token: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

// Custom error type
enum AppError {
    Unauthorized(String),
    InternalServerError(String),
    // BadRequest(String), // maybe use later
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg),
            AppError::InternalServerError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
            // AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
        };

        let body = Json(ErrorResponse {
            error: error_message,
        });

        (status, body).into_response()
    }
}

async fn login(
    axum::extract::State(state): axum::extract::State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    // Validate credentials, todo change this to real validation
    println!("{}", payload.username);
    if payload.username != "admin" || payload.password != "password" {
        return Err(AppError::Unauthorized(
            "Invalid username or password".to_string()
        ));
    }

    let claims = MyClaims {
        sub: payload.username,
        exp: (chrono::Utc::now() + chrono::Duration::hours(24)).timestamp() as usize,
        aud: "my-app".to_string(),
        role: "user".to_string(),
    };

    let token = jsonwebtoken::encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::InternalServerError(format!("Token generation failed: {}", e)))?;

    Ok(Json(LoginResponse { token }))
}

async fn protected(user: Claims<MyClaims>) -> Json<MyClaims> {
    Json(user.claims)
}

async fn public() -> &'static str {
    "This is a public endpoint - no auth needed!"
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    
    let jwt_secret = std::env::var("JWT_SECRET")
        .expect("JWT_SECRET must be set in environment");
    
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_audience(&["my-app"]);
    
    let decoder = LocalDecoder::builder()
        .keys(vec![DecodingKey::from_secret(jwt_secret.as_bytes())])
        .validation(validation)
        .build()
        .unwrap();

    let state = AppState {
        decoder: Arc::new(decoder),
        jwt_secret: jwt_secret.clone(),
    };

    let app = Router::new()
        .route("/", get(public))
        .route("/login", post(login))
        .route("/protected", get(protected))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("192.168.1.9:3000")
        .await
        .unwrap();
    
    axum::serve(listener, app).await.unwrap();
}