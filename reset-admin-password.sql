-- Reset Admin Password Script
-- This will update the password for your admin account

-- IMPORTANT: Replace 'your-new-password' with your desired password
-- The password will be automatically hashed using bcrypt

-- Option 1: Update existing admin password
UPDATE admin_users 
SET password_hash = crypt('your-new-password', gen_salt('bf'))
WHERE email = 'sayanbanik66@gmail.com';

-- Option 2: Create a new admin user (if needed)
-- Uncomment the lines below and replace with your details
/*
INSERT INTO admin_users (email, password_hash)
VALUES (
  'admin@example.com',
  crypt('your-password-here', gen_salt('bf'))
);
*/

-- Verify the admin user exists
SELECT id, email, created_at 
FROM admin_users 
WHERE email = 'sayanbanik66@gmail.com';

-- Test the password (returns true if correct)
-- Replace 'your-new-password' with the password you set above
SELECT verify_admin_password('sayanbanik66@gmail.com', 'your-new-password');
