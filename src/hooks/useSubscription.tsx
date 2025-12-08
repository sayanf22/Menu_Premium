import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  has_orders_feature: boolean;
  max_menu_items: number;
  max_categories: number;
}

interface UserSubscription {
  has_subscription: boolean;
  subscription_status: string | null;
  plan_name: string | null;
  plan_slug: string | null;
  has_orders_feature: boolean;
  current_period_end: string | null;
  is_active: boolean;
}

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  plans: SubscriptionPlan[];
  loading: boolean;
  hasOrdersFeature: boolean;
  isMenuOnlyPlan: boolean;
  refreshSubscription: () => Promise<void>;
}

const defaultSubscription: UserSubscription = {
  has_subscription: false,
  subscription_status: null,
  plan_name: null,
  plan_slug: null,
  has_orders_feature: false,
  current_period_end: null,
  is_active: false,
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  plans: [],
  loading: true,
  hasOrdersFeature: false,
  isMenuOnlyPlan: true,
  refreshSubscription: async () => {},
});

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("price_monthly", { ascending: true });
    
    if (data) {
      setPlans(data.map(p => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || "[]"),
      })));
    }
  };

  const fetchSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubscription(defaultSubscription);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.rpc("get_user_subscription_status", {
      p_user_id: user.id,
    });

    if (error || !data || data.length === 0) {
      setSubscription(defaultSubscription);
    } else {
      setSubscription(data[0] as UserSubscription);
    }
    setLoading(false);
  };

  const refreshSubscription = async () => {
    setLoading(true);
    await fetchSubscription();
  };

  useEffect(() => {
    fetchPlans();
    fetchSubscription();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(() => {
      fetchSubscription();
    });

    return () => {
      authSub.unsubscribe();
    };
  }, []);

  const hasOrdersFeature = subscription?.has_orders_feature ?? false;
  const isMenuOnlyPlan = subscription?.plan_slug === "menu-only" || !subscription?.has_orders_feature;

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plans,
        loading,
        hasOrdersFeature,
        isMenuOnlyPlan,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);

export default useSubscription;
