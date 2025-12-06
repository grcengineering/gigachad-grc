-- GigaChad GRC - Database Initialization Script
-- This script runs on first database creation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- Create schemas for each module
CREATE SCHEMA IF NOT EXISTS controls;
CREATE SCHEMA IF NOT EXISTS frameworks;
CREATE SCHEMA IF NOT EXISTS integrations;
CREATE SCHEMA IF NOT EXISTS policies;
CREATE SCHEMA IF NOT EXISTS shared;

-- Grant usage on schemas
GRANT USAGE ON SCHEMA controls TO PUBLIC;
GRANT USAGE ON SCHEMA frameworks TO PUBLIC;
GRANT USAGE ON SCHEMA integrations TO PUBLIC;
GRANT USAGE ON SCHEMA policies TO PUBLIC;
GRANT USAGE ON SCHEMA shared TO PUBLIC;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'GigaChad GRC database initialized successfully';
END $$;



