// API Configuration
// Change this to match your deployment environment

// For development with docker-compose (nginx on port 80)
// export const API_BASE_URL = "http://192.168.1.9:80";

// For development without docker (direct to API gateway on port 3000)
// export const API_BASE_URL = "http://192.168.1.9:3000";

// For local development
// export const API_BASE_URL = "http://localhost:80";

// Default configuration - uses nginx reverse proxy
export const API_BASE_URL = "http://192.168.1.9:80";
