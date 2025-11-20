-- Quick script to create your first signup code
-- Run this in Supabase SQL Editor or use the Admin Dashboard

-- Create a simple signup code
INSERT INTO public.signup_codes (code, description, max_uses, expires_at)
VALUES (
  'WELCOME2024',
  'Initial signup code for testing',
  10,
  NOW() + INTERVAL '30 days'
);

-- Or create multiple codes at once
INSERT INTO public.signup_codes (code, description, max_uses, expires_at)
VALUES 
  ('PARTNER001', 'Partner program - Batch 1', 1, NOW() + INTERVAL '90 days'),
  ('PARTNER002', 'Partner program - Batch 1', 1, NOW() + INTERVAL '90 days'),
  ('PARTNER003', 'Partner program - Batch 1', 1, NOW() + INTERVAL '90 days'),
  ('LAUNCH100', 'Launch campaign - First 100', 100, NOW() + INTERVAL '60 days'),
  ('UNLIMITED', 'Unlimited code for testing', 999999, NULL);

-- Verify codes were created
SELECT 
  code,
  description,
  max_uses,
  current_uses,
  expires_at,
  CASE 
    WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 'Expired'
    WHEN current_uses >= max_uses THEN 'Exhausted'
    ELSE 'Active'
  END as status
FROM public.signup_codes
ORDER BY created_at DESC;
