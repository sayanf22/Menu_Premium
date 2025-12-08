import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2, Crown, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { 
  createSubscription, 
  verifyPayment, 
  openRazorpayCheckout
} from "@/lib/razorpay";

interface SubscriptionPricingProps {
  onSuccess?: () => void;
}

const SubscriptionPricing = ({ onSuccess }: SubscriptionPricingProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { plans, subscription, refreshSubscription } = useSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string, planName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to subscribe",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setLoadingPlan(planId);

    try {
      const billingCycle = isYearly ? "yearly" : "monthly";
      const { subscriptionId, razorpayKeyId, error } = await createSubscription(planId, billingCycle);

      if (error || !subscriptionId) {
        throw new Error(error || "Failed to create subscription");
      }

      if (!razorpayKeyId) {
        throw new Error("Payment gateway not configured");
      }

      await openRazorpayCheckout({
        key: razorpayKeyId,
        subscription_id: subscriptionId,
        name: "AddMenu",
        description: `${planName} - ${billingCycle} subscription`,
        prefill: {
          email: user.email || "",
        },
        theme: {
          color: "#f97316",
        },
        handler: async (response) => {
          try {
            const { success, error: verifyError } = await verifyPayment(
              response.razorpay_payment_id,
              response.razorpay_subscription_id,
              response.razorpay_signature
            );

            if (!success) {
              throw new Error(verifyError || "Payment verification failed");
            }

            toast({
              title: "🎉 Subscription activated!",
              description: `Welcome to ${planName}!`,
            });

            await refreshSubscription();
            onSuccess?.();
            
            // Redirect based on plan
            const plan = plans.find(p => p.id === planId);
            if (plan?.has_orders_feature) {
              navigate("/dashboard");
            } else {
              navigate("/menu-dashboard");
            }
          } catch (err: any) {
            toast({
              title: "Verification failed",
              description: err.message,
              variant: "destructive",
            });
          }
        },
        modal: {
          ondismiss: () => {
            setLoadingPlan(null);
            toast({
              title: "Payment cancelled",
              description: "You can try again anytime",
            });
          },
        },
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Label htmlFor="billing-toggle" className={!isYearly ? "font-semibold" : "text-muted-foreground"}>
          Monthly
        </Label>
        <Switch
          id="billing-toggle"
          checked={isYearly}
          onCheckedChange={setIsYearly}
        />
        <Label htmlFor="billing-toggle" className={isYearly ? "font-semibold" : "text-muted-foreground"}>
          Yearly
          <Badge variant="secondary" className="ml-2 text-xs">Save 17%</Badge>
        </Label>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((plan, index) => {
          const isCurrentPlan = subscription?.plan_slug === plan.slug && subscription?.is_active;
          const isPopular = plan.has_orders_feature;
          const price = isYearly ? plan.price_yearly : plan.price_monthly;
          const monthlyEquivalent = isYearly ? Math.round(plan.price_yearly / 12) : plan.price_monthly;

          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-all duration-300 ${
                isPopular 
                  ? "border-2 border-primary shadow-lg scale-[1.02]" 
                  : "border hover:border-primary/50"
              }`}
            >
              {isPopular && (
                <div className="absolute top-0 right-0">
                  <div className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold rounded-bl-lg flex items-center gap-1">
                    <Crown className="h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  {isPopular ? (
                    <Sparkles className="h-5 w-5 text-primary" />
                  ) : (
                    <div className="h-5 w-5 rounded bg-muted" />
                  )}
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{formatPrice(price)}</span>
                    <span className="text-muted-foreground">/{isYearly ? "year" : "month"}</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatPrice(monthlyEquivalent)}/month billed annually
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {!plan.has_orders_feature && (
                    <li className="flex items-start gap-2 text-sm text-muted-foreground">
                      <X className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Order Management</span>
                    </li>
                  )}
                </ul>

                {/* CTA Button */}
                <Button
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
                  size="lg"
                  disabled={isCurrentPlan || loadingPlan === plan.id}
                  onClick={() => handleSubscribe(plan.id, plan.name)}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : subscription?.is_active ? (
                    plan.has_orders_feature ? "Upgrade" : "Switch Plan"
                  ) : (
                    "Get Started"
                  )}
                </Button>

                {isCurrentPlan && (
                  <p className="text-center text-sm text-muted-foreground">
                    Your subscription is active
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionPricing;
