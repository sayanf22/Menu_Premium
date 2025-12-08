import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify this is called by cron or admin (check for secret header)
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    
    // Allow service role or cron secret
    if (!authHeader?.includes("service_role") && authHeader !== `Bearer ${cronSecret}`) {
      // Check if it's an admin making the request
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader || "" } },
      });
      
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Use service role for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find expired subscriptions
    const { data: expiredSubs, error: fetchError } = await supabase
      .from("user_subscriptions")
      .select(`
        id,
        user_id,
        status,
        current_period_end,
        restaurants!inner(id, name, email)
      `)
      .eq("status", "active")
      .not("current_period_end", "is", null)
      .lt("current_period_end", new Date().toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    const results = {
      checked_at: new Date().toISOString(),
      total_expired: expiredSubs?.length || 0,
      updated: [] as string[],
      errors: [] as string[],
    };

    // Update each expired subscription
    for (const sub of expiredSubs || []) {
      try {
        // Update subscription status
        const { error: updateError } = await supabase
          .from("user_subscriptions")
          .update({ 
            status: "expired",
            updated_at: new Date().toISOString()
          })
          .eq("id", sub.id);

        if (updateError) {
          results.errors.push(`Failed to update ${sub.id}: ${updateError.message}`);
          continue;
        }

        // Log the action
        await supabase.from("admin_actions_log").insert({
          admin_email: "system@addmenu.site",
          action_type: "subscription_expired_auto",
          restaurant_id: sub.restaurants?.id,
          details: {
            subscription_id: sub.id,
            user_id: sub.user_id,
            expired_at: sub.current_period_end,
            restaurant_name: sub.restaurants?.name,
            checked_at: new Date().toISOString(),
          },
        });

        results.updated.push(sub.id);
      } catch (err) {
        results.errors.push(`Error processing ${sub.id}: ${err.message}`);
      }
    }

    console.log("Subscription check completed:", results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Check subscriptions error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
