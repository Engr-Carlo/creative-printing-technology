# 🚀 Quick Setup Guide

Follow these steps to get Creative Printing Technology dashboard up and running!

## Step 1: Install Dependencies ✅

```powershell
cd creative-printing-tech
npm install
```

This will install all required packages (~5 minutes).

---

## Step 2: Set up Supabase (FREE!) 🎯

### 2.1 Create Supabase Account

1. Go to **https://supabase.com**
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email

### 2.2 Create New Project

1. Click **"New Project"**
2. Fill in:
   - **Name**: `Creative Printing Tech` (or any name)
   - **Database Password**: Create a strong password
     - ⚠️ **SAVE THIS PASSWORD!** You'll need it for DATABASE_URL
     - Example: `MySecurePass123!@#`
   - **Region**: Choose closest to you (e.g., `Southeast Asia (Singapore)`)
   - **Pricing Plan**: Free (includes everything we need!)

3. Click **"Create new project"**
4. Wait ~2 minutes for provisioning ☕

### 2.3 Get Database Connection String

1. Once project is ready, click ⚙️ **Settings** (bottom left sidebar)
2. Go to **Database** section
3. Scroll to **Connection string**
4. Select **URI** tab
5. Copy the entire string - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklm.supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with the password you created in step 2.2
7. Save this - you'll paste it into `.env.local` as `DATABASE_URL`

### 2.4 Get API Keys

1. Still in Settings, go to **API** section
2. Copy these values:

   **Project URL:**
   ```
   https://abcdefghijklm.supabase.co
   ```
   → This is your `NEXT_PUBLIC_SUPABASE_URL`

   **anon public key** (long string starting with `eyJ...`):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   **service_role key** (click "Reveal" button, another long string):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   → This is your `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 3: Configure Environment Variables 🔐

1. Open `.env.local` file in VS Code
2. Fill in the values you copied from Supabase:

```env
# Database - Paste from Step 2.3
DATABASE_URL="postgresql://postgres:MySecurePass123!@#@db.abcdefghijklm.supabase.co:5432/postgres"

# NextAuth - Generate this in next step
NEXTAUTH_SECRET="will-generate-below"
NEXTAUTH_URL="http://localhost:3000"

# Supabase - Paste from Step 2.4
NEXT_PUBLIC_SUPABASE_URL="https://abcdefghijklm.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Weather API - Skip for now (optional)
WEATHER_API_KEY=""
WEATHER_CITY="Manila"
```

3. **Generate NEXTAUTH_SECRET:**

   **Option A - Windows PowerShell (if you have OpenSSL):**
   ```powershell
   # Check if OpenSSL is installed
   openssl version
   
   # If yes, generate secret
   openssl rand -base64 32
   ```

   **Option B - Online Generator:**
   - Visit: https://generate-secret.vercel.app/32
   - Copy the generated string
   - Paste as `NEXTAUTH_SECRET`

   **Option C - Simple Random String:**
   ```
   Use any 32+ character random string like:
   NEXTAUTH_SECRET="f8d7g6h5j4k3l2m1n0p9o8i7u6y5t4r3e2w1q0"
   ```

4. Save `.env.local` file (Ctrl+S)

---

## Step 4: Initialize Database 🗄️

Run these commands one by one:

```powershell
# Generate Prisma Client (creates TypeScript types)
npm run db:generate

# Push database schema to Supabase
npm run db:push

# Seed with test data (creates departments, users, sample items)
npm run db:seed
```

You should see:
```
✅ Database seeded successfully!

📧 Test Accounts:
Admin: admin@cpt.com / password123
Line Leader: lineleader@cpt.com / password123
...
```

---

## Step 5: Run the App! 🎉

```powershell
npm run dev
```

Open your browser to: **http://localhost:3000**

You should see the Creative Printing Technology homepage!

---

## 🧪 Test the Dashboard

1. **Visit**: http://localhost:3000
2. Click **"Login"** (or go to http://localhost:3000/login)
3. Use test account:
   - Email: `admin@cpt.com`
   - Password: `password123`
4. You should see the dashboard! 🎊

---

## ✅ Success Checklist

- [ ] npm install completed without errors
- [ ] Supabase project created
- [ ] All 5 environment variables filled in `.env.local`
- [ ] `npm run db:generate` ran successfully
- [ ] `npm run db:push` completed (created tables in Supabase)
- [ ] `npm run db:seed` showed "✅ Database seeded successfully!"
- [ ] `npm run dev` started server
- [ ] Can access http://localhost:3000
- [ ] Can login with admin@cpt.com / password123

---

## 🆘 Troubleshooting

### Error: "Environment variable not found: DATABASE_URL"
→ Make sure `.env.local` exists and has `DATABASE_URL` filled in

### Error: "Can't reach database server"
→ Check your Supabase project is active (green status in supabase.com)
→ Verify DATABASE_URL has correct password

### Error: "npm run db:push" fails
→ Delete `prisma\migrations` folder if it exists
→ Try `npm run db:push -- --force-reset`

### Can't login / "Invalid credentials"
→ Make sure `npm run db:seed` completed successfully
→ Check email is exact: `admin@cpt.com` (no spaces)

### Port 3000 already in use
→ Stop other dev servers
→ Or run: `npm run dev -- -p 3001` (use port 3001)

---

## 🎯 Next Steps

Once everything is running:

1. **Explore the Dashboard**
   - Try different user roles (admin, line leader, encoder)
   - Create new items
   - Update process status
   - Add notes

2. **Customize**
   - Add your company logo to `public/` folder
   - Modify colors in Tailwind config
   - Add real company information

3. **Set up Weather API** (optional)
   - Go to https://openweathermap.org/api
   - Sign up for free API key
   - Add to `WEATHER_API_KEY` in `.env.local`

4. **Invite your team**
   - Create accounts via Admin dashboard
   - Assign departments and roles

---

## 📞 Need Help?

If you get stuck:
1. Check the main [README.md](./README.md)
2. Review error messages carefully
3. Verify all environment variables are set correctly
4. Make sure Supabase project status is "Active" (check supabase.com)

Happy coding! 🚀
