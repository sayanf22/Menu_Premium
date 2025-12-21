import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellOff, BellRing, CheckCircle2, XCircle, Loader2, Smartphone, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationSettingsProps {
  restaurantId: string;
}

const NotificationSettings = ({ restaurantId }: NotificationSettingsProps) => {
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<string>("default");
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, [restaurantId]);

  const checkNotificationStatus = async () => {
    try {
      setLoading(true);
      
      // Check if browser supports notifications
      if (!("Notification" in window)) {
        setIsSupported(false);
        setLoading(false);
        return;
      }
      
      setIsSupported(true);
      setPermission(Notification.permission);

      // Check OneSignal subscription status
      if ((window as any).OneSignalDeferred) {
        (window as any).OneSignalDeferred.push(async function (OneSignal: any) {
          try {
            const subscribed = await OneSignal.User.PushSubscription.optedIn;
            setIsSubscribed(subscribed || false);
            
            const perm = await OneSignal.Notifications.permission;
            setPermission(perm ? "granted" : "default");
          } catch (error) {
            console.error("Error checking OneSignal status:", error);
          }
        });
      }
    } catch (error) {
      console.error("Error checking notification status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!(window as any).OneSignalDeferred) {
      toast({
        title: "Notifications unavailable",
        description: "Push notifications are only available on addmenu.site",
        variant: "destructive",
      });
      return;
    }

    setSubscribing(true);

    try {
      (window as any).OneSignalDeferred.push(async function (OneSignal: any) {
        try {
          // Tag user with restaurant_id first
          await OneSignal.User.addTag("restaurant_id", restaurantId);
          
          // Request permission
          const granted = await OneSignal.Notifications.requestPermission();
          
          if (granted) {
            // Opt in to push
            await OneSignal.User.PushSubscription.optIn();
            
            setIsSubscribed(true);
            setPermission("granted");
            
            toast({
              title: "🔔 Notifications Enabled!",
              description: "You'll receive alerts when new orders come in",
              duration: 5000,
            });
          } else {
            toast({
              title: "Permission denied",
              description: "Please enable notifications in your browser settings",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error enabling notifications:", error);
          toast({
            title: "Error",
            description: "Failed to enable notifications. Please try again.",
            variant: "destructive",
          });
        } finally {
          setSubscribing(false);
        }
      });
    } catch (error) {
      console.error("Error:", error);
      setSubscribing(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (!(window as any).OneSignalDeferred) return;

    setSubscribing(true);

    try {
      (window as any).OneSignalDeferred.push(async function (OneSignal: any) {
        try {
          await OneSignal.User.PushSubscription.optOut();
          setIsSubscribed(false);
          
          toast({
            title: "Notifications disabled",
            description: "You won't receive push notifications anymore",
          });
        } catch (error) {
          console.error("Error disabling notifications:", error);
        } finally {
          setSubscribing(false);
        }
      });
    } catch (error) {
      setSubscribing(false);
    }
  };

  const handleTestNotification = async () => {
    if (!(window as any).OneSignalDeferred) {
      toast({
        title: "Test notification",
        description: "🔔 This is how order notifications will appear!",
        duration: 5000,
      });
      return;
    }

    toast({
      title: "🔔 Test Notification Sent!",
      description: "Check your device for the notification",
      duration: 3000,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Get instant alerts on your device when customers place orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border-2 ${
              isSubscribed 
                ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" 
                : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
            }`}
          >
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <BellRing className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">Notifications Active</p>
                    <p className="text-sm text-green-600 dark:text-green-400">You'll receive order alerts on this device</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                    <BellOff className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200">Notifications Disabled</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">Enable to get instant order alerts</p>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* Browser Support Check */}
          {!isSupported && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Browser Not Supported</p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Your browser doesn't support push notifications. Try Chrome, Firefox, or Edge.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Enable/Disable Toggle */}
          {isSupported && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                <div>
                  <Label htmlFor="notifications" className="font-medium">Order Notifications</Label>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Receive alerts when customers place orders
                  </p>
                </div>
              </div>
              <Switch
                id="notifications"
                checked={isSubscribed}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleEnableNotifications();
                  } else {
                    handleDisableNotifications();
                  }
                }}
                disabled={subscribing}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {!isSubscribed && isSupported && (
              <Button 
                onClick={handleEnableNotifications}
                disabled={subscribing}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {subscribing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enabling...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Enable Notifications
                  </>
                )}
              </Button>
            )}
            
            {isSubscribed && (
              <Button 
                variant="outline"
                onClick={handleTestNotification}
              >
                <BellRing className="h-4 w-4 mr-2" />
                Test Notification
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-orange-600">1</span>
              </div>
              <div>
                <p className="font-medium">Customer places an order</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  When a customer scans your QR code and places an order
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-orange-600">2</span>
              </div>
              <div>
                <p className="font-medium">You get instant notification</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  A push notification appears on your device with order details
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-orange-600">3</span>
              </div>
              <div>
                <p className="font-medium">Manage from dashboard</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Click the notification or open dashboard to view and manage orders
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Supported Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
              <Monitor className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              <div>
                <p className="font-medium text-sm">Desktop</p>
                <p className="text-xs text-zinc-500">Chrome, Firefox, Edge</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50">
              <Smartphone className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              <div>
                <p className="font-medium text-sm">Mobile</p>
                <p className="text-xs text-zinc-500">Android Chrome</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
            Note: iOS Safari has limited push notification support. For best experience, use Chrome on Android or desktop browsers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
