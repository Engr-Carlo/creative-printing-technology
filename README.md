# Creative Printing Technology - Production Monitoring Dashboard

A comprehensive web application featuring a public company website with an integrated real-time production monitoring dashboard for Creative Printing Technology Philippines Inc.

## 🚀 Features

### Public Website
- Professional company information
- Services showcase
- Contact information
- Responsive design with brand colors (Orange & White)

### Production Dashboard
- **Real-time Updates**: Live synchronization across all users using Supabase Realtime
- **Role-Based Access Control**: 
  - Admin: Full system access, analytics, user management
  - Line Leader/Employee: Monitor and update production status
  - Encoder: Data entry for production items
- **Department Management**: Track Cardboard, Manual, Label, Bookbind, and Other Items
- **Process Monitoring**: Configurable process tracking (P1-P9) with status updates
- **Machine Management**: Track machine assignments and availability
- **Analytics Dashboard**: 
  - On-time completion rate
  - Process bottleneck identification
  - Machine utilization
  - Employee productivity
  - Daily production trends
  - Delay reason tracking
- **Notes & Comments**: Collaborative communication on items
- **Weather Widget**: Integrated weather information for production planning

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Real-time**: Supabase Realtime
- **Authentication**: NextAuth v5
- **UI Components**: Tailwind CSS + shadcn/ui + Radix UI
- **Charts**: Recharts
- **State Management**: Zustand + TanStack React Query
- **Form Validation**: React Hook Form + Zod
- **Date Handling**: date-fns

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works great!)

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project:
   - Choose a project name (e.g., "Creative Printing Tech")
   - Set a strong database password (save this!)
   - Select a region close to you (e.g., Southeast Asia)
   - Wait for the project to be provisioned (~2 minutes)

3. Get your credentials:
   - Go to **Project Settings** (gear icon) → **Database**
   - Copy the **Connection String** (URI mode)
   - Replace `[YOUR-PASSWORD]` with your database password
   
   - Go to **Project Settings** → **API**
   - Copy **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - Copy **anon public** key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Copy **service_role** key (`SUPABASE_SERVICE_ROLE_KEY`)

### 3. Configure Environment Variables

Fill in the values in `.env.local`:

```env
# Database - From Supabase Database Settings
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# NextAuth - Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Supabase - From Supabase API Settings
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Weather API (optional) - Get from openweathermap.org
WEATHER_API_KEY="your-api-key"
WEATHER_CITY="Manila"
```

### 4. Initialize Database

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to Supabase database
npm run db:push

# Seed database with sample data
npm run db:seed
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 👤 Test Accounts

After seeding, use these credentials to login:

| Role | Email | Password | Department |
|------|-------|----------|------------|
| **Admin** | admin@cpt.com | password123 | All |
| **Line Leader** | lineleader@cpt.com | password123 | Cardboard |
| **Encoder** | encoder@cpt.com | password123 | Cardboard |
| **Employee** | employee1@cpt.com | password123 | Manual |
| **Employee** | employee2@cpt.com | password123 | Label |

## 📝 Development Scripts

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema changes to database
npm run db:migrate   # Create and run migrations
npm run db:seed      # Seed database with sample data
npm run db:studio    # Open Prisma Studio
```

## 🐛 Troubleshooting

### Database Connection Issues
- Verify Supabase project is active
- Check DATABASE_URL has correct password
- Ensure IP is not blocked (Supabase allows all by default)

### Real-time Not Working
- Verify NEXT_PUBLIC_SUPABASE_URL and keys are correct
- Check browser console for WebSocket errors
- Ensure Supabase project has Realtime enabled (default)

## 📜 License

Proprietary - Creative Printing Technology Philippines Inc.
