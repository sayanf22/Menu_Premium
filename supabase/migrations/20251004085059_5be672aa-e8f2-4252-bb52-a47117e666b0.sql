-- Drop the existing policy that's not working for anonymous users
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Create a new policy that explicitly allows anonymous users to insert orders
CREATE POLICY "Anonymous users can create orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Also allow authenticated users to create orders (for future flexibility)
CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (true);