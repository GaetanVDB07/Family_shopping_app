#!/bin/bash

# Database Setup Helper Script
# This script helps you set up your development and production databases

echo "🗄️  Family Shopping App - Database Setup Guide"
echo "=============================================="
echo ""

echo "📋 STEP 1: Create Supabase Projects"
echo "-----------------------------------"
echo "1. Go to https://supabase.com/dashboard"
echo "2. Create TWO new projects:"
echo "   - family-shopping-dev (for development)"
echo "   - family-shopping-prod (for production)"
echo "3. Use the SAME region for both projects"
echo ""

echo "📋 STEP 2: Get Your Database Credentials"
echo "---------------------------------------"
echo "For EACH project, go to Settings > Database and copy:"
echo "   - Connection string (Transaction pooler)"
echo "   - Project URL (from Settings > API)"
echo "   - Anon key (from Settings > API)"
echo ""

echo "📋 STEP 3: Update Environment Files"
echo "----------------------------------"
echo "Edit these files with your new credentials:"
echo "   📄 .env.development (for dev database)"
echo "   📄 .env.production (for prod database)"
echo ""

echo "🔧 STEP 4: Setup Database Schema"
echo "-------------------------------"
echo "Run these commands to set up your database tables:"
echo ""
echo "For DEVELOPMENT:"
echo "  ./setup-env.sh dev"
echo "  npm run db:push:dev"
echo ""
echo "For PRODUCTION:"
echo "  ./setup-env.sh prod"
echo "  npm run db:push:prod"
echo ""

echo "✅ STEP 5: Test Your Setup"
echo "-------------------------"
echo "Development: ./setup-env.sh dev && npm run dev"
echo "Production:  ./setup-env.sh prod && npm run build && npm start"
echo ""

echo "💡 TIP: Your current database will become your PRODUCTION database"
echo "💡 TIP: Keep your current .env as backup until everything works"
echo ""

read -p "Press Enter to continue..."
