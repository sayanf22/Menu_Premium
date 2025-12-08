import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CustomerMenu from "./CustomerMenu";
import CustomerMenuViewOnly from "./CustomerMenuViewOnly";
import { Utensils } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Smart router that checks the restaurant's subscription plan
 * and renders the appropriate menu component:
 * - Full Service plan: CustomerMenu (with ordering)
 * - Menu Only plan: CustomerMenuViewOnly (view only, no cart)
 */
const CustomerMenuRouter = () => {
  const { restaurantId } = useParams();
  const [searchParams] = useSearchParams();
  const [hasOrdersFeature, setHasOrdersFeature] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!restaurantId) {
        setError("Invalid restaurant");
        setIsLoading(false);
        return;
      }

      try {
        // Get restaurant's subscription plan
        const { data: restaurant, error: restaurantError } = await supabase
          .from("restaurants")
          .select(`
            id,
            subscription_plan_id,
            subscription_plans:subscription_plan_id (
              has_orders_feature
            )
          `)
          .eq("id", restaurantId)
          .maybeSingle();

        if (restaurantError) {
          console.error("Error fetching restaurant:", restaurantError);
          // Default to view-only if error
          setHasOrdersFeature(false);
        } else if (restaurant) {
          // Check if restaurant has a subscription plan with orders feature
          const plan = restaurant.subscription_plans as any;
          setHasOrdersFeature(plan?.has_orders_feature ?? false);
        } else {
          // Restaurant not found - show view-only
          setHasOrdersFeature(false);
        }
      } catch (err) {
        console.error("Error checking subscription:", err);
        // Default to view-only on error
        setHasOrdersFeature(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [restaurantId]);

  // Loading state with minimal splash
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-red-500 via-orange-500 to-amber-500">
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center"
          >
            <Utensils className="w-14 h-14 text-white" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 120 }}
            className="h-1 bg-white/30 rounded-full mx-auto overflow-hidden"
          >
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-1/2 bg-white rounded-full"
            />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Render appropriate menu based on subscription
  if (hasOrdersFeature) {
    return <CustomerMenu />;
  }

  return <CustomerMenuViewOnly />;
};

export default CustomerMenuRouter;
