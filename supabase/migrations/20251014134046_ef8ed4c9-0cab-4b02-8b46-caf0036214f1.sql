-- Add description column to restaurants table
ALTER TABLE public.restaurants
ADD COLUMN description text;

-- Update RLS policy to allow restaurants to update their description
-- (The existing update policy already covers this)