-- Create a trigger to send push notifications when new orders are created

CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the Edge Function via pg_net (Supabase's HTTP extension)
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-order-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS on_order_created ON public.orders;
CREATE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_order();
