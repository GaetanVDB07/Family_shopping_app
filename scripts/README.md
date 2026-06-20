# Scripts Directory

This directory contains utility scripts for database management, testing, and debugging.

## Database Management Scripts

- `setup-databases.sh` - Sets up development and production databases with proper schema
- `clean-items.mjs` - Removes duplicate grocery items from the database
- `cleanup-duplicates.mjs` - Advanced duplicate cleanup with detailed logging

## Testing Scripts

- `test-connection.mjs` - Tests basic database connection
- `test-db-connection.mjs` - Tests database connection with environment loading
- `test-query.mjs` - Tests specific database queries for debugging
- `test-get-items.mjs` - Tests the getAllGroceryItems function
- `test-family-setup-flow.mjs` - Integration test for family create/join API

### Auth email safety (`test-family-setup-flow.mjs`)

Against **hosted** Supabase, this script requires `SUPABASE_SERVICE_ROLE_KEY` so it can create users with `email_confirm: true` without sending confirmation emails. Without it, the script exits immediately to avoid bounces from `signUp()` on fake addresses.

For auth testing without the service role, use **local Supabase** (`npx supabase start`); auth emails are captured in Mailpit, not sent to the internet.

## Debugging Scripts

- `check-current-db.mjs` - Shows current database state and configuration
- `check-db-state.mjs` - Checks database schema and table states
- `check-dev-db.mjs` - Specifically checks development database
- `check-family-members.mjs` - Inspects family_members table structure
- `quick-fix.mjs` - Quick database fixes and patches

## Usage

Most scripts can be run directly:

```bash
node scripts/script-name.mjs
```

Some scripts may require environment variables to be set. Check individual scripts for specific requirements.

## Note

These scripts were created during debugging and development. They are not part of the main application but are kept for maintenance and troubleshooting purposes.
