import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, LogOut, Menu as MenuIcon, Package, MessageSquare, BarChart3, Share2, Settings, Bell, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [newOrderNotification, setNewOrderNotification] = useState<Order | null>(null);
  const [lastViewCount, setLastViewCount] = useState(0);
  const [isRestaurantDisabled, setIsRestaurantDisabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const subscribeToMenuViews = () => {
    if (!restaurantId) return;

    console.log('👀 Setting up QR scan notifications...');

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
          console.log('👁️ Menu view update received!', payload);
          const newViewCount = payload.new.view_count;
          
          if (newViewCount > lastViewCount) {
            console.log('📱 New QR scan detected!');
            setLastViewCount(newViewCount);
            
            toast({
              title: "👁️ New Customer!",
              description: `Someone just scanned your QR code!`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('👀 Menu views subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ QR scan notifications active!');
        }
      });

    return () => {
      console.log('🧹 Cleaning up menu views subscription');
      supabase.removeChannel(channel);
    };
  };

  const lastOrderCountRef = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (restaurantId) {
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
            console.log('📊 Initial view count:', data.view_count);
          }
        });
      
      // Fallback: Poll for new orders every 3 seconds
      console.log('🔄 Starting polling fallback...');
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from("orders")
            .select("id, order_number, table_number, items, status, created_at")
            .eq("restaurant_id", restaurantId)
            .order("created_at", { ascending: false });
          
          if (error) {
            console.error('❌ Polling error:', error);
            return;
          }
          
          if (data && data.length > lastOrderCountRef.current) {
            console.log('🆕 New order detected via polling!');
            const newOrders = data.slice(0, data.length - lastOrderCountRef.current);
            
            newOrders.forEach((order) => {
              console.log('📦 Processing new order from polling:', order);
              
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
          console.error('❌ Polling exception:', err);
        }
      }, 3000); // Poll every 3 seconds
      
      return () => {
        if (cleanupOrders) cleanupOrders();
        if (cleanupViews) cleanupViews();
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [restaurantId]);

  const playPleasantNotificationSound = () => {
    console.log('🔔 Playing 15-second notification sound...');
    
    // Stop any existing sound
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
    }

    // Create audio context if not exists
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    
    // Resume audio context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    let beepCount = 0;
    const maxBeeps = 30; // 30 beeps over 15 seconds (one every 0.5 seconds)

    const playBeep = () => {
      if (beepCount >= maxBeeps) {
        if (soundIntervalRef.current) {
          clearInterval(soundIntervalRef.current);
        }
        console.log('✅ Finished playing notification sound');
        return;
      }

      console.log(`🔔 Beep ${beepCount + 1}/${maxBeeps}`);

      // Create a clear, audible beep sound
      const now = audioContext.currentTime;
      
      // Main beep tone
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = 880; // A5 note - clear and audible
      osc.type = 'sine';
      
      // Beep envelope (quick attack, quick decay)
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.01); // Quick attack
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15); // Quick decay
      
      osc.start(now);
      osc.stop(now + 0.15);

      beepCount++;
    };

    // Play first beep immediately
    playBeep();

    // Continue playing beeps every 0.5 seconds for 15 seconds
    soundIntervalRef.current = setInterval(playBeep, 500);
  };

  const dismissNotification = () => {
    setNewOrderNotification(null);
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
    }
  };

  const subscribeToNewOrders = () => {
    if (!restaurantId) {
      console.log('❌ No restaurant ID, cannot subscribe');
      return;
    }

    console.log('🔔 Setting up global order notifications for restaurant:', restaurantId);
    console.log('📡 Creating realtime channel...');

    // Create a unique channel name with timestamp
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
          console.log('🎉🎉🎉 NEW ORDER RECEIVED ON DASHBOARD!', payload);
          console.log('📦 Order data:', payload.new);
          
          const newOrder = payload.new as Order;
          
          setNewOrdersCount(prev => {
            const newCount = prev + 1;
            console.log('📊 New orders count:', newCount);
            return newCount;
          });
          
          setNewOrderNotification(newOrder);
          
          console.log('🔊 Playing notification sound...');
          // Play notification sound
          playPleasantNotificationSound();
          
          toast({
            title: "🔔 New Order!",
            description: `Order #${newOrder.order_number} from Table ${newOrder.table_number}`,
            duration: 10000,
          });
        }
      )
      .subscribe((status, err) => {
        console.log('🔔 Dashboard subscription status:', status);
        if (err) {
          console.error('❌ Subscription error:', err);
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('✅✅✅ GLOBAL NOTIFICATIONS ACTIVE!');
          console.log('👂 Listening for new orders on restaurant:', restaurantId);
          toast({
            title: "✅ Connected",
            description: "Listening for new orders...",
            duration: 3000,
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error');
          toast({
            title: "⚠️ Connection Error",
            description: "Failed to connect to realtime. Please refresh.",
            variant: "destructive",
          });
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Connection timed out');
        } else if (status === 'CLOSED') {
          console.log('🔕 Channel closed');
        }
      });

    return () => {
      console.log('🧹 Cleaning up dashboard subscription');
      supabase.removeChannel(channel);
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  };

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Get restaurant data
      const { data: restaurant, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (error) throw error;

      setRestaurantId(restaurant.id);
      setRestaurantName(restaurant.name);
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

  // Restaurant Disabled Screen
  if (isRestaurantDisabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-2xl w-full p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Service Temporarily Paused</h1>
            <p className="text-lg text-muted-foreground">
              {restaurantName}
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
            <h2 className="font-bold text-lg mb-3 text-blue-900 dark:text-blue-100">
              📋 Account Status Update
            </h2>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-4 leading-relaxed">
              Dear valued partner, your restaurant's digital menu service is currently on hold. We appreciate your business and would love to continue serving you. To reactivate your account and resume operations, please complete the payment process at your earliest convenience.
            </p>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-5 border border-blue-300 dark:border-blue-700">
              <p className="text-sm font-semibold mb-3 text-foreground">
                💬 For Payment & Account Reactivation:
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Please reach out to us via WhatsApp. Our team will assist you with the payment process and reactivate your account promptly.
              </p>
              <a
                href="https://wa.me/917005832798"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 w-full sm:w-auto"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span>Contact Us on WhatsApp</span>
              </a>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                📞 +91 70058 32798
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-xs text-center text-muted-foreground">
              We value your partnership and look forward to serving you again soon. Thank you for your understanding and cooperation.
            </p>
          </div>

          <div className="text-center">
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Global New Order Notification Popup */}
      {newOrderNotification && (
        <Card className="fixed top-4 right-4 z-[100] w-96 shadow-2xl border-2 border-primary animate-in slide-in-from-top-4 duration-500">
          <CardHeader className="pb-3 bg-primary/5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center animate-pulse">
                  <Bell className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">🔔 New Order!</CardTitle>
                  <p className="text-sm text-muted-foreground">Order #{newOrderNotification.order_number}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={dismissNotification}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Table Number:</span>
                <Badge variant="default" className="text-base px-3 py-1">
                  {newOrderNotification.table_number}
                </Badge>
              </div>
              <div className="border-t pt-3">
                <p className="text-sm font-medium mb-2">Items:</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {newOrderNotification.items?.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.name} x{item.quantity || 1}</span>
                      <span>₹{(item.price * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                onClick={dismissNotification}
                className="w-full mt-4"
                variant="default"
              >
                Got it! View Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{restaurantName}</h1>
              <p className="text-sm text-muted-foreground">Restaurant Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Test Sound Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
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
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Test Sound</span>
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="menu" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="menu" className="gap-2">
              <MenuIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Menu</span>
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="gap-2 relative"
              onClick={() => setNewOrdersCount(0)}
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
              {newOrdersCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {newOrdersCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Feedback</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-2">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Social</span>
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-2">
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">QR Code</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="animate-fade-in">
            <StatsOverview restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="menu" className="animate-fade-in">
            <MenuManagement restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="orders" className="animate-fade-in">
            <OrderManagement restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="feedback" className="animate-fade-in">
            <FeedbackView restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="social" className="animate-fade-in">
            <SocialLinksForm restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="qr" className="animate-fade-in">
            <QRCodeDisplay restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="profile" className="animate-fade-in">
            <RestaurantProfile restaurantId={restaurantId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;