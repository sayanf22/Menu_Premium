import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { 
  QrCode, 
  LogOut, 
  Menu as MenuIcon, 
  Package, 
  MessageSquare, 
  BarChart3, 
  Share2, 
  Settings, 
  Bell, 
  X,
  User,
  FileText
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import MenuManagement from "@/components/dashboard/MenuManagement";
import OrderManagement from "@/components/dashboard/OrderManagement";
import FeedbackView from "@/components/dashboard/FeedbackView";
import StatsOverview from "@/components/dashboard/StatsOverview";
import QRCodeDisplay from "@/components/dashboard/QRCodeDisplay";
import SocialLinksForm from "@/components/dashboard/SocialLinksForm";
import RestaurantProfile from "@/components/dashboard/RestaurantProfile";

interface Order {
  id: string;
  order_number: string;
  table_number: string;
  items: any;
  status: string;
  created_at: string;
}

const DashboardWithSidebar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [newOrderNotification, setNewOrderNotification] = useState<Order | null>(null);
  const [lastNewOrder, setLastNewOrder] = useState<Order | null>(null);
  const [lastViewCount, setLastViewCount] = useState(0);
  const [isRestaurantDisabled, setIsRestaurantDisabled] = useState(false);
  const [activeTab, setActiveTab] = useState("stats");
  const [open, setOpen] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastOrderCountRef = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const dashboardLoadTimeRef = useRef<number>(Date.now()); // Track when dashboard loaded
  const processedOrderIdsRef = useRef<Set<string>>(new Set()); // Track processed orders

  // Helper to handle tab change and close mobile sidebar
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setOpen(false); // Close mobile sidebar
  };

  const links = [
    {
      label: "Overview",
      href: "#stats",
      icon: <BarChart3 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: () => handleTabChange("stats"),
    },
    {
      label: "Menu",
      href: "#menu",
      icon: <MenuIcon className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: () => handleTabChange("menu"),
    },
    {
      label: "Orders",
      href: "#orders",
      icon: <Package className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: () => {
        handleTabChange("orders");
        setNewOrdersCount(0);
      },
      badge: newOrdersCount,
    },
    {
      label: "Feedback",
      href: "#feedback",
      icon: <MessageSquare className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: () => handleTabChange("feedback"),
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
      label: "Profile",
      href: "#profile",
      icon: <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: () => handleTabChange("profile"),
    },
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  // Setup OneSignal for push notifications
  useEffect(() => {
    if (!restaurantId) return;

    const setupOneSignal = async () => {
      if (typeof window === "undefined" || !(window as any).OneSignalDeferred) {
        console.log("⚠️ OneSignal not available");
        return;
      }

      (window as any).OneSignalDeferred.push(async function (OneSignal: any) {
        try {
          // Tag user with restaurant_id so notifications go to the right device
          await OneSignal.User.addTag("restaurant_id", restaurantId);
          console.log("✅ OneSignal tagged with restaurant_id:", restaurantId);

          // Check if already subscribed
          const permission = await OneSignal.Notifications.permission;
          console.log("🔔 OneSignal permission:", permission);

          // Request permission if not granted
          if (!permission) {
            const granted = await OneSignal.Notifications.requestPermission();
            console.log("🔔 Permission request result:", granted);
            
            if (granted) {
              toast({
                title: "🔔 Notifications Enabled!",
                description: "You'll receive alerts when new orders come in",
                duration: 5000,
              });
            }
          }

          // Log subscription status
          const subscribed = await OneSignal.User.PushSubscription.optedIn;
          console.log("🔔 OneSignal subscribed:", subscribed);
        } catch (error) {
          console.error("❌ OneSignal setup error:", error);
        }
      });
    };

    // Delay to ensure OneSignal is fully loaded
    const timer = setTimeout(setupOneSignal, 2000);
    return () => clearTimeout(timer);
  }, [restaurantId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (restaurantId) {
      // Subscribe to orders at dashboard level (always active)
      const cleanupOrders = subscribeToNewOrders();
      const cleanupViews = subscribeToMenuViews();
      
      // Get initial view count
      supabase
        .from("menu_views")
        .select("view_count")
        .eq("restaurant_id", restaurantId)
        .single()
        .then(({ data }) => {
          if (data) {
            setLastViewCount(data.view_count);
          }
        });
      
      // IMPORTANT: Initialize order count FIRST before starting polling
      // This prevents the sound from playing on page load/refresh
      const initializeOrderCount = async () => {
        try {
          const { data, error } = await supabase
            .from("orders")
            .select("id")
            .eq("restaurant_id", restaurantId);
          
          if (!error && data) {
            // Set the initial count so polling doesn't think existing orders are new
            lastOrderCountRef.current = data.length;
            console.log('📊 Initialized order count:', data.length);
          }
        } catch (err) {
          console.error('Error initializing order count:', err);
        }
      };
      
      // Initialize first, then start polling after a delay
      initializeOrderCount().then(() => {
        // Start polling AFTER we have the initial count
        pollingIntervalRef.current = setInterval(async () => {
          try {
            const { data, error } = await supabase
              .from("orders")
              .select("id, order_number, table_number, items, status, created_at")
              .eq("restaurant_id", restaurantId)
              .order("created_at", { ascending: false });
            
            if (error) return;
            
            // Only trigger notification if count increased AND we have initialized
            if (data && data.length > lastOrderCountRef.current && lastOrderCountRef.current > 0) {
              const newOrderCount = data.length - lastOrderCountRef.current;
              const newOrders = data.slice(0, newOrderCount);
              
              newOrders.forEach((order) => {
                // Use the same checks as handleNewOrder
                const orderCreatedAt = new Date(order.created_at).getTime();
                if (orderCreatedAt < dashboardLoadTimeRef.current) {
                  return; // Skip old orders
                }
                if (processedOrderIdsRef.current.has(order.id)) {
                  return; // Skip already processed
                }
                
                processedOrderIdsRef.current.add(order.id);
                setNewOrdersCount(prev => prev + 1);
                setNewOrderNotification(order as Order);
                playPleasantNotificationSound();
                
                toast({
                  title: "🔔 New Order!",
                  description: `Order #${order.order_number} from Table ${order.table_number}`,
                  duration: 10000,
                });
              });
            }
            
            if (data) {
              lastOrderCountRef.current = data.length;
            }
          } catch (err) {
            console.error('Polling error:', err);
          }
        }, 5000); // Increased to 5 seconds to reduce load
      });
      
      return () => {
        if (cleanupOrders) cleanupOrders();
        if (cleanupViews) cleanupViews();
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
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

  const subscribeToMenuViews = () => {
    if (!restaurantId) return;

    // Dashboard stays connected even in background - no visibility optimization
    const channelName = `menu-views-${restaurantId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "menu_views",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const newViewCount = payload.new.view_count;
          
          if (newViewCount > lastViewCount) {
            setLastViewCount(newViewCount);
            
            toast({
              title: "👁️ New Customer!",
              description: `Someone just scanned your QR code!`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Keep realtime subscription ALWAYS active at dashboard level
  // Dashboard must receive orders even when tab is in background
  const subscribeToNewOrders = () => {
    if (!restaurantId) return;

    const channelName = `dashboard-orders-${restaurantId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const newOrder = payload.new as Order;
          console.log('🔔 Dashboard: New order received', newOrder);
          handleNewOrder(newOrder);
        }
      )
      .subscribe((status) => {
        console.log('🔔 Dashboard realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleNewOrder = (order: Order) => {
    // Skip if this order was created before dashboard loaded (prevents sound on refresh)
    const orderCreatedAt = new Date(order.created_at).getTime();
    if (orderCreatedAt < dashboardLoadTimeRef.current) {
      console.log('⏭️ Skipping old order (created before dashboard load):', order.order_number);
      return;
    }
    
    // Skip if we already processed this order (prevents duplicate sounds)
    if (processedOrderIdsRef.current.has(order.id)) {
      console.log('⏭️ Skipping already processed order:', order.order_number);
      return;
    }
    
    // Mark as processed
    processedOrderIdsRef.current.add(order.id);
    
    console.log('🎯 Dashboard: Handling new order', order);
    
    setNewOrdersCount(prev => prev + 1);
    setNewOrderNotification(order);
    
    // Create a new object reference to ensure React detects the change
    setLastNewOrder({ ...order, _timestamp: Date.now() } as any);
    
    playPleasantNotificationSound();
    
    toast({
      title: "🔔 New Order!",
      description: `Order #${order.order_number} from Table ${order.table_number}`,
      duration: 10000,
    });
    
    console.log('✅ Dashboard: New order notification triggered');
  };

  const playPleasantNotificationSound = () => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    let beepCount = 0;
    const maxBeeps = 30;

    const playBeep = () => {
      if (beepCount >= maxBeeps) {
        if (soundIntervalRef.current) {
          clearInterval(soundIntervalRef.current);
        }
        return;
      }

      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.start(now);
      osc.stop(now + 0.15);

      beepCount++;
    };

    playBeep();
    soundIntervalRef.current = setInterval(playBeep, 500);
  };

  const dismissNotification = () => {
    setNewOrderNotification(null);
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
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
      {/* Global New Order Notification */}
      {newOrderNotification && (
        <Card className="fixed top-16 md:top-4 left-4 right-4 md:left-auto md:right-4 z-[100] md:w-96 shadow-2xl border-2 border-primary animate-in slide-in-from-top-4 duration-500">
          <CardHeader className="pb-3 bg-primary/5 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-full flex items-center justify-center animate-pulse">
                  <Bell className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg md:text-xl">🔔 New Order!</CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground">Order #{newOrderNotification.order_number}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={dismissNotification} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Table Number:</span>
                <Badge variant="default" className="text-sm md:text-base px-2 md:px-3 py-1">
                  {newOrderNotification.table_number}
                </Badge>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Items:</p>
                <div className="space-y-1 text-xs md:text-sm text-muted-foreground max-h-32 overflow-y-auto">
                  {newOrderNotification.items?.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate mr-2">{item.name} x{item.quantity || 1}</span>
                      <span className="flex-shrink-0">₹{(item.price * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button 
                onClick={() => {
                  handleTabChange("orders");
                  dismissNotification();
                }} 
                className="w-full mt-3" 
                variant="default"
              >
                View Order
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
                  {link.badge && link.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute top-1 right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {link.badge}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {/* Policy Links */}
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
                setOpen(false); // Close mobile sidebar
                const testOrder: Order = {
                  id: 'test-' + Date.now(),
                  order_number: 'TEST' + Date.now().toString().slice(-4),
                  table_number: '99',
                  items: {
                    items: [
                      { name: 'Test Burger', price: 150, quantity: 1 },
                      { name: 'Test Fries', price: 80, quantity: 2 }
                    ]
                  },
                  status: 'preparing',
                  created_at: new Date().toISOString()
                };
                
                playPleasantNotificationSound();
                setNewOrderNotification(testOrder);
                
                toast({
                  title: "🧪 Testing Sound",
                  description: "Listen for 15 seconds of beeps",
                  duration: 3000,
                });
              }}
              className="flex items-center justify-start gap-2 group/sidebar py-2 cursor-pointer"
            >
              <Bell className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
              >
                Test Sound
              </motion.span>
            </div>
            <div
              onClick={() => {
                setOpen(false); // Close mobile sidebar
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

      <Dashboard 
        activeTab={activeTab} 
        restaurantId={restaurantId} 
        onNewOrder={handleNewOrder}
        newOrderTrigger={lastNewOrder}
      />
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

const Dashboard = ({ 
  activeTab, 
  restaurantId, 
  onNewOrder,
  newOrderTrigger
}: { 
  activeTab: string; 
  restaurantId: string;
  onNewOrder: (order: Order) => void;
  newOrderTrigger: Order | null;
}) => {
  console.log('🎨 Dashboard render:', { activeTab, hasNewOrder: !!newOrderTrigger });
  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="p-4 md:p-10 md:rounded-tl-2xl border-t md:border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex flex-col gap-4 flex-1 w-full overflow-y-auto">
        {activeTab === "stats" && <StatsOverview restaurantId={restaurantId} />}
        {activeTab === "menu" && <MenuManagement restaurantId={restaurantId} />}
        
        {/* Always render OrderManagement to maintain realtime subscription */}
        <div style={{ display: activeTab === "orders" ? "block" : "none" }}>
          <OrderManagement 
            restaurantId={restaurantId}
            onNewOrder={onNewOrder}
            newOrderTrigger={newOrderTrigger}
            isVisible={activeTab === "orders"}
          />
        </div>
        
        {activeTab === "feedback" && <FeedbackView restaurantId={restaurantId} />}
        {activeTab === "social" && <SocialLinksForm restaurantId={restaurantId} />}
        {activeTab === "qr" && <QRCodeDisplay restaurantId={restaurantId} />}
        {activeTab === "profile" && <RestaurantProfile restaurantId={restaurantId} />}
      </div>
    </div>
  );
};

export default DashboardWithSidebar;
