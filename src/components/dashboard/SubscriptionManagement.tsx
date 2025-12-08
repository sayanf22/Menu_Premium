import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { 
  createSubscription, 
  verifyPayment, 
  openRazorpayCheckout 
} from "@/lib/razorpay";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar, Clock, CreditCard, Check, Star, ArrowRight, Loader2, AlertCircle
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";

const SubscriptionManagement = () => {
  const { subscription, plans, refreshSubscription } = useSubscription();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const currentPlan = plans.find(p => p.slug === subscription?.plan_slug);
  const isExpired = subscription?.current_period_end && isPast(new Date(subscription.current_period_end));
  const daysRemaining = subscription?.current_period_end 
    ? differenceInDays(new Date(subscription.current_period_end), new Date())
    : null;

  const handleUpgrade = async (planId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Please sign in", variant: "destructive" });
      return;
    }

    setLoading(true);
    setSelectedPlanId(planId);

    try {
      const { subscriptionId, razorpayKeyId, error } = await createSubscription(planId, "monthly");
      if (error || !subscriptionId) throw new Error(error || "Failed to create subscription");
      if (!razorpayKeyId) throw new Error("Payment gateway not configured");

      await openRazorpayCheckout({
        key: razorpayKeyId,
        subscription_id: subscriptionId,
        name: "AddMenu",
        description: `Upgrade to ${plans.find(p => p.id === planId)?.name}`,
        prefill: { email: user.email || "" },
        theme: { color: "#f97316" },
        handler: async (response) => {
          try {
            const { success, error: verifyError } = await verifyPayment(
              response.razorpay_payment_id,
              response.razorpay_subscription_id,
              response.razorpay_signature
            );
            if (!success) throw new Error(verifyError || "Payment verification failed");
            toast({ title: "🎉 Subscription Updated!", description: "Your plan has been upgraded" });
            await refreshSubscription();
          } catch (err: any) {
            toast({ title: "Verification failed", description: err.message, variant: "destructive" });
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setSelectedPlanId(null);
          },
        },
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setSelectedPlanId(null);
    }
  };

  const handleRenew = async () => {
    if (!currentPlan) return;
    await handleUpgrade(currentPlan.id);
  };

  const formatPrice = (price: number) => 
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);

  // No subscription or expired
  if (!subscription?.is_active || isExpired) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Subscription</h2>
          <p className="text-muted-foreground">Manage your subscription plan</p>
        </div>

        {/* Expired Warning */}
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">
                  {isExpired ? "Subscription Expired" : "No Active Subscription"}
                </h3>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                  {isExpired 
                    ? "Your subscription has expired. Renew now to continue using all features."
                    : "Subscribe to a plan to access all features."}
                </p>
                {isExpired && subscription?.current_period_end && (
                  <p className="text-red-500 text-xs mt-2">
                    Expired on {format(new Date(subscription.current_period_end), "MMM d, yyyy")}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans */}
        <div className="grid gap-4">
          {plans.map((plan) => {
            const isPopular = plan.has_orders_feature;
            return (
              <Card key={plan.id} className={`relative ${isPopular ? "border-orange-500 border-2" : ""}`}>
                {isPopular && (
                  <Badge className="absolute -top-3 right-4 bg-orange-500 text-white">Best Value</Badge>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isPopular ? "bg-orange-500 text-white" : "bg-gray-100 dark:bg-gray-800"
                      }`}>
                        {isPopular ? <Star className="h-6 w-6" /> : <Check className="h-6 w-6" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{formatPrice(plan.price_monthly)}</div>
                      <div className="text-sm text-muted-foreground">/month</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {plan.features.slice(0, 4).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading && selectedPlanId === plan.id}
                    className={`w-full mt-4 ${isPopular ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                  >
                    {loading && selectedPlanId === plan.id ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <><CreditCard className="h-4 w-4 mr-2" /> Subscribe Now</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Active subscription view
  const upgradePlan = plans.find(p => p.has_orders_feature && p.slug !== subscription?.plan_slug);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Subscription</h2>
        <p className="text-muted-foreground">Your subscription details</p>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Current Plan</CardTitle>
            <Badge variant={subscription?.is_active ? "default" : "destructive"} className="bg-green-500">
              {subscription?.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{subscription?.plan_name || "No Plan"}</h3>
                <p className="text-sm text-muted-foreground">{currentPlan?.description}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatPrice(currentPlan?.price_monthly || 0)}</div>
              <div className="text-sm text-muted-foreground">/month</div>
            </div>
          </div>

          {/* Dates */}
          {subscription?.current_period_end && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Started</p>
                  <p className="font-medium">
                    {format(new Date(subscription.current_period_end).setMonth(
                      new Date(subscription.current_period_end).getMonth() - 1
                    ), "d MMM yyyy")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className="font-medium">
                    {format(new Date(subscription.current_period_end), "d MMM yyyy")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Days Remaining */}
          {daysRemaining !== null && daysRemaining > 0 && (
            <div className={`flex items-center gap-3 p-4 rounded-xl ${
              daysRemaining <= 7 
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300" 
                : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
            }`}>
              <Clock className="h-5 w-5" />
              <div>
                <p className="font-medium">{daysRemaining} days remaining</p>
                <p className="text-sm opacity-80">Your subscription is active</p>
              </div>
            </div>
          )}

          {/* Renew/Change Plan Button */}
          <div className="flex gap-3">
            {daysRemaining !== null && daysRemaining <= 7 && (
              <Button onClick={handleRenew} className="flex-1 bg-orange-500 hover:bg-orange-600">
                <CreditCard className="h-4 w-4 mr-2" /> Renew Now
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => {}}>
              Change Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Card (if on basic plan) */}
      {upgradePlan && !currentPlan?.has_orders_feature && (
        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Upgrade to {upgradePlan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Get order management, real-time notifications, and customer feedback collection.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {upgradePlan.features.slice(0, 3).map((feature, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      <Check className="h-3 w-3 mr-1" /> {feature}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-orange-600">{formatPrice(upgradePlan.price_monthly)}</div>
                <div className="text-xs text-muted-foreground">/month</div>
              </div>
            </div>
            <Button 
              onClick={() => handleUpgrade(upgradePlan.id)}
              disabled={loading}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-600"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <>Upgrade Now <ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriptionManagement;
