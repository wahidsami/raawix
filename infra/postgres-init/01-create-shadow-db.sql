-- Create shadow database for Prisma migrate dev.
-- Used only when SHADOW_DATABASE_URL points to raawix_shadow.
-- This script runs once when the Postgres volume is first created.
CREATE DATABASE raawix_shadow;
