# URGENT: Fix Database Connection Error

## The Problem
Your Vercel deployment is experiencing: `MaxClientsInSessionMode: max clients reached`

This happens because you're using Supabase in Session mode which only allows 5-15 concurrent connections, but Vercel serverless functions create many connections.

## Quick Fix (5 minutes)

### Step 1: Update Vercel Environment Variables

1. Go to https://vercel.com/dashboard
2. Select your project: `creative-printing-technology`
3. Go to **Settings** → **Environment Variables**
4. Update or add these TWO variables:

#### DATABASE_URL
Change from port **5432** to **6543** and add `?pgbouncer=true&connection_limit=1`:
```
postgresql://postgres.xxxxx:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

#### DIRECT_URL (NEW variable)
Keep port **5432** (or 6543 without pgbouncer):
```
postgresql://postgres.xxxxx:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

> **Important**: Use your actual Supabase password in both URLs

### Step 2: Redeploy

After updating the environment variables, Vercel will automatically redeploy. Or you can trigger a manual redeploy.

### Step 3: Update Local .env File (Optional, for local development)

Update your local `.env` file with the same format:
```env
DATABASE_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxxx:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

Then run:
```bash
npx prisma generate
```

## What Changed

✅ Updated `prisma/schema.prisma` to use separate pooled and direct URLs
✅ Updated Prisma client configuration for better logging
✅ Created `.env.example` template
✅ Created `DATABASE_FIX.md` with detailed explanation

## How to Get Your Supabase Connection Strings

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Project Settings** → **Database**
4. Copy the **Connection pooling** string (this is for DATABASE_URL with port 6543)
5. Copy the **Direct connection** string (this is for DIRECT_URL with port 5432)

## Expected Result

After redeploying with the new environment variables:
- ✅ No more "max clients reached" errors
- ✅ Buttons will work properly
- ✅ All database queries will function normally
- ✅ Assignment creation dialog will work
- ✅ Item detail pages will load correctly

## Files Modified

1. `prisma/schema.prisma` - Now uses `DIRECT_URL` for migrations
2. `lib/prisma.ts` - Added logging configuration
3. `.env.example` - Template for environment variables
4. `DATABASE_FIX.md` - Detailed documentation
