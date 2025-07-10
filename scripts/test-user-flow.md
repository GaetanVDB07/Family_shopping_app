# User Flow Test Checklist

## After Database Reset - User Flow Testing

### 1. Login Flow Test
- [ ] Navigate to https://family-shopping-app-eta.vercel.app
- [ ] Should see login form (not authenticated)
- [ ] Try to login with existing credentials
- [ ] Should be redirected to family setup page (no family)

### 2. Family Setup Test
- [ ] Should see family setup page with two tabs: "Create Family" and "Join Family"
- [ ] Test creating a new family:
  - [ ] Enter family name
  - [ ] Click "Create Family"
  - [ ] Should succeed and redirect to grocery list
- [ ] Test joining a family:
  - [ ] Use family code from another user
  - [ ] Click "Join Family"
  - [ ] Should succeed and redirect to grocery list

### 3. Grocery List Test
- [ ] Should see grocery list page
- [ ] Should see user menu with logout option
- [ ] Try adding a grocery item:
  - [ ] Enter item name
  - [ ] Click "Add Item"
  - [ ] Item should appear in list
- [ ] Test real-time updates:
  - [ ] Open app in another tab/browser
  - [ ] Add item in one tab
  - [ ] Should see item appear in other tab automatically

### 4. Real-time Updates Test
- [ ] Open app in multiple browser tabs
- [ ] Add item in one tab
- [ ] Item should appear in other tabs
- [ ] Toggle item completion in one tab
- [ ] Status should update in other tabs
- [ ] Delete item in one tab
- [ ] Item should disappear from other tabs

### 5. Logout Test
- [ ] Click user menu
- [ ] Click "Logout"
- [ ] Should be redirected to login page
- [ ] User should be signed out of Supabase

### 6. Re-login Test
- [ ] Login again with same credentials
- [ ] Should be redirected to grocery list (user still has family)
- [ ] Should see existing grocery items

## API Endpoints Status
- [x] /api/ping - Working
- [x] /api/test - Working
- [x] /api/user/family - Working (returns {"family":null} after reset)
- [ ] /api/families (POST) - To be tested
- [ ] /api/grocery-items (GET/POST/PUT/DELETE) - To be tested

## Database Status
- [x] Database reset successfully
- [x] All tables are empty
- [x] Users table exists but is empty
- [x] Families table exists but is empty
- [x] Grocery items table exists but is empty
- [x] Real-time is enabled on all tables

## Notes
- After DB reset, existing Supabase users will need to create/join families again
- This is expected behavior - users exist in Supabase Auth but not in our app database
- The app correctly handles this by showing family setup page
