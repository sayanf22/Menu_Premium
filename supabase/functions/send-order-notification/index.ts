import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ONESIGNAL_APP_ID = "30e2fbc2-8319-4e46-9cb3-2e9c24b2201c";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter for Edge Functions
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (entry.count >= maxRequests) {
    return true;
  }
  
  entry.count++;
  return false;
}

// Validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { record } = await req.json();

    // Validate input
    if (!record || !record.restaurant_id || !record.order_number) {
      console.log("Invalid order data received");
      return new Response(JSON.stringify({ success: false, error: "Invalid order data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate restaurant_id is a valid UUID
    if (!isValidUUID(record.restaurant_id)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid restaurant ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: max 30 notifications per restaurant per minute
    const rateLimitKey = `notification_${record.restaurant_id}`;
    if (isRateLimited(rateLimitKey, 30, 60 * 1000)) {
      console.log("Rate limit exceeded for restaurant:", record.restaurant_id);
      return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded" }), {
        status: 429,
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

    // Calculate order total with validation
    let orderTotal = 0;
    if (record.items?.items && Array.isArray(record.items.items)) {
      orderTotal = record.items.items.reduce(
        (sum: number, item: any) => {
          const price = parseFloat(item.price) || 0;
          const quantity = parseInt(item.quantity) || 1;
          // Sanity check: max price 100000, max quantity 99
          if (price > 0 && price < 100000 && quantity > 0 && quantity < 100) {
            return sum + (price * quantity);
          }
          return sum;
        },
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

    // Sanitize order number for display (alphanumeric only)
    const safeOrderNumber = String(record.order_number).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
    const safeTableNumber = String(record.table_number || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10);

    // Send OneSignal notification to restaurant owner using tags
    const notification = {
      app_id: ONESIGNAL_APP_ID,
      filters: [
        { field: "tag", key: "restaurant_id", relation: "=", value: record.restaurant_id },
      ],
      headings: { en: "🔔 New Order Received!" },
      contents: {
        en: `Order #${safeOrderNumber} • Table ${safeTableNumber} • ₹${orderTotal.toFixed(0)}`,
      },
      data: {
        order_id: record.id,
        restaurant_id: record.restaurant_id,
        order_number: safeOrderNumber,
        table_number: safeTableNumber,
        type: "new_order",
      },
      priority: 10,
      ttl: 3600,
    };

    console.log("Sending notification for order:", safeOrderNumber);

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
      console.log("Notification sent successfully for order:", safeOrderNumber);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
