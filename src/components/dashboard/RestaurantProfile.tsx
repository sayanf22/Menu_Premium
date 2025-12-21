import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Save, Upload, X, Bell, BellOff, BellRing, 
  Store, ImageIcon, CheckCircle2, AlertCircle
} from "lucide-react";
import { uploadToR2WithProgress, deleteFromR2, isR2Url } from "@/lib/r2Upload";
import { motion } from "framer-motion";

interface RestaurantProfileProps {
  restaurantId: string;
}

const RestaurantProfile = ({ restaurantId }: RestaurantProfileProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [originalLogoUrl, setOriginalLogoUrl] = useState<string | null>(null);
  
  // Notification states
  const [notificationSupported, setNotificationSupported] = useState(true);
  const [notificationSubscribed, setNotificationSubscribed] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [isProductionDomain, setIsProductionDomain] = useState(false);
  const [oneSignalReady, setOneSignalReady] = useState(false);

  useEffect(() => {
    fetchRestaurantData();
    initializeNotifications();
  }, [restaurantId]);

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("restaurants")
        .select("name, description, logo_url")
        .eq("id", restaurantId)
        .single();

      if (error) throw error;

      setName(data.name || "");
      setDescription(data.description || "");
      setLogoUrl(data.logo_url || null);
      setOriginalLogoUrl(data.logo_url || null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load restaurant profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeNotifications = async () => {
    // Check if on production domain
    const isProd = window.location.hostname === 'addmenu.site' || 
                   window.location.hostname.endsWith('.addmenu.site');
    setIsProductionDomain(isProd);
    
    // Check browser support
    if (!("Notification" in window)) {
      setNotificationSupported(false);
      return;
    }

    // Wait for OneSignal to be ready
    if (isProd && (window as any).OneSignalDeferred) {
      try {
        await new Promise<void>((resolve) => {
          (window as any).OneSignalDeferred.push(async function (OneSignal: any) {
            try {
              setOneSignalReady(true);
              
              // Check current subscription status
              const subscribed = await OneSignal.User.PushSubscription.optedIn;
              setNotificationSubscribed(subscribed === true);
              
              // Tag with restaurant_id
              if (restaurantId) {
                await OneSignal.User.addTag("restaurant_id", restaurantId);
              }
            } catch (error) {
              console.error("OneSignal init error:", error);
            }
            resolve();
          });
        });
      } catch (error) {
        console.error("OneSignal setup error:", error);
      }
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!isProductionDomain) {
      toast({
        title: "Not available here",
        description: "Push notifications only work on addmenu.site",
        variant: "destructive",
      });
      return;
    }

    if (!(window as any).OneSignalDeferred) {
      toast({
        title: "Please refresh",
        description: "OneSignal is not loaded. Refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setNotificationLoading(true);

    try {
      await new Promise<void>((resolve, reject) => {
        (window as any).OneSignalDeferred.push(async function (OneSignal: any) {
          try {
            if (enabled) {
              // Tag with restaurant_id first
              await OneSignal.User.addTag("restaurant_id", restaurantId);
              console.log("Tagged with restaurant_id:", restaurantId);
              
              // Request permission using the slidedown prompt
              const permission = await OneSignal.Notifications.requestPermission();
              console.log("Permission result:", permission);
              
              if (permission) {
                // Opt in to push notifications
                await OneSignal.User.PushSubscription.optIn();
                setNotificationSubscribed(true);
                toast({
                  title: "🔔 Notifications Enabled!",
                  description: "You'll receive alerts when new orders come in",
                });
              } else {
                toast({
                  title: "Permission denied",
                  description: "Please allow notifications in your browser settings",
                  variant: "destructive",
                });
              }
            } else {
              // Opt out of push notifications
              await OneSignal.User.PushSubscription.optOut();
              setNotificationSubscribed(false);
              toast({
                title: "Notifications disabled",
                description: "You won't receive push notifications",
              });
            }
            resolve();
          } catch (error) {
            console.error("Notification toggle error:", error);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to update notification settings. Try refreshing.",
        variant: "destructive",
      });
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast({ title: "Invalid file", description: "Please upload an image", variant: "destructive" });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 5MB allowed", variant: "destructive" });
        return;
      }

      setUploading(true);
      
      const { compressImage } = await import("@/lib/imageOptimization");
      const compressedFile = await compressImage(file, 'logo');

      const result = await uploadToR2WithProgress(
        compressedFile,
        "restaurant-logos",
        (progress) => setUploadProgress(progress)
      );

      if (!result.success || !result.publicUrl) {
        throw new Error(result.error || "Upload failed");
      }

      setLogoUrl(result.publicUrl);
      toast({ title: "Logo uploaded!", description: "Don't forget to save" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    toast({ title: "Logo removed", description: "Save to confirm" });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("restaurants")
        .update({
          name: name.trim(),
          description: description.trim(),
          logo_url: logoUrl,
        })
        .eq("id", restaurantId);

      if (error) throw error;

      if (originalLogoUrl && originalLogoUrl !== logoUrl && isR2Url(originalLogoUrl)) {
        deleteFromR2(originalLogoUrl);
      }

      setOriginalLogoUrl(logoUrl);
      toast({ title: "Saved!", description: "Settings updated successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Restaurant Info Card */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Store className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <CardTitle className="text-lg md:text-xl">Restaurant Settings</CardTitle>
              <CardDescription className="text-white/80 text-sm">
                Customize how customers see your restaurant
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-5 md:space-y-6">
          {/* Logo Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-shrink-0">
              {logoUrl ? (
                <div className="relative">
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-2xl border-2 border-zinc-200 dark:border-zinc-700"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-lg"
                    onClick={handleRemoveLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-20 h-20 md:w-24 md:h-24 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-zinc-400" />
                </div>
              )}
            </div>
            <div className="flex-1 w-full">
              <Label className="text-sm font-medium mb-2 block">Restaurant Logo</Label>
              <div className="relative">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="cursor-pointer text-sm"
                />
              </div>
              {uploading && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Uploading... {uploadProgress}%
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-zinc-500 mt-1">Square image, max 5MB</p>
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Restaurant Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your restaurant name"
              maxLength={100}
              className="h-11 md:h-12 rounded-xl"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your restaurant, cuisine type, specialties..."
              rows={4}
              maxLength={500}
              className="resize-none rounded-xl"
            />
            <p className="text-xs text-zinc-500 text-right">{description.length}/500</p>
          </div>

          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="w-full h-11 md:h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Push Notifications Card */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 md:pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${
              notificationSubscribed 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-zinc-100 dark:bg-zinc-800'
            }`}>
              {notificationSubscribed ? (
                <BellRing className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-400" />
              ) : (
                <Bell className="h-5 w-5 md:h-6 md:w-6 text-zinc-500" />
              )}
            </div>
            <div className="flex-1">
              <CardTitle className="text-base md:text-lg">Push Notifications</CardTitle>
              <CardDescription className="text-sm">
                Get instant alerts for new orders
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-4">
          {/* Status Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-3 md:p-4 rounded-xl ${
              notificationSubscribed 
                ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800' 
                : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {notificationSubscribed ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200 text-sm md:text-base">Push Notifications Active</p>
                    <p className="text-xs md:text-sm text-green-600 dark:text-green-400">You'll receive order alerts on this device</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200 text-sm md:text-base">Push Notifications Off</p>
                    <p className="text-xs md:text-sm text-amber-600 dark:text-amber-400">Enable to get instant order alerts</p>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* Toggle Switch */}
          {isProductionDomain && notificationSupported && (
            <div className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-zinc-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm md:text-base">Order Push Notifications</p>
                  <p className="text-xs md:text-sm text-zinc-500">Browser push alerts for new orders</p>
                </div>
              </div>
              {notificationLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Switch
                  checked={notificationSubscribed}
                  onCheckedChange={handleNotificationToggle}
                  disabled={notificationLoading}
                />
              )}
            </div>
          )}

          {/* Enable Button for easier access */}
          {isProductionDomain && notificationSupported && !notificationSubscribed && (
            <Button 
              onClick={() => handleNotificationToggle(true)}
              disabled={notificationLoading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {notificationLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Push Notifications
                </>
              )}
            </Button>
          )}

          {/* Not on production domain warning */}
          {!isProductionDomain && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs md:text-sm text-blue-700 dark:text-blue-300">
                  Push notifications are only available on <strong>addmenu.site</strong>. 
                  You're currently on {window.location.hostname}.
                </p>
              </div>
            </div>
          )}

          {/* Browser not supported warning */}
          {!notificationSupported && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <BellOff className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs md:text-sm text-red-700 dark:text-red-300">
                  Your browser doesn't support push notifications. Try Chrome, Firefox, or Edge.
                </p>
              </div>
            </div>
          )}

          {/* How it works - Collapsible */}
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <span className="font-medium text-sm">How push notifications work</span>
              <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-3 space-y-3 pl-2">
              {[
                { step: "1", text: "Customer places an order via QR menu" },
                { step: "2", text: "You get instant push notification on this device" },
                { step: "3", text: "Tap notification to view order in dashboard" },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-orange-600">{item.step}</span>
                  </div>
                  <p className="text-xs md:text-sm text-zinc-600 dark:text-zinc-400">{item.text}</p>
                </div>
              ))}
            </div>
          </details>

          {/* Note about in-app notifications */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
            💡 In-app order notifications always work. Push notifications are for when you're not on the dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RestaurantProfile;
