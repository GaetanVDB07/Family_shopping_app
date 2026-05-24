# Database Setup Quick Reference

## 🎯 Goal
Set up separate development and production databases so you can:
- Safely test changes without affecting live users
- Have clean data separation
- Deploy with confidence

## 📊 Current Status
- **Current Database**: Your existing Supabase project (will become PRODUCTION)
- **Need to Create**: New development Supabase project

## 🚀 Quick Setup Steps

### 1. Create Development Database
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name: `family-shopping-dev`
4. Region: `Europe West (Ireland)` (same as your current one)
5. Password: Use a strong password
6. Wait for project creation (~2 minutes)

### 2. Get Development Credentials
1. In your new dev project, go to **Settings > Database**
2. Copy the **Connection string** (Transaction pooler - IPv4)
3. Go to **Settings > API** 
4. Copy the **Project URL** and **anon public** key

### 3. Update .env.development
Replace these placeholders in `.env.development`:
```bash
# Replace YOUR_DEV_PROJECT_REF with your project reference (like abcdefghijklmnop)
# Replace YOUR_DEV_PASSWORD with your project password  
# Replace YOUR_DEV_ANON_KEY_HERE with your anon key
```

### 4. Setup Production Environment
1. Copy your current values from `.env` to `.env.production`
2. This makes your current database the production one

### 5. Initialize Database Schemas
```bash
# Setup development database
./setup-env.sh dev
npm run db:push:dev

# Setup production database (if needed)
./setup-env.sh prod  
npm run db:push:prod
```

### 6. Test Both Environments
```bash
# Test development
./setup-env.sh dev
npm run dev

# Test production build
./setup-env.sh prod
npm run build
npm start
```

## 🔄 Daily Workflow After Setup

### Development Work
```bash
./setup-env.sh dev
npm run dev
# Make changes, test with dev database
```

### Deploy to Production
```bash
git add .
git commit -m "Your changes"
git push origin main
# Your deployment platform will use .env.production automatically
```

## 🆘 If Something Goes Wrong
- Keep your current `.env` file as backup
- You can always switch back: `cp .env.backup .env`
- Each database is independent - one can't break the other

## 📞 Need Help?
Run: `./setup-databases.sh` for the interactive guide
