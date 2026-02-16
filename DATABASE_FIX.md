# Database Connection Pool Fix

## Problem
`MaxClientsInSessionMode: max clients reached` - This error occurs because Supabase Session mode has a low connection limit (5-15 connections), and serverless functions on Vercel create many concurrent connections.

## Solution
Use Supabase's connection pooler with Transaction mode for better connection management.

## Setup Instructions

### 1. Get Your Supabase Connection Strings

Go to your Supabase project settings > Database > Connection string

You'll need TWO connection strings:
- **Pooler (Transaction mode)** - for application queries
- **Direct connection** - for migrations

### 2. Configure Environment Variables

#### For Local Development (.env file)

```env
# Pooler connection (Transaction mode) - for application queries
# Replace with your actual Supabase pooler URL
# Port 6543 with pgbouncer=true parameter
DATABASE_URL="postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct connection - for migrations
# Port 5432 (or 6543 without pgbouncer)
DIRECT_URL="postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

#### For Vercel Production

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add these two variables:

**DATABASE_URL**
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**DIRECT_URL**
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

### 3. Important Notes

- **Port 6543** with `pgbouncer=true` = Transaction pooling mode (use for DATABASE_URL)
- **Port 5432** or **6543 without pgbouncer** = Direct connection (use for DIRECT_URL)
- `connection_limit=1` prevents each serverless function from holding multiple connections
- The pooler URL should be the same base URL, just different ports and parameters

### 4. How to Find Your Supabase Pooler URL

1. Log in to Supabase Dashboard
2. Select your project
3. Go to **Project Settings** → **Database**
4. Under **Connection string**, you'll see:
   - **Connection pooling** - Use this for DATABASE_URL (with port 6543)
   - **Direct connection** - Use this for DIRECT_URL (with port 5432)

### 5. After Configuration

1. Update environment variables in Vercel
2. Redeploy your application
3. Run `npx prisma generate` locally after updating .env

### 6. Verify the Fix

After deploying, the error `MaxClientsInSessionMode: max clients reached` should disappear. Your application will use the connection pooler which can handle many more concurrent connections.

## Why This Works

- **Session mode**: Limited to ~5-15 connections (default Supabase direct connection)
- **Transaction mode**: Can handle 200+ concurrent connections via pgBouncer
- Serverless functions need many short-lived connections, perfect for transaction pooling
