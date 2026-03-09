# Admin Login Details

## Default Admin Credentials

**Email:** `admin@local`  
**Password:** `admin123`

⚠️ **Development Only** - Change password in production!

## Setup Required Before Login

### Step 1: Start Docker Infrastructure
```bash
pnpm infra:up
```

This starts:
- Postgres on port 5432
- Redis on port 6379

### Step 2: Run Database Migration
```bash
pnpm --filter scanner db:migrate
```

This creates the `AdminUser` table.

### Step 3: Seed Admin User
```bash
pnpm --filter scanner db:seed
```

This creates the default admin user with the credentials above.

### Step 4: Start Services
```bash
# Terminal 1: Start scanner API
pnpm scanner:dev

# Terminal 2: Start dashboard
pnpm dev
```

### Step 5: Login
1. Open dashboard: http://localhost:5173
2. You'll be redirected to `/login`
3. Enter:
   - Email: `admin@local`
   - Password: `admin123`
4. Click "Sign In"

## Verify Login Works

After login, you should:
- ✅ See the dashboard overview page
- ✅ See your email in the header
- ✅ Be able to navigate to all pages
- ✅ Have access to all features

## Troubleshooting

### "Invalid email or password"
- Make sure you ran `pnpm --filter scanner db:seed`
- Check that Postgres is running: `docker ps`
- Verify AdminUser table exists: `pnpm --filter scanner db:studio`

### "Database not available"
- Check Docker: `docker ps` (should see `raawix_postgres`)
- Check `DATABASE_URL` in `apps/scanner/.env`
- Check Postgres logs: `docker logs raawix_postgres`

### "Connection refused"
- Start Docker: `pnpm infra:up`
- Wait a few seconds for Postgres to initialize
- Check logs: `pnpm infra:logs`

## Change Password (Future)

Currently, password change is not implemented. To change password:

1. Use Prisma Studio:
   ```bash
   pnpm --filter scanner db:studio
   ```
2. Find `AdminUser` table
3. Update `passwordHash` (use bcrypt to hash new password)

Or update the seed script and re-run it.

## Security Reminder

⚠️ **For Production:**
- Change default password immediately
- Set strong `JWT_SECRET` in environment
- Use strong Postgres password
- Enable SSL for database connections

