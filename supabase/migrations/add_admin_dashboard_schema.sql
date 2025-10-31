-- Migration: Add Admin Dashboard Schema
-- Description: Adds tables and columns needed for admin dashboard functionality

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add is_active column to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_actions_log table for audit trail
CREATE TABLE IF NOT EXISTS admin_actions_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'enable_service', 'disable_service', 'login'
  restaurant_id UUID REFERENCES restaurants(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  details JSONB
);

-- Create indexes for admin_actions_log
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_timestamp ON admin_actions_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_restaurant ON admin_actions_log(restaurant_id);

-- Insert initial admin user
-- Email: sayanbanik66@gmail.com
-- Password: 8119811655
INSERT INTO admin_users (email, password_hash)
VALUES ('sayanbanik66@gmail.com', crypt('8119811655', gen_salt('bf')))
ON CONFLICT (email) DO NOTHING;

-- Create RPC function for password verification
CREATE OR REPLACE FUNCTION verify_admin_password(p_email TEXT, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_password_hash TEXT;
BEGIN
  SELECT password_hash INTO v_password_hash
  FROM admin_users
  WHERE email = p_email;
  
  IF v_password_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN v_password_hash = crypt(p_password, v_password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to toggle restaurant status (admin only)
CREATE OR REPLACE FUNCTION toggle_restaurant_status(
  p_restaurant_id UUID,
  p_is_active BOOLEAN,
  p_admin_email TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update restaurant status
  UPDATE restaurants
  SET is_active = p_is_active,
      updated_at = NOW()
  WHERE id = p_restaurant_id;
  
  -- Log the action
  INSERT INTO admin_actions_log (admin_email, action_type, restaurant_id, details)
  VALUES (
    p_admin_email,
    CASE WHEN p_is_active THEN 'enable_service' ELSE 'disable_service' END,
    p_restaurant_id,
    jsonb_build_object('new_status', p_is_active)
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
