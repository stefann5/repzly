pub const ACCESS_TOKEN_DURATION_HOURS: i64 = 1;
pub const REFRESH_TOKEN_DURATION_DAYS: i64 = 7;
pub const VERIFICATION_TOKEN_DURATION_HOURS: i64 = 24;

#[derive(Clone)]
pub struct SmtpConfig {
    pub smtp_host: String,
    pub smtp_username: String,
    pub smtp_password: String,
    pub from_email: String,
    pub app_url: String,
}

impl SmtpConfig {
    pub fn from_env() -> Self {
        Self {
            smtp_host: std::env::var("SMTP_HOST").expect("SMTP_HOST must be set"),
            smtp_username: std::env::var("SMTP_USERNAME").expect("SMTP_USERNAME must be set"),
            smtp_password: std::env::var("SMTP_PASSWORD").expect("SMTP_PASSWORD must be set"),
            from_email: std::env::var("SMTP_FROM_EMAIL").expect("SMTP_FROM_EMAIL must be set"),
            app_url: std::env::var("APP_URL").unwrap_or_else(|_| "http://localhost:3000".to_string()),
        }
    }
}