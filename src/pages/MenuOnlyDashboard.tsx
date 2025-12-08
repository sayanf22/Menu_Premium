import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { 
  QrCode, 
  LogOut, 
  Menu as MenuIcon, 
  BarChart3, 
  Share2, 
  Settings, 
  Bell,
  User,
  FileText,
  Crown,
  Sparkles,
  CreditCard,
  AlertCircle,
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import MenuManagement from "@/components/dashboard/MenuManagement";
import StatsOverview from "@/components/dashboard/StatsOverview";
import QRCodeDisplay from "@/components/dashboard/QRCodeDisplay";
import SocialLinksForm from "@/components/dashboard/SocialLinksForm";
import RestaurantProfile from "@/components/dashboard/RestaurantProfile";
import SubscriptionManagement from "@/components/dashboard/SubscriptionManagement";
import ServiceCallsPanel from "@/components/dashboard/ServiceCallsPanel";
import { useSubscription } from "@/hooks/useSubscription";

interface ServiceCall {
  id: string;
  table_number: string;
  call_type: "waiter" | "water" | "bill";
  status: string;
  created_at: string;
}

const MenuOnlyDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { subscription, hasOrdersFeature, refreshSubscription } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
  const [isRestaurantDisabled, setIsRestaurantDisabled] = useState(false);
  const [activeTab, setActiveTab] = useState("menu");
  const [open, setOpen] = useState(false);
  const [serviceCallsCount, setServiceCallsCount] = useState(0);
  const [serviceCallNotification, setServiceCallNotification] = useState<ServiceCall | null>(null);
  const serviceCallSoundRef = useRef<NodeJS.Timeout | null>(null);
  const serviceCallAudioRef = useRef<AudioContext | null>(null);
  const serviceCallChannelRef = useRef<any>(null);
  const processedServiceCallIds = useRef<Set<string>>(new Set());
  const serviceCallInitialLoadDone = useRef(false);

  // If user has orders feature, redirect to full dashboard
  useEffect(() => {
    if (hasOrdersFeature && !loading) {
      navigate("/dashboard");
    }
  }, [hasOrdersFeature, loading, navigate]);

  // Check if subscription is expired
  const isSubscriptionExpired = subscription && !subscription.is_active;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setOpen(false);
  };

  const links = [
    {
      label: "Menu",
      href: "#menu",
      icon: <MenuIcon className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: () => handleTabChange("menu"),
    },
    {
      label: "Overview",
      href: "#stats",
      icon: <BarChart3 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: () => handleTabChange("stats"),
    },
    {
      label: "Social Links",
      href: "#social",
      icon: <Share2 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: () => handleTabChange("social"),
    },
    {
      label: "QR Code",
      href: "#qr",
      icon: <QrCode className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: () => handleTabChange("qr"),
    },
    {
      label: "Service Calls",
      href: "#service-calls",
      icon: <Bell className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: () => {
        handleTabChange("service-calls");
        setServiceCallsCount(0);
      },
      badge: serviceCallsCount,
    },
    {
      label: "Subscription",
      href: "#subscription",
      icon: <CreditCard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: () => handleTabChange("subscription"),
    },
    {
      label: "Profile",
      href: "#profile",
      icon: <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: () => handleTabChange("profile"),
    },
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  // Subscribe to service calls at dashboard level (always active)
  useEffect(() => {
    if (!restaurantId) return;

    // First, fetch existing service calls to mark them as processed
    const initializeServiceCalls = async () => {
      try {
        const { data } = await supabase
          .from("service_calls")
          .select("id")
          .eq("restaurant_id", restaurantId)
          .in("status", ["pending", "acknowledged"]);
        
        if (data) {
          data.forEach(call => processedServiceCallIds.current.add(call.id));
        }
        serviceCallInitialLoadDone.current = true;
        console.log('📞 Menu Dashboard: Service calls initialized:', data?.length || 0);
      } catch (err) {
        console.error('Error initializing service calls:', err);
        serviceCallInitialLoadDone.current = true;
      }
    };

    initializeServiceCalls();

    const channelName = `menu-dashboard-service-calls-${restaurantId}-${Date.now()}`;
    
    serviceCallChannelRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_calls",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const newCall = payload.new as ServiceCall;
          console.log('🔔 Menu Dashboard: New service call received', newCall);
          
          // Skip if already processed
          if (processedServiceCallIds.current.has(newCall.id)) {
            console.log('⏭️ Skipping already processed service call');
            return;
          }
          
          // Skip if initial load not done
          if (!serviceCallInitialLoadDone.current) {
            console.log('⏭️ Skipping service call - initial load not done');
            processedServiceCallIds.current.add(newCall.id);
            return;
          }
          
          processedServiceCallIds.current.add(newCall.id);
          
          // Trigger notification with sound
          handleNewServiceCall(newCall);
          
          toast({
            title: `🔔 ${newCall.call_type.charAt(0).toUpperCase() + newCall.call_type.slice(1)} Request!`,
            description: `Table ${newCall.table_number} needs ${newCall.call_type}`,
            duration: 10000,
          });
          
          console.log('✅ Menu Dashboard: Service call notification triggered');
        }
      )
      .subscribe((status) => {
        console.log('📞 Menu Dashboard service calls realtime status:', status);
      });

    return () => {
      if (serviceCallChannelRef.current) {
        supabase.removeChannel(serviceCallChannelRef.current);
      }
    };
  }, [restaurantId]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: restaurant, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error) throw error;

      setRestaurantId(restaurant.id);
      setRestaurantName(restaurant.name);
      setRestaurantLogo(restaurant.logo_url);
      setIsRestaurantDisabled(!restaurant.is_active);
    } catch (error: any) {
      console.error("Auth check error:", error);
      toast({
        title: "Error",
        description: "Failed to load restaurant data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const dismissServiceCallNotification = () => {
    setServiceCallNotification(null);
    if (serviceCallSoundRef.current) {
      clearInterval(serviceCallSoundRef.current);
      serviceCallSoundRef.current = null;
    }
  };

  // Bell ringing sound for service calls (6+ seconds)
  const playServiceCallBellSound = () => {
    if (serviceCallSoundRef.current) {
      clearInterval(serviceCallSoundRef.current);
    }

    if (!serviceCallAudioRef.current) {
      serviceCallAudioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = serviceCallAudioRef.current;
    if (ctx.state === "suspended") ctx.resume();

    let ringCount = 0;
    const maxRings = 8;

    const playBellRing = () => {
      if (ringCount >= maxRings) {
        if (serviceCallSoundRef.current) {
          clearInterval(serviceCallSoundRef.current);
          serviceCallSoundRef.current = null;
        }
        return;
      }

      const now = ctx.currentTime;
      const bellFrequencies = [
        { freq: 830, gain: 0.4 },
        { freq: 1245, gain: 0.25 },
        { freq: 1660, gain: 0.15 },
        { freq: 415, gain: 0.2 },
      ];

      bellFrequencies.forEach(({ freq, gain: gainValue }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(gainValue, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(gainValue * 0.3, now + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      });

      setTimeout(() => {
        const now2 = ctx.currentTime;
        [{ freq: 622, gain: 0.35 }, { freq: 933, gain: 0.2 }, { freq: 1244, gain: 0.1 }].forEach(({ freq, gain: gainValue }) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = "sine";
          gainNode.gain.setValueAtTime(0, now2);
          gainNode.gain.linearRampToValueAtTime(gainValue, now2 + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(gainValue * 0.3, now2 + 0.15);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now2 + 0.5);
          osc.start(now2);
          osc.stop(now2 + 0.5);
        });
      }, 200);

      ringCount++;
    };

    playBellRing();
    serviceCallSoundRef.current = setInterval(playBellRing, 800);
  };

  const handleNewServiceCall = (call: ServiceCall) => {
    setServiceCallsCount(prev => prev + 1);
    setServiceCallNotification(call);
    playServiceCallBellSound();
    
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-destructive">Failed to load restaurant data</p>
      </div>
    );
  }

  if (isRestaurantDisabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-2xl w-full p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Service Temporarily Paused</h1>
            <p className="text-lg text-muted-foreground">{restaurantName}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2 mx-auto block">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 mx-auto border border-neutral-200 dark:border-neutral-700 overflow-hidden",
        "h-screen"
      )}
    >
      {/* Subscription Expired Banner */}
      {isSubscriptionExpired && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-red-500 text-white py-3 px-4 text-center">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Your subscription has expired!</span>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => handleTabChange("subscription")}
              className="bg-white text-red-500 hover:bg-red-50"
            >
              Renew Now
            </Button>
          </div>
        </div>
      )}

      {/* Global Service Call Notification */}
      {serviceCallNotification && (
        <Card className="fixed top-16 md:top-4 left-4 right-4 md:left-auto md:right-4 z-[100] md:w-96 shadow-2xl border-2 border-orange-500 animate-in slide-in-from-top-4 duration-500">
          <CardHeader className="pb-3 bg-orange-500/10 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-500 rounded-full flex items-center justify-center animate-bounce">
                  {serviceCallNotification.call_type === 'waiter' && <User className="h-5 w-5 md:h-6 md:w-6 text-white" />}
                  {serviceCallNotification.call_type === 'water' && <Bell className="h-5 w-5 md:h-6 md:w-6 text-white" />}
                  {serviceCallNotification.call_type === 'bill' && <FileText className="h-5 w-5 md:h-6 md:w-6 text-white" />}
                </div>
                <div>
                  <CardTitle className="text-lg md:text-xl">🔔 {serviceCallNotification.call_type.charAt(0).toUpperCase() + serviceCallNotification.call_type.slice(1)} Request!</CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground">Table {serviceCallNotification.table_number}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={dismissServiceCallNotification} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Request Type:</span>
                <Badge variant="destructive" className="text-sm md:text-base px-2 md:px-3 py-1 animate-pulse">
                  {serviceCallNotification.call_type.charAt(0).toUpperCase() + serviceCallNotification.call_type.slice(1)}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Table Number:</span>
                <Badge variant="default" className="text-sm md:text-base px-2 md:px-3 py-1">
                  {serviceCallNotification.table_number}
                </Badge>
              </div>
              <Button 
                onClick={() => {
                  handleTabChange("service-calls");
                  setServiceCallsCount(0);
                  dismissServiceCallNotification();
                }} 
                className="w-full mt-3 bg-orange-500 hover:bg-orange-600" 
                variant="default"
              >
                View Service Calls
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo name={restaurantName} logo={restaurantLogo} /> : <LogoIcon logo={restaurantLogo} />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <div key={idx} className="relative" onClick={link.onClick}>
                  <SidebarLink link={link} />
                </div>
              ))}
            </div>
            
            {/* Upgrade Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 mx-2"
            >
              <Link to="/pricing">
                <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {open ? "Upgrade to Premium" : ""}
                      </span>
                    </div>
                    {open && (
                      <p className="text-xs text-muted-foreground">
                        Get real-time orders, notifications & more
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          </div>
          
          <div className="space-y-2">
            <Link
              to="/terms"
              className="flex items-center justify-start gap-2 group/sidebar py-2 cursor-pointer text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              <FileText className="h-4 w-4 flex-shrink-0" />
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="text-xs group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
              >
                Terms & Policies
              </motion.span>
            </Link>
            
            <div
              onClick={() => {
                setOpen(false);
                handleSignOut();
              }}
              className="flex items-center justify-start gap-2 group/sidebar py-2 cursor-pointer"
            >
              <LogOut className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
              >
                Logout
              </motion.span>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      <Dashboard activeTab={activeTab} restaurantId={restaurantId} onNewServiceCall={handleNewServiceCall} />
    </div>
  );
};

const Logo = ({ name, logo }: { name: string; logo: string | null }) => {
  return (
    <div className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
      {logo ? (
        <img src={logo} alt={name} className="h-8 w-8 rounded-full flex-shrink-0 object-cover" />
      ) : (
        <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-full flex-shrink-0 flex items-center justify-center">
          <span className="text-white font-bold text-sm">{name.charAt(0)}</span>
        </div>
      )}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black dark:text-white whitespace-pre"
      >
        {name}
      </motion.span>
      <Badge variant="secondary" className="text-xs ml-1">Advanced</Badge>
    </div>
  );
};

const LogoIcon = ({ logo }: { logo: string | null }) => {
  return (
    <div className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
      {logo ? (
        <img src={logo} alt="Logo" className="h-8 w-8 rounded-full flex-shrink-0 object-cover" />
      ) : (
        <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 rounded-full flex-shrink-0" />
      )}
    </div>
  );
};

const Dashboard = ({ activeTab, restaurantId, onNewServiceCall }: { activeTab: string; restaurantId: string; onNewServiceCall: (call: ServiceCall) => void }) => {
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="p-4 md:p-10 md:rounded-tl-2xl border-t md:border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-4 flex-1 w-full overflow-y-auto">
        {activeTab === "menu" && <MenuManagement restaurantId={restaurantId} />}
        {activeTab === "stats" && <StatsOverview restaurantId={restaurantId} />}
        {activeTab === "social" && <SocialLinksForm restaurantId={restaurantId} />}
        {activeTab === "qr" && <QRCodeDisplay restaurantId={restaurantId} />}
        {activeTab === "service-calls" && <ServiceCallsPanel restaurantId={restaurantId} onNewCall={(call) => onNewServiceCall(call as ServiceCall)} />}
        {activeTab === "subscription" && <SubscriptionManagement />}
        {activeTab === "profile" && <RestaurantProfile restaurantId={restaurantId} />}
      </div>
    </div>
  );
};

export default MenuOnlyDashboard;
