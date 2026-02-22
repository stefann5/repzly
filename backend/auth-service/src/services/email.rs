use lettre::{
    message::header::ContentType, transport::smtp::authentication::Credentials,
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};
use rand::Rng;
use sqlx::PgPool;

use crate::config::{SmtpConfig, VERIFICATION_TOKEN_DURATION_HOURS};
use crate::error::AppError;

pub fn generate_verification_code() -> String {
    let mut rng = rand::thread_rng();
    let code: u32 = rng.gen_range(100000..999999);
    code.to_string()
}

pub async fn send_verification_email(
    smtp_config: &SmtpConfig,
    to_email: &str,
    verification_token: &str,
) -> Result<(), AppError> {
    let verification_url = format!(
        "{}/verify-email?token={}",
        smtp_config.app_url, verification_token
    );

    let email_body = format!(
        r#"
        <html>
        <body>
            <h2>Welcome! Please verify your email</h2>
            <p>Thank you for registering. Please click the link below to verify your email address:</p>
            <p><a href="{}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; display: inline-block;">Verify Email</a></p>
            <p>Or copy and paste this link in your browser:</p>
            <p>{}</p>
            <p>Your verification code is: <strong>{}</strong></p>
            <p>This link will expire in 24 hours.</p>
            <br>
            <p>If you did not create an account, please ignore this email.</p>
        </body>
        </html>
        "#,
        verification_url, verification_url, verification_token
    );

    let email = Message::builder()
        .from(
            smtp_config
                .from_email
                .parse()
                .map_err(|e| AppError::InternalServerError(format!("Invalid from email: {}", e)))?,
        )
        .to(to_email
            .parse()
            .map_err(|e| AppError::InternalServerError(format!("Invalid to email: {}", e)))?)
        .subject("Verify your email address")
        .header(ContentType::TEXT_HTML)
        .body(email_body)
        .map_err(|e| AppError::InternalServerError(format!("Failed to build email: {}", e)))?;

    let creds = Credentials::new(
        smtp_config.smtp_username.clone(),
        smtp_config.smtp_password.clone(),
    );

    let mailer: AsyncSmtpTransport<Tokio1Executor> =
        AsyncSmtpTransport::<Tokio1Executor>::relay(&smtp_config.smtp_host)
            .map_err(|e| AppError::InternalServerError(format!("SMTP connection failed: {}", e)))?
            .credentials(creds)
            .build();

    mailer
        .send(email)
        .await
        .map_err(|e| AppError::InternalServerError(format!("Failed to send email: {}", e)))?;

    Ok(())
}

pub async fn create_verification_token(db: &PgPool, user_id: i32) -> Result<String, AppError> {
    // Delete any existing tokens for this user
    sqlx::query("DELETE FROM email_verification_tokens WHERE user_id = $1")
        .bind(user_id)
        .execute(db)
        .await
        .ok();

    let token = generate_verification_code();
    let expires_at =
        chrono::Utc::now() + chrono::Duration::hours(VERIFICATION_TOKEN_DURATION_HOURS);

    sqlx::query(
        "INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
    )
    .bind(user_id)
    .bind(&token)
    .bind(expires_at)
    .execute(db)
    .await
    .map_err(|e| {
        AppError::InternalServerError(format!("Failed to store verification token: {}", e))
    })?;

    Ok(token)
}