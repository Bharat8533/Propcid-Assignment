-- PostgreSQL Database Schema for EstateDesk
-- Builder & Broker Registration Platform

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Staff Table
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('agent', 'admin'))
);

-- Seed Staff Data
INSERT INTO staff (name, email, password_hash, role) VALUES
  ('Asha Admin', 'admin@test.com', crypt('Admin@123', gen_salt('bf', 10)), 'admin'),
  ('Vikram Agent','vikram@test.com', crypt('Agent@123', gen_salt('bf', 10)), 'agent'),
  ('Meera Agent', 'meera@test.com', crypt('Agent@123', gen_salt('bf', 10)), 'agent')
ON CONFLICT (email) DO NOTHING;

-- 2. Registrations Table
CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL REFERENCES staff(id),
  user_type TEXT NOT NULL CHECK (user_type IN ('builder', 'broker')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  completion INTEGER NOT NULL DEFAULT 0,

  -- Common Fields (12)
  full_name TEXT,
  email TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  mobile TEXT,
  mobile_verified BOOLEAN NOT NULL DEFAULT FALSE,
  gender TEXT CHECK (gender IS NULL OR gender IN ('Male', 'Female', 'Other')),
  dob DATE,
  office_address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  experience_years INTEGER,
  languages TEXT[],
  areas_of_expertise TEXT[],

  -- Broker Specific (2)
  pan_number TEXT,
  about TEXT,

  -- Builder Specific (5)
  company_name TEXT,
  company_type TEXT,
  gst_number TEXT,
  about_company TEXT,

  -- Audit & Soft Delete (R10)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by INTEGER REFERENCES staff(id),
  delete_reason TEXT
);

-- Rule R5: Unique active mobile and email indexes (omitting soft-deleted records)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_mobile_active 
  ON registrations (mobile) 
  WHERE deleted_at IS NULL AND mobile IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_email_active 
  ON registrations (lower(email)) 
  WHERE deleted_at IS NULL AND email IS NOT NULL;

-- Query performance indexes
CREATE INDEX IF NOT EXISTS idx_registrations_agent_id ON registrations (agent_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations (status);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations (created_at);
CREATE INDEX IF NOT EXISTS idx_registrations_updated_at ON registrations (updated_at);

-- 3. OTPs Table (Rule R3)
CREATE TABLE IF NOT EXISTS otps (
  id SERIAL PRIMARY KEY,
  registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'mobile')),
  target_value TEXT NOT NULL,
  code TEXT NOT NULL, -- Dummy '123456'
  attempts_left INTEGER NOT NULL DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL,
  resend_after TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_otps_reg_channel 
  ON otps (registration_id, channel);
