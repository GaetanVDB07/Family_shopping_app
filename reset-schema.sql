-- Drop existing tables and recreate with new schema
DROP TABLE IF EXISTS grocery_items CASCADE;
DROP TABLE IF EXISTS family_members CASCADE;
DROP TABLE IF EXISTS families CASCADE;

-- Create families table
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL
);

-- Create family_members table  
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT,
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    role TEXT NOT NULL DEFAULT 'member',
    UNIQUE (family_id, user_id)
);

-- Create grocery_items table with new schema
CREATE TABLE grocery_items (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    added_by UUID NOT NULL,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
