import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSubscription } from "@/hooks/useSubscription";
import {
  createSubscription,
  verifyPayment,
  openRazorpayCheckout,
} from "@/lib/razorpay";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  CreditCard,
  Check,
  Star,
  ArrowRight,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const SubscriptionManagement = () => {
  const { subscription, plans, refreshSubscription } = useSubscription();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const currentPlan = plans.find((p) => p.slug === subscription?.plan_slug);
  const isExpired =
    subscription?.current_period_end &&
    isPast(new Date(subscription.current_period_end));
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
        description: `Upgrade to ${plans.find((p) => p.id === planId)?.name}`,
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

  const handleCancelSubscription = async () => {
    if (confirmText !== "CONFIRM") {
      toast({ title: "Please type CONFIRM to proceed", variant: "destructive" });
      return;
    }

    setCancelLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("cancel_user_subscription" as any, {
        p_user_id: user.id,
      }) as { data: { success: boolean; error?: string } | null; error: any };

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Failed to cancel subscription");

      toast({
        title: "Subscription Cancelled",
        description: "Your service has been deactivated. No refunds are provided.",
        variant: "destructive",
      });

      setCancelDialogOpen(false);
      setConfirmText("");
      await refreshSubscription();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCancelLoading(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(price);

  // No subscription or expired - show plans
  if (!subscription?.has_subscription || !subscription?.is_active || isExpired) {
    return (
      <div className="space-y-6">
        <Card className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              {isExpired ? "Subscription Expired" : "No Active Subscription"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {isExpired
                ? "Your subscription has expired. Renew to continue using all features."
                : "Subscribe to a plan to unlock all features and start serving your customers."}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className="rounded-2xl shadow-lg border-0 hover:shadow-xl transition-all duration-300"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  {plan.has_orders_feature && (
                    <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{formatPrice(plan.price_monthly)}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading && selectedPlanId === plan.id}
                >
                  {loading && selectedPlanId === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Subscribe Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Active subscription view
  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card className="rounded-2xl shadow-lg border-0 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Current Plan</p>
              <h2 className="text-2xl font-bold">{currentPlan?.name || subscription.plan_name}</h2>
            </div>
            <Badge className="bg-white/20 text-white border-0 text-sm px-3 py-1">
              {subscription.subscription_status === "active" ? "Active" : subscription.subscription_status}
            </Badge>
          </div>
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Billing Period</p>
                <p className="font-medium">
                  {subscription.current_period_end
                    ? format(new Date(subscription.current_period_end), "MMM dd, yyyy")
                    : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Days Remaining</p>
                <p className="font-medium">
                  {daysRemaining !== null && daysRemaining > 0 ? `${daysRemaining} days` : "Expiring soon"}
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          {currentPlan && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">Plan Features</p>
              <ul className="grid grid-cols-2 gap-2">
                {currentPlan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Advanced Options - Hidden by default */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between text-muted-foreground hover:text-foreground mt-4"
              >
                <span className="text-sm">Advanced Options</span>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <Card className="rounded-xl border-destructive/30 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="space-y-2">
                      <p className="font-medium text-destructive">Cancel Subscription</p>
                      <p className="text-sm text-muted-foreground">
                        Cancelling will immediately deactivate your account. No refunds are provided.
                        You will need to resubscribe to use the service again.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="rounded-lg mt-2"
                        onClick={() => setCancelDialogOpen(true)}
                      >
                        Cancel Subscription
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Upgrade Card - Show if not on premium */}
      {!subscription.has_orders_feature && (
        <Card className="rounded-2xl shadow-lg border-0 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Upgrade to Premium</p>
                  <p className="text-sm text-muted-foreground">
                    Unlock orders feature and unlimited menu items
                  </p>
                </div>
              </div>
              <Button
                className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                onClick={() => {
                  const premiumPlan = plans.find((p) => p.has_orders_feature);
                  if (premiumPlan) handleUpgrade(premiumPlan.id);
                }}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upgrade"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Cancel Subscription
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This action will <strong>immediately deactivate</strong> your account.
                You will lose access to all features and your menu will no longer be visible to customers.
              </p>
              <p className="text-destructive font-medium">
                No refunds will be provided for the remaining subscription period.
              </p>
              <div className="pt-2">
                <p className="text-sm mb-2">
                  Type <strong>CONFIRM</strong> to proceed:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type CONFIRM"
                  className="rounded-lg"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-lg"
              onClick={() => {
                setConfirmText("");
              }}
            >
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-destructive hover:bg-destructive/90"
              onClick={handleCancelSubscription}
              disabled={confirmText !== "CONFIRM" || cancelLoading}
            >
              {cancelLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionManagement;