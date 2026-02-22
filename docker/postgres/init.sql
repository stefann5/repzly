-- PostgreSQL initialization script for Repzly
-- Tables are created by auth-service on startup
-- This script ensures the database is ready

-- Create extension for better text search (optional)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL database initialized for Repzly';
    RAISE NOTICE 'Tables and seed data will be created by auth-service on startup';
END $$;
