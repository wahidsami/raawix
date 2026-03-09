# Why the SQL Duplicate Key Error Occurs

## The Problem

You're getting this error:
```
ERROR: duplicate key value violates unique constraint "Site_domain_key"
Key (domain)=(localhost:4173) already exists.
```

## What's Happening

### Current Database State

You have **2 Sites** in the database:

1. **Site #1**: 
   - `domain = "localhost:4173"` ✅ (correct format)

2. **Site #2**: 
   - `domain = "http://localhost:4173/messy"` ❌ (wrong format - full URL)

### The Unique Constraint

The `Site` table has a **unique constraint** on the `domain` column:
```sql
domain String @unique
```

This means **no two Sites can have the same domain value**.

### What the UPDATE Statement Tries to Do

When you run:
```sql
UPDATE "Site"
SET domain = SUBSTRING(domain FROM 'http://([^/]+)')
WHERE domain LIKE 'http://%'
```

PostgreSQL tries to:
1. Find Site #2 with `domain = "http://localhost:4173/messy"`
2. Extract `localhost:4173` from it
3. **Set Site #2's domain to `localhost:4173`**

### Why It Fails

**Before UPDATE:**
- Site #1: `domain = "localhost:4173"` ✅
- Site #2: `domain = "http://localhost:4173/messy"` ❌

**After UPDATE (what PostgreSQL tries to do):**
- Site #1: `domain = "localhost:4173"` ✅
- Site #2: `domain = "localhost:4173"` ❌ **DUPLICATE!**

PostgreSQL sees that `localhost:4173` already exists (in Site #1), so it **rejects the UPDATE** and throws the duplicate key error.

## The Solution

Instead of **UPDATING** Site #2 (which would create a duplicate), we should **DELETE** it:

1. Site #2 has **no PageVersions** (we confirmed this earlier)
2. Site #1 already has the correct format
3. So we can safely **DELETE** Site #2

**After DELETE:**
- Site #1: `domain = "localhost:4173"` ✅
- (Site #2 is gone)

No duplicates, no errors!

## Why This Happened

The Sites were created incorrectly in the past. The `getOrCreateSite()` function was probably called with a full URL instead of just the hostname:port. This is why we also fixed the `getHostname()` function to always return `hostname:port` format.

## Summary

- **Problem**: Trying to UPDATE a Site to a domain that already exists
- **Root Cause**: Two Sites exist - one correct, one with full URL
- **Solution**: DELETE the Site with full URL (it has no data anyway)
- **Prevention**: Fixed `getHostname()` to always return correct format

