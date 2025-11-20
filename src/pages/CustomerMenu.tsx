import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Star, Instagram, Facebook, Twitter, Globe, Plus, Minus, X, ChevronDown, Search, Moon, Sun, Menu } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { OrderAnimation } from "@/components/OrderAnimation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MenuItemSkeleton } from "@/components/MenuItemSkeleton";
import { MenuItemCard } from "@/components/ui/menu-item-card";
import { motion } from "framer-motion";

const CustomerMenu = () => {
  const { restaurantId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<any[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [currentOrder, setCurrentOrder] = useState<any>(null); // Keep for backward compatibility
  const [activeOrders, setActiveOrders] = useState<any[]>([]); // NEW: Track multiple orders
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set()); // Track which categories are expanded
  const [searchQuery, setSearchQuery] = useState("");
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [showOrderStatusDialog, setShowOrderStatusDialog] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('customer-menu-theme');
    return saved === 'dark';
  });
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [serviceDisabled, setServiceDisabled] = useState(false);
  const [restaurantContact, setRestaurantContact] = useState<{
    name: string;
    email: string;
    phone: string | null;
  } | null>(null);
  
  const sessionId = useRef(
    localStorage.getItem("session_id") || 
    `session_${restaurantId}_${Date.now()}`
  ).current;

  const formatINR = useCallback((value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0)), []);

  // React Query: Fetch restaurant data with LONG caching (stale for 1 hour)
  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("social_links, name, description, logo_url, is_active, email, phone")
        .eq("id", restaurantId)
        .maybeSingle();
      
      // Check if service is disabled
      if (data && !data.is_active) {
        setServiceDisabled(true);
        setRestaurantContact({
          name: data.name,
          email: data.email,
          phone: data.phone
        });
      }
      
      return data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep for returning customers
    enabled: !!restaurantId,
  });

  // React Query: Fetch menu items with VERY LONG caching for images
  const { data: menuItems = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['menuItems', restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("id, restaurant_id, name, description, price, image_url, is_available, category_id")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    staleTime: 60 * 60 * 1000, // 1 hour - refresh data in background
    gcTime: 180 * 24 * 60 * 60 * 1000, // 180 DAYS (6 months) - keep images cached for regular customers!
    enabled: !!restaurantId,
  });

  // React Query: Fetch categories with LONG caching (stale for 1 hour)
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories', restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_categories")
        .select("id, restaurant_id, name, display_order")
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true });
      return data || [];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep for returning customers
    enabled: !!restaurantId,
  });

  // Mutation: Increment view count (fire and forget)
  const incrementViewMutation = useMutation({
    mutationFn: async () => {
      const { data: currentViews } = await supabase
        .from("menu_views")
        .select("view_count")
        .eq("restaurant_id", restaurantId)
        .single();
      
      if (currentViews) {
        await supabase
          .from("menu_views")
          .update({ view_count: currentViews.view_count + 1 })
          .eq("restaurant_id", restaurantId);
      }
    },
  });

  // Theme toggle effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('--background', '0 0% 0%'); // Pure black
      localStorage.setItem('customer-menu-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.removeProperty('--background');
      localStorage.setItem('customer-menu-theme', 'light');
    }
  }, [isDarkMode]);

  // Splash screen effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // Show splash for 2.5 seconds
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("session_id", sessionId);
    
    if (restaurantId) {
      // Clean up old orders (older than 6 hours)
      cleanupOldOrders();
      
      // Increment view count once on mount
      incrementViewMutation.mutate();
      loadSessionOrder();
    }
  }, [restaurantId]);

  const cleanupOldOrders = () => {
    const orderIdsStr = localStorage.getItem(`orders_${restaurantId}_${sessionId}`);
    const orderTimestampStr = localStorage.getItem(`orders_timestamp_${restaurantId}_${sessionId}`);
    
    if (orderIdsStr && orderTimestampStr) {
      const timestamp = parseInt(orderTimestampStr);
      const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000); // 6 hours in milliseconds
      
      if (timestamp < sixHoursAgo) {
        console.log('🧹 Cleaning up orders older than 6 hours - Fresh session for customer');
        localStorage.removeItem(`orders_${restaurantId}_${sessionId}`);
        localStorage.removeItem(`orders_timestamp_${restaurantId}_${sessionId}`);
        setActiveOrders([]);
        setCurrentOrder(null);
        
        toast({
          title: "🎉 Welcome Back!",
          description: "Ready for a fresh order? Your menu loads instantly from cache!",
          duration: 4000,
        });
      } else {
        const hoursRemaining = Math.ceil((timestamp + (6 * 60 * 60 * 1000) - Date.now()) / (60 * 60 * 1000));
        console.log(`⏰ Orders will be cleared in ${hoursRemaining} hour(s) | Images cached for fast loading`);
      }
    }
  };

  // Start realtime subscription when there are active orders
  useEffect(() => {
    // Only subscribe if we have active orders
    if (activeOrders.length > 0) {
      console.log('🔔 Starting realtime subscription for', activeOrders.length, 'orders');
      const cleanup = subscribeToOrderUpdates();
      return cleanup;
    }
  }, [activeOrders.length, restaurantId, sessionId]);

  // Removed scroll tracking since we're showing one category at a time

  const loadSessionOrder = async () => {
    // Load all orders from localStorage
    const orderIdsStr = localStorage.getItem(`orders_${restaurantId}_${sessionId}`);
    if (orderIdsStr) {
      const orderIds = JSON.parse(orderIdsStr);
      
      // Fetch all orders
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .in("id", orderIds);
      
      if (orders && orders.length > 0) {
        // Separate active and completed orders
        const activeOrdersList = orders.filter(order => 
          order.status === "preparing" || order.status === "pending"
        );
        
        const completedOrdersList = orders.filter(order => 
          order.status === "completed"
        );
        
        // Show ALL orders (active + completed) in the status bar
        setActiveOrders(orders);
        
        // Set the most recent order as currentOrder for backward compatibility
        if (orders.length > 0) {
          const latestOrder = orders[orders.length - 1];
          setCurrentOrder(latestOrder);
          setTableNumber(latestOrder.table_number);
        }
        
        // Show feedback dialog only if ALL orders are completed
        if (completedOrdersList.length > 0 && activeOrdersList.length === 0) {
          setShowFeedback(true);
        }
        
        console.log('📦 Loaded orders:', { active: activeOrdersList.length, completed: completedOrdersList.length });
      }
    }
  };

  const subscribeToOrderUpdates = () => {
    // Subscribe to ALL orders for this restaurant
    const orderIdsStr = localStorage.getItem(`orders_${restaurantId}_${sessionId}`);
    if (!orderIdsStr) return () => {};
    
    const orderIds = JSON.parse(orderIdsStr);
    if (orderIds.length === 0) return () => {};

    console.log('🔔 Setting up realtime subscription for orders:', orderIds);

    const channel = supabase
      .channel(`orders-realtime-${restaurantId}-${sessionId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          // COST OPTIMIZATION: Filter by specific order IDs instead of all restaurant orders
          filter: `id=in.(${orderIds.join(',')})`
        },
        (payload) => {
          console.log('📦 Realtime order update received:', payload);
          console.log('📦 Order IDs in session:', orderIds);
          console.log('📦 Updated order ID:', payload.new.id);
          
          // Check if this order belongs to our session
          if (!orderIds.includes(payload.new.id)) {
            console.log('⏭️ Order not in our session, skipping');
            return;
          }
          
          console.log('✅ Order belongs to session, updating state');
          
          // Update the order in activeOrders array
          setActiveOrders(prev => {
            const updated = prev.map(order => 
              order.id === payload.new.id ? { ...payload.new } : order
            );
            console.log('✅ Updated activeOrders:', updated);
            
            // Check if all orders are completed
            const allCompleted = updated.every(o => o.status === 'completed');
            if (allCompleted && updated.length > 0) {
              console.log('🎉 All orders completed, showing feedback dialog');
              setTimeout(() => setShowFeedback(true), 500);
            }
            
            return updated;
          });
          
          // Update currentOrder if it's the one that changed
          setCurrentOrder(prev => {
            if (prev?.id === payload.new.id) {
              return { ...payload.new };
            }
            return prev;
          });
          
          // Show instant notification based on status change
          if (payload.new.status === "completed" && payload.old.status !== "completed") {
            // Play a sound or vibration if available
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
            
            toast({
              title: "🎉 Order Ready!",
              description: `Order #${payload.new.order_number} is ready for pickup!`,
              duration: 8000,
            });
          } else if (payload.new.status === "preparing" && payload.old.status === "pending") {
            toast({
              title: "👨‍🍳 Order Confirmed",
              description: `Order #${payload.new.order_number} is being prepared`,
              duration: 4000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Realtime subscription status:', status);
      });

    return () => {
      console.log('🔕 Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  };

  const addToCart = useCallback((item: any) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    toast({ title: `${item.name} added to cart` });
  }, [cart, toast]);

  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = (item.quantity || 1) + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  }, [cart]);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
    toast({ title: "Item removed from cart" });
  }, [cart, toast]);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  const placeOrder = async () => {
    if (!tableNumber || cart.length === 0) {
      toast({ 
        title: "Missing information",
        description: "Please enter table number and add items to cart",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('📝 Starting order placement...');
      console.log('Restaurant ID:', restaurantId);
      console.log('Table Number:', tableNumber);
      console.log('Cart items:', cart);

      const orderNum = `ORD${Date.now().toString().slice(-6)}`;
      const orderItems = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        image_url: item.image_url
      }));

      console.log('Order number:', orderNum);
      console.log('Order items:', orderItems);

      // Direct insert (skip RPC for better error messages)
      console.log('💾 Inserting order directly...');
      const { data: newOrder, error: insertError } = await supabase
        .from("orders")
        .insert([{
          restaurant_id: restaurantId,
          table_number: tableNumber,
          items: { items: orderItems },
          order_number: orderNum,
          status: 'preparing'
        }])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw new Error(insertError.message || 'Failed to create order');
      }

      if (!newOrder) {
        throw new Error('No order data returned');
      }

      console.log('✅ Order created:', newOrder);

      // Add to active orders array
      setActiveOrders(prev => [...prev, newOrder]);
      
      // Keep currentOrder for backward compatibility
      setCurrentOrder(newOrder);
      setOrderNumber(orderNum);
      
      // Store all active order IDs in localStorage with timestamp
      const existingOrders = localStorage.getItem(`orders_${restaurantId}_${sessionId}`);
      const orderIds = existingOrders ? JSON.parse(existingOrders) : [];
      orderIds.push(newOrder.id);
      localStorage.setItem(`orders_${restaurantId}_${sessionId}`, JSON.stringify(orderIds));
      
      // Store timestamp for cleanup (only set once for the first order)
      if (!existingOrders) {
        localStorage.setItem(`orders_timestamp_${restaurantId}_${sessionId}`, Date.now().toString());
      }
      
      console.log('✅ Order placed successfully:', newOrder);
      console.log('📦 Active orders:', [...activeOrders, newOrder]);
      console.log('🔔 Realtime subscription will start automatically');
      
      setCart([]);
      setShowCartDialog(false);
      setShowOrderConfirmation(true);
      
      toast({
        title: "🎉 Order placed!",
        description: `Order #${orderNum} is being prepared. You'll get notified when it's ready!`,
        duration: 5000,
      });
    } catch (err: any) {
      console.error("❌ Error placing order:", err);
      console.error("Error details:", {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
      
      toast({
        title: "Failed to create order",
        description: err.message || "Please check your connection and try again.",
        variant: "destructive",
        duration: 6000,
      });
    }
  };

  const submitFeedback = async () => {
    if (!currentOrder?.id) return;

    await supabase.from("feedback").insert([{
      order_id: currentOrder.id,
      restaurant_id: restaurantId,
      rating,
      comment: comment.trim() || null
    }]);
    
    // Clear order history after feedback (images stay cached!)
    localStorage.removeItem(`orders_${restaurantId}_${sessionId}`);
    localStorage.removeItem(`orders_timestamp_${restaurantId}_${sessionId}`);
    
    toast({ 
      title: "Thank you for your feedback!",
      description: "Come back anytime - your menu will load instantly!",
      duration: 4000,
    });
    setShowFeedback(false);
    setCurrentOrder(null);
    setActiveOrders([]);
    setRating(0);
    setComment("");
  };

  // Memoize expensive computations
  const groupedItems = useMemo(() => {
    return categories.reduce((acc, category) => {
      acc[category.id] = menuItems.filter(item => item.category_id === category.id);
      return acc;
    }, {} as Record<string, any[]>);
  }, [categories, menuItems]);
  
  const uncategorizedItems = useMemo(() => 
    menuItems.filter(item => !item.category_id), 
    [menuItems]
  );
  
  const visibleCategories = useMemo(() => {
    const cats = categories.filter(cat => groupedItems[cat.id]?.length > 0);
    // If a category filter is selected, show only that category
    if (selectedCategoryFilter) {
      return cats.filter(cat => cat.id === selectedCategoryFilter);
    }
    return cats;
  }, [categories, groupedItems, selectedCategoryFilter]);

  // Expand first category by default
  useEffect(() => {
    if (visibleCategories.length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set([visibleCategories[0].id]));
    }
  }, [visibleCategories]);
  
  const totalPrice = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0), 
    [cart]
  );
  
  const totalItems = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.quantity || 1), 0), 
    [cart]
  );

  const restaurantName = restaurant?.name || "Our Menu";
  const restaurantDescription = restaurant?.description || "";
  const socialLinks = (restaurant?.social_links as any) || null;

  // Splash Screen
  if (showSplash) {
    const logoUrl = restaurant?.logo_url;
    
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background">
        <div className="text-center space-y-8 animate-in zoom-in-95 fade-in duration-700">
          {/* Premium Logo Container */}
          <div className="relative w-40 h-40 mx-auto">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative w-full h-full bg-card rounded-full flex items-center justify-center shadow-2xl border-2 border-primary/10 overflow-hidden">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={restaurantName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-7xl">🍽️</span>
              )}
            </div>
          </div>
          
          {/* Restaurant Name */}
          <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-700" style={{ animationDelay: '200ms' }}>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              {restaurantName}
            </h1>
            <p className="text-muted-foreground text-base">Loading your menu...</p>
          </div>
          
          {/* Elegant Loading Dots */}
          <div className="flex gap-2 justify-center animate-in fade-in duration-500" style={{ animationDelay: '400ms' }}>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Service Disabled Screen
  if (serviceDisabled && restaurantContact) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Service Unavailable</h1>
            <p className="text-muted-foreground">
              {restaurantContact.name}'s digital menu is currently unavailable.
            </p>
          </div>
          
          <div className="bg-muted p-6 rounded-lg mb-6">
            <h2 className="font-semibold mb-3 text-lg">Contact Restaurant</h2>
            <p className="text-sm text-muted-foreground">
              Please contact <span className="font-semibold text-foreground">{restaurantContact.name}</span> directly for menu and ordering information.
            </p>
          </div>
          
          <p className="text-xs text-muted-foreground">
            We apologize for the inconvenience.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-background to-muted/30 ${currentOrder && currentOrder.status === "preparing" ? "pb-16 sm:pb-20" : "pb-8"}`}>
      {/* Theme Toggle - Fixed Top Left */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="rounded-full shadow-lg bg-card/95 backdrop-blur-sm"
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      {/* Menu Categories Button - Fixed Bottom Left, moves up when order bar is visible */}
      <div className={`fixed left-4 z-[110] transition-all duration-300 ${activeOrders.length > 0 ? 'bottom-20 sm:bottom-24' : 'bottom-4'}`}>
        <Button
          variant="default"
          size="lg"
          onClick={() => setShowCategoryMenu(true)}
          className="rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-6 h-auto"
        >
          <Menu className="h-5 w-5 mr-2" />
          <span className="font-semibold">Categories</span>
        </Button>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
            {restaurantName || "Our Menu"}
          </h1>
          {restaurantDescription && (
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2">
              {restaurantDescription}
            </p>
          )}
        </motion.div>

        {/* Category Filter Badge */}
        {selectedCategoryFilter && (
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Showing: {categories.find(c => c.id === selectedCategoryFilter)?.name}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategoryFilter(null)}
              className="h-7 text-xs"
            >
              Show All
            </Button>
          </div>
        )}
        
        {/* Accordion Style Categories */}
        <div className="space-y-4">
          {visibleCategories.map((category, categoryIndex) => {
            const isExpanded = expandedCategories.has(category.id);
            const categoryItems = groupedItems[category.id] || [];
            const filteredItems = categoryItems;

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1 }}
                className="border border-border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Category Header - Clickable */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">{category.name.charAt(0)}</span>
                    </div>
                    <div className="text-left">
                      <h2 className="text-lg sm:text-xl font-bold text-foreground">
                        {category.name}
                      </h2>
                      <p className="text-xs text-muted-foreground">{filteredItems.length} items</p>
                    </div>
                  </div>
                  <ChevronDown 
                    className={`h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground transition-transform duration-300 group-hover:text-foreground ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Category Items - Collapsible with smooth animation */}
                <div 
                  className={`border-t border-border overflow-hidden transition-all ${
                    isExpanded 
                      ? 'max-h-[10000px] opacity-100 duration-700 ease-out' 
                      : 'max-h-0 opacity-0 border-t-0 duration-500 ease-in'
                  }`}
                  style={{
                    transitionProperty: 'max-height, opacity, border-width',
                    transitionTimingFunction: isExpanded 
                      ? 'cubic-bezier(0.4, 0, 0.2, 1)' 
                      : 'cubic-bezier(0.4, 0, 1, 1)'
                  }}
                >
                  {isExpanded && (
                    <div className="p-4 sm:p-6 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {isLoadingItems ? (
                        Array.from({ length: 3 }).map((_, i) => <MenuItemSkeleton key={i} />)
                      ) : (
                        filteredItems.map((item: any, index: number) => (
                          <MenuItemCard
                            key={item.id}
                            imageUrl={item.image_url}
                            name={item.name}
                            price={item.price}
                            quantity={item.description || ""}
                            onAdd={() => addToCart(item)}
                            isAvailable={item.is_available}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {uncategorizedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 sm:mb-12 mt-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">+</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">More Items</h2>
            </div>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {uncategorizedItems.map((item: any, index: number) => (
                <MenuItemCard
                  key={item.id}
                  imageUrl={item.image_url}
                  name={item.name}
                  price={item.price}
                  quantity={item.description || ""}
                  onAdd={() => addToCart(item)}
                  isAvailable={item.is_available}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Floating Cart Button - Top Right */}
      {cart.length > 0 && (
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[110]">
          <Button 
            variant="hero" 
            size="lg"
            onClick={() => setShowCartDialog(true)}
            className="rounded-full shadow-2xl hover:scale-110 transition-all text-sm sm:text-base px-4 sm:px-6 py-3 sm:py-4 h-auto font-semibold"
          >
            <ShoppingCart className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
            <span className="flex flex-col items-start">
              <span className="text-xs opacity-90">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
              <span className="font-bold">{formatINR(totalPrice)}</span>
            </span>
          </Button>
        </div>
      )}

      {/* Current Order Status - Persistent Bottom Bar (Multiple Orders Support) */}
      {activeOrders.length > 0 && (
        <div 
          className={`fixed bottom-0 left-0 right-0 z-[100] border-t-2 shadow-lg cursor-pointer transition-all ${
            activeOrders.every(o => o.status === "completed")
              ? 'bg-gradient-to-r from-green-600 to-green-700 border-green-400 hover:from-green-700 hover:to-green-800'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-400 hover:from-blue-700 hover:to-blue-800'
          }`}
          onClick={() => setShowOrderStatusDialog(true)}
        >
          <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {!activeOrders.every(o => o.status === "completed") && (
                  <div className="animate-pulse flex-shrink-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8">
                      <OrderAnimation />
                    </div>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {activeOrders.length === 1 ? (
                    <>
                      <p className="font-semibold text-white text-xs sm:text-sm truncate">
                        Order #{activeOrders[0].order_number} - Table {activeOrders[0].table_number}
                      </p>
                      <p className="text-xs text-white/80 hidden sm:block">
                        {activeOrders[0].status === "completed" ? "Order completed!" : "Preparing your order..."}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-white text-xs sm:text-sm truncate">
                        {activeOrders.length} Orders - Table {activeOrders[0].table_number}
                      </p>
                      <p className="text-xs text-white/80 hidden sm:block">
                        {activeOrders.filter(o => o.status === "completed").length} completed, {activeOrders.filter(o => o.status !== "completed").length} preparing
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0">
                <Badge className={`border-0 text-xs font-semibold px-2 sm:px-3 py-1 mb-1 ${
                  activeOrders.every(o => o.status === "completed")
                    ? 'bg-white/90 text-green-700'
                    : 'bg-white/90 text-blue-700'
                }`}>
                  {activeOrders.every(o => o.status === "completed") ? "Completed" : "Preparing"}
                </Badge>
                <span className="text-white text-xs font-bold">
                  {formatINR(activeOrders.reduce((sum, order) => {
                    const orderTotal = order.items?.items?.reduce((itemSum: number, item: any) => 
                      itemSum + (item.price * (item.quantity || 1)), 0) || 0;
                    return sum + orderTotal;
                  }, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Status Dialog - Shows All Active Orders */}
      <Dialog open={showOrderStatusDialog} onOpenChange={setShowOrderStatusDialog}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-lg sm:text-xl md:text-2xl">
              {activeOrders.length === 1 ? 'Order Status' : `${activeOrders.length} Active Orders`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
            <div className="bg-blue-500/10 rounded-lg p-4 sm:p-6 text-center">
              <div className="flex justify-center mb-3 sm:mb-4">
                <OrderAnimation />
              </div>
              <p className="font-semibold text-lg sm:text-xl text-blue-700 dark:text-blue-400">
                Your orders are being prepared
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Table {activeOrders[0]?.table_number}
              </p>
            </div>

            {/* Show all orders with their status */}
            <div className="space-y-3">
              {activeOrders.map((order, idx) => (
                <div key={order.id} className={`rounded-lg p-3 sm:p-4 ${
                  order.status === "completed" 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : 'bg-muted/50'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-sm sm:text-base">Order #{order.order_number}</h4>
                    <Badge className={
                      order.status === "completed"
                        ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50"
                        : "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                    }>
                      {order.status === "completed" ? "✅ Completed" : order.status === "preparing" ? "Preparing" : "Pending"}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                    {order.items?.items?.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name} {item.quantity > 1 && `x${item.quantity}`}</span>
                        <span>{formatINR(item.price * (item.quantity || 1))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold text-foreground pt-1 border-t">
                      <span>Subtotal</span>
                      <span>{formatINR(order.items?.items?.reduce((sum: number, item: any) => 
                        sum + (item.price * (item.quantity || 1)), 0) || 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total for all orders */}
            {activeOrders.length > 1 && (
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Total for all orders</p>
                <p className="text-2xl font-bold text-primary">
                  {formatINR(activeOrders.reduce((sum, order) => {
                    const orderTotal = order.items?.items?.reduce((itemSum: number, item: any) => 
                      itemSum + (item.price * (item.quantity || 1)), 0) || 0;
                    return sum + orderTotal;
                  }, 0))}
                </p>
              </div>
            )}
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowOrderStatusDialog(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cart Dialog */}
      <Dialog open={showCartDialog} onOpenChange={setShowCartDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Your Cart ({totalItems} items)</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] sm:max-h-[60vh]">
            <div className="space-y-3 sm:space-y-4">
              {cart.map(item => (
                <Card key={item.id} className="p-3 sm:p-4">
                  <div className="flex gap-3 sm:gap-4">
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base truncate">{item.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">{formatINR(item.price)}</p>
                      <div className="flex items-center gap-1 sm:gap-2 mt-2">
                        <Button 
                          size="icon" 
                          variant="outline"
                          className="h-6 w-6 sm:h-7 sm:w-7"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-2 w-2 sm:h-3 sm:w-3" />
                        </Button>
                        <span className="w-6 sm:w-8 text-center font-semibold text-sm">{item.quantity || 1}</span>
                        <Button 
                          size="icon" 
                          variant="outline"
                          className="h-6 w-6 sm:h-7 sm:w-7"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-2 w-2 sm:h-3 sm:w-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-6 w-6 sm:h-7 sm:w-7 ml-auto"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-primary text-sm sm:text-base">
                        {formatINR(item.price * (item.quantity || 1))}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
          <div className="border-t pt-3 sm:pt-4 space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center text-base sm:text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{formatINR(totalPrice)}</span>
            </div>
            <div>
              <Label className="text-sm sm:text-base">Table Number</Label>
              <Input 
                value={tableNumber} 
                onChange={(e) => setTableNumber(e.target.value)} 
                placeholder="Enter table number"
                className="text-sm sm:text-base h-9 sm:h-10"
              />
            </div>
            <Button 
              variant="hero" 
              className="w-full text-sm sm:text-base h-10 sm:h-11"
              onClick={placeOrder} 
              disabled={!tableNumber}
            >
              Place Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Confirmation Dialog */}
      <Dialog open={showOrderConfirmation} onOpenChange={setShowOrderConfirmation}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-center text-lg sm:text-xl md:text-2xl">Order Confirmed!</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 sm:space-y-6 py-2 sm:py-4">
            <div className="space-y-1 sm:space-y-2">
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">#{orderNumber}</p>
              <p className="text-sm sm:text-base text-muted-foreground">Table {tableNumber}</p>
            </div>
            
            <div className="bg-blue-500/10 rounded-lg p-4 sm:p-6">
              <OrderAnimation />
              <p className="font-semibold text-base sm:text-lg mt-3 sm:mt-4 text-blue-700 dark:text-blue-400">
                Your order is being prepared
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                We'll notify you when it's ready
              </p>
            </div>
            
            <Button 
              variant="hero" 
              className="w-full text-sm sm:text-base h-10 sm:h-11"
              onClick={() => {
                setShowOrderConfirmation(false);
              }}
            >
              Continue Browsing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        
      {/* Category Menu Dialog */}
      <Dialog open={showCategoryMenu} onOpenChange={setShowCategoryMenu}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Menu Categories</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 py-2">
              {/* Show All Option */}
              <button
                onClick={() => {
                  setSelectedCategoryFilter(null);
                  setShowCategoryMenu(false);
                }}
                className={`w-full text-left rounded-lg p-4 transition-all ${
                  selectedCategoryFilter === null 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'bg-card hover:bg-muted/50 border border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    selectedCategoryFilter === null 
                      ? 'bg-white/20' 
                      : 'bg-primary/10'
                  }`}>
                    <Menu className={`h-6 w-6 ${
                      selectedCategoryFilter === null 
                        ? 'text-white' 
                        : 'text-primary'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base">All Categories</p>
                    <p className={`text-xs ${
                      selectedCategoryFilter === null 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {menuItems.length} items
                    </p>
                  </div>
                </div>
              </button>

              {/* Individual Categories */}
              {categories.filter(cat => groupedItems[cat.id]?.length > 0).map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategoryFilter(category.id);
                    setExpandedCategories(new Set([category.id]));
                    setShowCategoryMenu(false);
                  }}
                  className={`w-full text-left rounded-lg p-4 transition-all ${
                    selectedCategoryFilter === category.id 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'bg-card hover:bg-muted/50 border border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      selectedCategoryFilter === category.id 
                        ? 'bg-white/20' 
                        : 'bg-primary/10'
                    }`}>
                      <span className="text-2xl">🍽️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate">{category.name}</p>
                      <p className={`text-xs ${
                        selectedCategoryFilter === category.id 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {groupedItems[category.id]?.length || 0} items
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Rate Your Experience</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex justify-center gap-1 sm:gap-2">
              {[1,2,3,4,5].map(star => (
                <Star 
                  key={star} 
                  className={`h-8 w-8 sm:h-10 sm:w-10 cursor-pointer transition-all active:scale-90 ${star <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} 
                  onClick={() => setRating(star)} 
                />
              ))}
            </div>
            <Textarea 
              placeholder="Comments (optional)" 
              value={comment} 
              onChange={(e) => setComment(e.target.value)} 
              rows={4}
              className="text-sm sm:text-base"
            />
            <Button variant="hero" className="w-full text-sm sm:text-base h-10 sm:h-11" onClick={submitFeedback} disabled={rating === 0}>
              Submit Feedback
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {socialLinks && (
        <div className="container mx-auto px-4 py-8 border-t mt-8">
          <h3 className="text-center text-lg font-semibold mb-4">Follow Us</h3>
          <div className="flex justify-center gap-6">
            {socialLinks.instagram && (
              <a 
                href={socialLinks.instagram} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="group transition-transform hover:scale-110"
                aria-label="Instagram"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Instagram className="h-6 w-6 text-white" />
                </div>
              </a>
            )}
            {socialLinks.facebook && (
              <a 
                href={socialLinks.facebook} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="group transition-transform hover:scale-110"
                aria-label="Facebook"
              >
                <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Facebook className="h-6 w-6 text-white" />
                </div>
              </a>
            )}
            {socialLinks.twitter && (
              <a 
                href={socialLinks.twitter} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="group transition-transform hover:scale-110"
                aria-label="Twitter"
              >
                <div className="w-12 h-12 rounded-full bg-black dark:bg-white flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Twitter className="h-6 w-6 text-white dark:text-black" />
                </div>
              </a>
            )}
            {socialLinks.website && (
              <a 
                href={socialLinks.website} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="group transition-transform hover:scale-110"
                aria-label="Website"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <Globe className="h-6 w-6 text-white" />
                </div>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;