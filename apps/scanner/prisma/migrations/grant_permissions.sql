-- Grant permissions script
-- Run this AFTER creating the tables if you get "permission denied" errors
-- Replace 'raawi' with your actual database user name from DATABASE_URL

-- Grant permissions on Entity tables
GRANT ALL PRIVILEGES ON TABLE "Entity" TO raawi;
GRANT ALL PRIVILEGES ON TABLE "EntityContact" TO raawi;
GRANT ALL PRIVILEGES ON TABLE "Property" TO raawi;

-- Grant permissions on sequences (for auto-generated UUIDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO raawi;

-- Grant permissions on existing tables that were modified
-- (These should already have permissions, but ensuring they're set)
GRANT ALL PRIVILEGES ON TABLE "Scan" TO raawi;
GRANT ALL PRIVILEGES ON TABLE "Site" TO raawi;

-- Alternative: Grant all privileges on all tables in public schema
-- Uncomment if the above doesn't work:
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO raawi;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO raawi;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO raawi;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO raawi;

