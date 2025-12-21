import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ONESIGNAL_APP_ID = "30e2fbc2-8319-4e46-9cb3-2e9c24b2201c";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();

    if (!record || !record.restaurant_id) {
      console.log("Invalid order data received");
      return new Response(JSON.stringify({ success: false, error: "Invalid order data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get restaurant details
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const restaurantRes = await fetch(
      `${supabaseUrl}/rest/v1/restaurants?id=eq.${record.restaurant_id}&select=name,user_id`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    const restaurants = await restaurantRes.json();
    const restaurant = restaurants[0];

    if (!restaurant) {
      console.log("Restaurant not found:", record.restaurant_id);
      return new Response(JSON.stringify({ success: false, error: "Restaurant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate order total
    let orderTotal = 0;
    if (record.items?.items) {
      orderTotal = record.items.items.reduce(
        (sum: number, item: any) => sum + (item.price * (item.quantity || 1)),
        0
      );
    }

    // Check if OneSignal API key is configured
    if (!ONESIGNAL_REST_API_KEY) {
      console.log("OneSignal API key not configured - skipping push notification");
      return new Response(JSON.stringify({ success: true, message: "Notification skipped - no API key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send OneSignal notification to restaurant owner using tags
    const notification = {
      app_id: ONESIGNAL_APP_ID,
      filters: [
        { field: "tag", key: "restaurant_id", relation: "=", value: record.restaurant_id },
      ],
      headings: { en: "🔔 New Order Received!" },
      contents: {
        en: `Order #${record.order_number} • Table ${record.table_number} • ₹${orderTotal.toFixed(0)}`,
      },
      data: {
        order_id: record.id,
        restaurant_id: record.restaurant_id,
        order_number: record.order_number,
        table_number: record.table_number,
        type: "new_order",
      },
      priority: 10,
      ttl: 3600,
    };

    console.log("Sending notification for order:", record.order_number);

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error("OneSignal errors:", result.errors);
    } else {
      console.log("Notification sent successfully for order:", record.order_number);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
