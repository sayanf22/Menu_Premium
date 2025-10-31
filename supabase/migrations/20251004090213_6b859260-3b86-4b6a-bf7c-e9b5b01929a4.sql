-- RPC to create orders as anon (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_order(
  p_restaurant_id uuid,
  p_table_number text,
  p_items jsonb,
  p_order_number text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.orders (restaurant_id, table_number, items, order_number, status)
  VALUES (p_restaurant_id, p_table_number, p_items, p_order_number, 'pending')
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order(uuid, text, jsonb, text) TO anon, authenticated;