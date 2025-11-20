import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ONESIGNAL_APP_ID = "30e2fbc2-8319-4e46-9cb3-2e9c24b2201c"
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')

serve(async (req) => {
  try {
    const { record } = await req.json()
    
    // Get restaurant name
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const restaurantRes = await fetch(
      `${supabaseUrl}/rest/v1/restaurants?id=eq.${record.restaurant_id}&select=name`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    )
    
    const restaurants = await restaurantRes.json()
    const restaurantName = restaurants[0]?.name || 'Restaurant'
    
    // Send OneSignal notification
    const notification = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"],
      headings: { en: "New Order!" },
      contents: { 
        en: `Order #${record.order_number} from Table ${record.table_number} at ${restaurantName}` 
      },
      data: {
        order_id: record.id,
        restaurant_id: record.restaurant_id,
        order_number: record.order_number
      }
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(notification)
    })

    const result = await response.json()
    
    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
