import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ONESIGNAL_APP_ID = "30e2fbc2-8319-4e46-9cb3-2e9c24b2201c";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();

    if (!record || !record.restaurant_id) {
      throw new Error("Invalid order data");
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
      throw new Error("Restaurant not found");
    }

    const restaurantName = restaurant.name || "Restaurant";

    // Calculate order total
    let orderTotal = 0;
    if (record.items?.items) {
      orderTotal = record.items.items.reduce(
        (sum: number, item: any) => sum + (item.price * (item.quantity || 1)),
        0
      );
    }

    // Send OneSignal notification to restaurant owner using tags
    // The restaurant owner's device is tagged with restaurant_id when they log in
    const notification = {
      app_id: ONESIGNAL_APP_ID,
      // Target only devices tagged with this restaurant_id
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
      // Chrome/Firefox specific settings
      chrome_web_icon: "https://your-domain.com/icon-192.png",
      chrome_web_badge: "https://your-domain.com/badge-72.png",
      // iOS specific
      ios_sound: "notification.wav",
      // Android specific
      android_sound: "notification",
      android_channel_id: "orders",
      // Priority settings
      priority: 10,
      ttl: 3600, // 1 hour TTL
      // Action buttons - URL should point to your app domain
      // Note: Replace with your actual app URL in production
      web_buttons: [
        {
          id: "view_order",
          text: "View Order",
          url: `${Deno.env.get("APP_URL") || "https://your-app-domain.com"}/dashboard#orders`,
        },
      ],
    };

    console.log("Sending notification:", JSON.stringify(notification, null, 2));

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    const result = await response.json();
    console.log("OneSignal response:", JSON.stringify(result, null, 2));

    if (result.errors) {
      console.error("OneSignal errors:", result.errors);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
