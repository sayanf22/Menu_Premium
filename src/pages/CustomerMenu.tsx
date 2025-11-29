import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ShoppingCart, Star, Plus, Minus, X, Search, Moon, Sun, ChefHat, Clock, 
  CheckCircle2, ArrowRight, Utensils, Sparkles, Salad, UtensilsCrossed, 
  Coffee, IceCream, Wine, Soup, Pizza, Sandwich, Flame, Leaf, Fish, Beef, Cookie,
  Instagram, Facebook, Twitter, Globe
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { isRateLimited, RATE_LIMITS, isValidUUID, isValidTableNumber, sanitizeInput, getClientFingerprint } from "@/lib/security";

// Animation configs
const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };
const bounceConfig = { type: "spring" as const, stiffness: 500, damping: 25, mass: 0.8 };

// Category icon mapping - using Lucide icons
const getCategoryIcon = (name: string) => {
  const lower = name.toLowerCase().trim();
  if (lower.includes('starter') || lower.includes('appetizer') || lower.includes('salad')) return Salad;
  if (lower.includes('main') || lower.includes('course') || lower.includes('entree')) return UtensilsCrossed;
  if (lower.includes('dessert') || lower.includes('sweet') || lower.includes('ice')) return IceCream;
  if (lower.includes('drink') || lower.includes('beverage') || lower.includes('juice')) return Coffee;
  if (lower.includes('soup')) return Soup;
  if (lower.includes('pizza')) return Pizza;
  if (lower.includes('burger') || lower.includes('sandwich')) return Sandwich;
  if (lower.includes('grill') || lower.includes('bbq') || lower.includes('tandoor')) return Flame;
  if (lower.includes('veg') || lower.includes('vegetarian')) return Leaf;
  if (lower.includes('fish') || lower.includes('seafood')) return Fish;
  if (lower.includes('chicken') || lower.includes('mutton') || lower.includes('meat')) return Beef;
  if (lower.includes('snack') || lower.includes('cookie')) return Cookie;
  if (lower.includes('wine') || lower.includes('alcohol')) return Wine;
  return Utensils;
};

// Category colors
const categoryColors = [
  { bg: 'from-orange-500 to-red-500', light: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
  { bg: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'from-violet-500 to-purple-500', light: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  { bg: 'from-amber-500 to-yellow-500', light: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  { bg: 'from-pink-500 to-rose-500', light: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400' },
  { bg: 'from-cyan-500 to-blue-500', light: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
];

// Cooking Animation Component
const CookingAnimation = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = { sm: "w-12 h-12", md: "w-20 h-20", lg: "w-28 h-28" };
  const potSize = { sm: "w-8 h-6", md: "w-14 h-10", lg: "w-20 h-14" };
  const steamSize = { sm: "w-1", md: "w-1.5", lg: "w-2" };
  
  return (
    <div className={`relative ${sizeClasses[size]} flex items-end justify-center`}>
      {/* Pot */}
      <motion.div 
        className={`${potSize[size]} bg-gradient-to-b from-zinc-600 to-zinc-700 rounded-b-full relative`}
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        {/* Pot rim */}
        <div className="absolute -top-1 left-0 right-0 h-2 bg-zinc-500 rounded-t-sm" />
        {/* Pot handles */}
        <div className="absolute top-0 -left-2 w-2 h-3 bg-zinc-500 rounded-l-full" />
        <div className="absolute top-0 -right-2 w-2 h-3 bg-zinc-500 rounded-r-full" />
      </motion.div>
      
      {/* Steam particles */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`absolute ${steamSize[size]} bg-white/60 rounded-full`}
          style={{ left: `${30 + i * 20}%` }}
          initial={{ y: 0, opacity: 0, scale: 0.5 }}
          animate={{ 
            y: [-10, -40], 
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.2, 0.8],
            x: [0, (i - 1) * 8]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            delay: i * 0.3,
            ease: "easeOut"
          }}
        />
      ))}
      
      {/* Bubbles in pot */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`bubble-${i}`}
          className="absolute w-1.5 h-1.5 bg-amber-400/60 rounded-full"
          style={{ left: `${35 + i * 15}%`, bottom: '20%' }}
          animate={{ 
            y: [0, -8, 0],
            scale: [0.8, 1.2, 0.8],
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{ 
            duration: 0.8, 
            repeat: Infinity, 
            delay: i * 0.25 
          }}
        />
      ))}
      
      {/* Fire/heat under pot */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={`fire-${i}`}
            className="w-2 h-3 bg-gradient-to-t from-red-500 via-orange-400 to-yellow-300 rounded-full"
            animate={{ 
              scaleY: [1, 1.3, 1],
              scaleX: [1, 0.8, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ 
              duration: 0.4, 
              repeat: Infinity, 
              delay: i * 0.15 
            }}
          />
        ))}
      </div>
    </div>
  );
};

const CustomerMenu = () => {
  const { restaurantId } = useParams();
  const { toast } = useToast();
  const [cart, setCart] = useState<any[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [showOrderStatusDialog, setShowOrderStatusDialog] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('customer-menu-theme') === 'dark');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [serviceDisabled, setServiceDisabled] = useState(false);
  const [restaurantContact, setRestaurantContact] = useState<{ name: string; email: string; phone: string | null; } | null>(null);
  const [imageLoaded, setImageLoaded] = useState<Record<string, boolean>>({});
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const sessionId = useRef(localStorage.getItem("session_id") || `session_${restaurantId}_${Date.now()}`).current;

  const formatINR = useCallback((value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0)), []);

  // Queries
  const { data: restaurant } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("social_links, name, description, logo_url, is_active, email, phone")
        .eq("id", restaurantId)
        .maybeSingle();
      if (data && !data.is_active) {
        setServiceDisabled(true);
        setRestaurantContact({ name: data.name, email: data.email, phone: data.phone });
      }
      return data;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    enabled: !!restaurantId,
  });

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
    staleTime: 60 * 60 * 1000,
    gcTime: 180 * 24 * 60 * 60 * 1000,
    enabled: !!restaurantId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_categories")
        .select("id, restaurant_id, name, display_order")
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true });
      return data || [];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    enabled: !!restaurantId,
  });

  const incrementViewMutation = useMutation({
    mutationFn: async () => {
      const { data: currentViews } = await supabase.from("menu_views").select("view_count").eq("restaurant_id", restaurantId).single();
      if (currentViews) {
        await supabase.from("menu_views").update({ view_count: currentViews.view_count + 1 }).eq("restaurant_id", restaurantId);
      }
    },
  });

  // Dark mode with pure black
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('--background', '0 0% 0%');
      document.body.style.backgroundColor = '#000000';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.removeProperty('--background');
      document.body.style.backgroundColor = '';
    }
    localStorage.setItem('customer-menu-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("session_id", sessionId);
    if (restaurantId) {
      cleanupOldOrders();
      incrementViewMutation.mutate();
      loadSessionOrder();
    }
  }, [restaurantId]);

  useEffect(() => {
    if (activeOrders.length > 0) {
      const cleanup = subscribeToOrderUpdates();
      return cleanup;
    }
  }, [activeOrders.length, restaurantId, sessionId]);

  const cleanupOldOrders = () => {
    const orderIdsStr = localStorage.getItem(`orders_${restaurantId}_${sessionId}`);
    const orderTimestampStr = localStorage.getItem(`orders_timestamp_${restaurantId}_${sessionId}`);
    if (orderIdsStr && orderTimestampStr) {
      const timestamp = parseInt(orderTimestampStr);
      if (timestamp < Date.now() - 6 * 60 * 60 * 1000) {
        localStorage.removeItem(`orders_${restaurantId}_${sessionId}`);
        localStorage.removeItem(`orders_timestamp_${restaurantId}_${sessionId}`);
        setActiveOrders([]);
        setCurrentOrder(null);
      }
    }
  };

  const loadSessionOrder = async () => {
    const orderIdsStr = localStorage.getItem(`orders_${restaurantId}_${sessionId}`);
    if (orderIdsStr) {
      const orderIds = JSON.parse(orderIdsStr);
      const { data: orders } = await supabase.from("orders").select("*").in("id", orderIds);
      if (orders && orders.length > 0) {
        setActiveOrders(orders);
        setCurrentOrder(orders[orders.length - 1]);
        setTableNumber(orders[orders.length - 1].table_number);
        const allCompleted = orders.every(o => o.status === "completed");
        const hasActive = orders.some(o => o.status === "preparing" || o.status === "pending");
        if (allCompleted && !hasActive) setShowFeedback(true);
      }
    }
  };

  const subscribeToOrderUpdates = () => {
    const orderIdsStr = localStorage.getItem(`orders_${restaurantId}_${sessionId}`);
    if (!orderIdsStr) return () => {};
    const orderIds = JSON.parse(orderIdsStr);
    if (orderIds.length === 0) return () => {};

    const channel = supabase
      .channel(`orders-realtime-${restaurantId}-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=in.(${orderIds.join(',')})` }, (payload) => {
        if (!orderIds.includes(payload.new.id)) return;
        setActiveOrders(prev => {
          const updated = prev.map(order => order.id === payload.new.id ? { ...payload.new } : order);
          if (updated.every(o => o.status === 'completed')) setTimeout(() => setShowFeedback(true), 500);
          return updated;
        });
        setCurrentOrder(prev => prev?.id === payload.new.id ? { ...payload.new } : prev);
        if (payload.new.status === "completed" && payload.old.status !== "completed") {
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
          toast({ title: "🎉 Order Ready!", description: `Order #${payload.new.order_number} is ready!`, duration: 8000 });
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  };

  // Cart functions
  const getCartItemQuantity = useCallback((itemId: string) => cart.find(i => i.id === itemId)?.quantity || 0, [cart]);
  
  const addToCart = useCallback((item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: (i.quantity || 1) + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = (item.quantity || 1) + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  }, []);

  const removeFromCart = useCallback((itemId: string) => setCart(prev => prev.filter(item => item.id !== itemId)), []);


  const placeOrder = async () => {
    if (!tableNumber || cart.length === 0) {
      toast({ title: "Missing information", description: "Please enter table number and add items", variant: "destructive" });
      return;
    }
    if (!isValidTableNumber(tableNumber)) {
      toast({ title: "Invalid table number", description: "Table number must be alphanumeric (max 10 chars)", variant: "destructive" });
      return;
    }
    if (!restaurantId || !isValidUUID(restaurantId)) {
      toast({ title: "Invalid restaurant", description: "Please scan a valid QR code", variant: "destructive" });
      return;
    }
    if (isRateLimited(`order_${getClientFingerprint()}`, RATE_LIMITS.order)) {
      toast({ title: "Too many orders", description: "Please wait before placing another order", variant: "destructive" });
      return;
    }

    try {
      const orderNum = `ORD${Date.now().toString().slice(-6)}`;
      const orderItems = cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity || 1, image_url: item.image_url }));
      const { data: newOrder, error } = await supabase
        .from("orders")
        .insert([{ restaurant_id: restaurantId, table_number: tableNumber, items: { items: orderItems }, order_number: orderNum, status: 'preparing' }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      if (!newOrder) throw new Error('No order data returned');

      setActiveOrders(prev => [...prev, newOrder]);
      setCurrentOrder(newOrder);
      setOrderNumber(orderNum);
      
      const existingOrders = localStorage.getItem(`orders_${restaurantId}_${sessionId}`);
      const orderIds = existingOrders ? JSON.parse(existingOrders) : [];
      orderIds.push(newOrder.id);
      localStorage.setItem(`orders_${restaurantId}_${sessionId}`, JSON.stringify(orderIds));
      if (!existingOrders) localStorage.setItem(`orders_timestamp_${restaurantId}_${sessionId}`, Date.now().toString());
      
      setCart([]);
      setShowCartDialog(false);
      setShowOrderConfirmation(true);
      toast({ title: "🎉 Order placed!", description: `Order #${orderNum} is being prepared!`, duration: 5000 });
    } catch (err: any) {
      toast({ title: "Failed to create order", description: err.message || "Please try again.", variant: "destructive" });
    }
  };

  const submitFeedback = async () => {
    if (!currentOrder?.id) return;
    if (isRateLimited(`feedback_${getClientFingerprint()}`, RATE_LIMITS.feedback)) {
      toast({ title: "Too many submissions", description: "Please wait", variant: "destructive" });
      return;
    }
    await supabase.from("feedback").insert([{ order_id: currentOrder.id, restaurant_id: restaurantId, rating, comment: sanitizeInput(comment.trim()) || null }]);
    localStorage.removeItem(`orders_${restaurantId}_${sessionId}`);
    localStorage.removeItem(`orders_timestamp_${restaurantId}_${sessionId}`);
    toast({ title: "Thank you!", description: "Your feedback helps us improve!", duration: 4000 });
    setShowFeedback(false);
    setCurrentOrder(null);
    setActiveOrders([]);
    setRating(0);
    setComment("");
  };

  // Memoized data
  const groupedItems = useMemo(() => categories.reduce((acc, cat) => {
    acc[cat.id] = menuItems.filter(item => item.category_id === cat.id);
    return acc;
  }, {} as Record<string, any[]>), [categories, menuItems]);

  const uncategorizedItems = useMemo(() => menuItems.filter(item => !item.category_id), [menuItems]);

  // Filter items based on selected category
  const displayedCategories = useMemo(() => {
    const catsWithItems = categories.filter(c => groupedItems[c.id]?.length > 0);
    if (selectedCategory) {
      return catsWithItems.filter(c => c.id === selectedCategory);
    }
    return catsWithItems;
  }, [categories, groupedItems, selectedCategory]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return menuItems.filter(item => item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q));
  }, [menuItems, searchQuery]);

  const totalPrice = useMemo(() => cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0), [cart]);
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + (item.quantity || 1), 0), [cart]);

  const handleCategoryClick = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setSearchQuery("");
  };

  // Splash Screen
  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-red-500 via-orange-500 to-amber-500">
        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={bounceConfig}
          className="text-center"
        >
          <motion.div 
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-2xl border border-white/30 overflow-hidden"
          >
            {restaurant?.logo_url ? (
              <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Utensils className="w-14 h-14 text-white" />
            )}
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-white drop-shadow-lg"
          >
            {restaurant?.name || "Menu"}
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 120 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="h-1 bg-white/30 rounded-full mx-auto mt-6 overflow-hidden"
          >
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-1/2 bg-white rounded-full"
            />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Service Disabled
  if (serviceDisabled && restaurantContact) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-black p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={springConfig}>
          <Card className="max-w-md w-full p-8 text-center border-0 shadow-2xl rounded-3xl bg-white dark:bg-zinc-900">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Service Unavailable</h1>
            <p className="text-zinc-500 dark:text-zinc-400">{restaurantContact.name}'s menu is currently unavailable.</p>
          </Card>
        </motion.div>
      </div>
    );
  }

  const restaurantName = restaurant?.name || "Menu";


  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black transition-colors duration-300">
      {/* Header with Animated Search */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={springConfig}
        className="sticky top-0 z-50 bg-white dark:bg-black"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-18">
            {/* Logo & Name - Hidden when search is open on mobile */}
            <AnimatePresence mode="wait">
              {!isSearchOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 min-w-0"
                >
                  <motion.div 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }} 
                    className="flex-shrink-0"
                  >
                    {restaurant?.logo_url ? (
                      <img src={restaurant.logo_url} alt="" className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                        <Utensils className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    )}
                  </motion.div>
                  <div className="min-w-0">
                    <h1 className="font-bold text-zinc-900 dark:text-white text-base sm:text-lg leading-tight truncate">{restaurantName}</h1>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search Bar - Expands on click */}
            <motion.div 
              layout
              className={`flex items-center ${isSearchOpen ? 'flex-1' : ''}`}
            >
              <AnimatePresence mode="wait">
                {isSearchOpen ? (
                  <motion.div
                    key="search-input"
                    initial={{ width: 48, opacity: 0 }}
                    animate={{ width: "100%", opacity: 1 }}
                    exit={{ width: 48, opacity: 0 }}
                    transition={{ type: "spring" as const, stiffness: 300, damping: 30 }}
                    className="flex items-center gap-2 w-full"
                  >
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search dishes..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setSelectedCategory(null); }}
                        className="pl-10 pr-4 h-10 sm:h-11 text-sm bg-zinc-100 dark:bg-zinc-900 border-0 rounded-xl focus:ring-2 focus:ring-red-500/30"
                        autoFocus
                      />
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }}
                      className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    >
                      <X className="h-5 w-5 text-zinc-500" />
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="search-buttons"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { setIsSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 100); }}
                      className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Search className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {isDarkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-zinc-600" />}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Category Pills - Clean design with proper spacing */}
      <div className="sticky top-16 sm:top-[72px] z-40 bg-white dark:bg-black py-3 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div 
            className="flex gap-2 sm:gap-3 overflow-x-auto py-1 -my-1 px-1 -mx-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleCategoryClick(null)}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 flex-shrink-0 ${
                selectedCategory === null && !searchQuery
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              All
            </motion.button>
            {categories.filter(cat => groupedItems[cat.id]?.length > 0).map((category, idx) => {
              const IconComponent = getCategoryIcon(category.name);
              const isSelected = selectedCategory === category.id;
              return (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 flex-shrink-0 ${
                    isSelected
                      ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                      : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {category.name}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className={`max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-8 ${activeOrders.length > 0 ? 'pb-40' : cart.length > 0 ? 'pb-32' : 'pb-8'}`}>
        
        {/* Search Results */}
        {searchQuery && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-4">
              {searchResults.length > 0 ? `Found ${searchResults.length} items` : 'No items found'}
            </h2>
            {searchResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {searchResults.map((item, idx) => (
                  <MenuItemCard key={item.id} item={item} index={idx} cartQty={getCartItemQuantity(item.id)} onAdd={addToCart} onUpdate={updateQuantity} formatINR={formatINR} imageLoaded={imageLoaded} setImageLoaded={setImageLoaded} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Categories with Items */}
        {!searchQuery && (
          <div className="space-y-10 sm:space-y-12">
            {displayedCategories.map((category, catIdx) => {
              const items = groupedItems[category.id] || [];
              const colorScheme = categoryColors[catIdx % categoryColors.length];
              const IconComponent = getCategoryIcon(category.name);
              
              return (
                <motion.section
                  key={category.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: catIdx * 0.1 }}
                >
                  {/* Category Header */}
                  <motion.div 
                    className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-5 sm:mb-6 ${colorScheme.light} border border-zinc-200/50 dark:border-zinc-800/50`}
                  >
                    <div className="relative z-10 flex items-center gap-4">
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: 10 }}
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${colorScheme.bg} flex items-center justify-center shadow-xl`}
                      >
                        <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                      </motion.div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white capitalize">
                          {category.name}
                        </h2>
                        <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-1">
                          {items.length} {items.length === 1 ? 'item' : 'delicious items'}
                        </p>
                      </div>
                    </div>
                    <div className="absolute right-4 top-4 opacity-20">
                      <Sparkles className="w-12 h-12" />
                    </div>
                  </motion.div>

                  {/* Items Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {items.map((item, idx) => (
                      <MenuItemCard key={item.id} item={item} index={idx} cartQty={getCartItemQuantity(item.id)} onAdd={addToCart} onUpdate={updateQuantity} formatINR={formatINR} imageLoaded={imageLoaded} setImageLoaded={setImageLoaded} />
                    ))}
                  </div>
                </motion.section>
              );
            })}

            {/* Uncategorized Items */}
            {uncategorizedItems.length > 0 && !selectedCategory && (
              <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-5 sm:mb-6 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50">
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-zinc-500 to-zinc-600 flex items-center justify-center shadow-xl">
                      <Utensils className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">More Items</h2>
                      <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 mt-1">{uncategorizedItems.length} items</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {uncategorizedItems.map((item, idx) => (
                    <MenuItemCard key={item.id} item={item} index={idx} cartQty={getCartItemQuantity(item.id)} onAdd={addToCart} onUpdate={updateQuantity} formatINR={formatINR} imageLoaded={imageLoaded} setImageLoaded={setImageLoaded} />
                  ))}
                </div>
              </motion.section>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoadingItems && (
          <div className="space-y-8">
            {[1, 2].map(cat => (
              <div key={cat}>
                <div className="h-28 bg-zinc-200 dark:bg-zinc-800 rounded-3xl animate-pulse mb-5" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white dark:bg-zinc-900 rounded-3xl p-4 animate-pulse h-36" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer with Social Links */}
        {!isLoadingItems && (
          <footer className="mt-12 sm:mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800">
            {/* Social Links - Minimal Style */}
            {restaurant?.social_links && Object.keys(restaurant.social_links as object).length > 0 && (
              <div className="text-center mb-6">
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">Follow us</p>
                <div className="flex justify-center gap-4">
                  {(restaurant.social_links as any)?.instagram && (
                    <a 
                      href={(restaurant.social_links as any).instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                  {(restaurant.social_links as any)?.facebook && (
                    <a 
                      href={(restaurant.social_links as any).facebook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                  {(restaurant.social_links as any)?.twitter && (
                    <a 
                      href={(restaurant.social_links as any).twitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                  {(restaurant.social_links as any)?.website && (
                    <a 
                      href={(restaurant.social_links as any).website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      <Globe className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Powered By AddMenu */}
            <div className="text-center pb-4">
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Powered by{' '}
                <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                  AddMenu
                </span>
              </p>
            </div>
          </footer>
        )}
      </main>


      {/* Floating Cart Button */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={bounceConfig}
            className={`fixed left-4 right-4 z-50 ${activeOrders.length > 0 ? 'bottom-[72px]' : 'bottom-4'}`}
          >
            <div className="max-w-4xl mx-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCartDialog(true)}
                className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl p-4 shadow-2xl shadow-red-500/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm opacity-90">{totalItems} {totalItems === 1 ? 'item' : 'items'}</p>
                    <p className="font-bold text-xl">{formatINR(totalPrice)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl">
                  <span className="font-semibold">View Cart</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Status Bar */}
      <AnimatePresence>
        {activeOrders.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={bounceConfig}
            className="fixed bottom-0 left-0 right-0 z-40"
          >
            <button
              onClick={() => setShowOrderStatusDialog(true)}
              className={`w-full py-4 px-4 flex items-center justify-between ${
                activeOrders.every(o => o.status === "completed")
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'
              }`}
            >
              <div className="flex items-center gap-3">
                {activeOrders.every(o => o.status === "completed") ? (
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <CookingAnimation size="sm" />
                  </div>
                )}
                <div className="text-left text-white">
                  <p className="font-bold text-base">
                    {activeOrders.length === 1 ? `Order #${activeOrders[0].order_number}` : `${activeOrders.length} Orders`}
                  </p>
                  <p className="text-sm opacity-90">
                    {activeOrders.every(o => o.status === "completed") ? '✓ Ready for pickup!' : 'Cooking your food...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-white bg-white/20 px-4 py-2 rounded-xl">
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Dialog */}
      <Dialog open={showCartDialog} onOpenChange={setShowCartDialog}>
        <DialogContent className="max-w-lg w-[95vw] p-0 gap-0 rounded-3xl overflow-hidden border-0 shadow-2xl bg-white dark:bg-zinc-950 z-[200]">
          <DialogHeader className="p-5 pb-4 bg-gradient-to-r from-red-500 to-orange-500">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
              <ShoppingCart className="w-6 h-6" />
              Your Cart
              <Badge className="bg-white/20 text-white border-0 ml-auto">{totalItems}</Badge>
            </DialogTitle>
          </DialogHeader>
          
          {cart.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-zinc-400" />
              </div>
              <p className="text-zinc-500 dark:text-zinc-400">Your cart is empty</p>
              <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Add some delicious items!</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[40vh] sm:max-h-[50vh]">
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                {cart.map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3 p-2 sm:p-3 bg-zinc-100 dark:bg-zinc-900 rounded-xl sm:rounded-2xl"
                  >
                    <img 
                      src={item.image_url || '/placeholder.svg'} 
                      alt={item.name} 
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg sm:rounded-xl flex-shrink-0" 
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h4 className="font-semibold text-sm sm:text-base line-clamp-1 text-zinc-900 dark:text-white">{item.name}</h4>
                        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">{formatINR(item.price)} each</p>
                      </div>
                      <div className="flex items-center justify-between mt-1 sm:mt-2">
                        <div className="flex items-center bg-white dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                          <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                            <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                          <span className="w-7 sm:w-8 text-center font-semibold text-sm text-zinc-900 dark:text-white">{item.quantity || 1}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                        <span className="font-bold text-sm sm:text-base text-red-500">{formatINR(item.price * (item.quantity || 1))}</span>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="self-start p-1.5 sm:p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg">
                      <X className="w-4 h-4 text-zinc-400" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4 bg-white dark:bg-zinc-950">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 dark:text-zinc-400">Subtotal</span>
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">{formatINR(totalPrice)}</span>
            </div>
            <div>
              <Label className="text-sm text-zinc-500 dark:text-zinc-400">Table Number</Label>
              <Input 
                value={tableNumber} 
                onChange={(e) => setTableNumber(e.target.value)} 
                placeholder="Enter table number" 
                className="mt-1.5 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400" 
              />
            </div>
            <Button 
              onClick={placeOrder} 
              disabled={!tableNumber || cart.length === 0} 
              className="w-full h-14 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-zinc-300 disabled:to-zinc-400 dark:disabled:from-zinc-700 dark:disabled:to-zinc-800 text-white rounded-xl font-bold text-lg shadow-lg shadow-red-500/20 disabled:shadow-none transition-all"
            >
              Place Order • {formatINR(totalPrice)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Status Dialog */}
      <Dialog open={showOrderStatusDialog} onOpenChange={setShowOrderStatusDialog}>
        <DialogContent className="max-w-lg w-[95vw] p-0 gap-0 rounded-3xl overflow-hidden border-0 shadow-2xl bg-white dark:bg-zinc-950 z-[200]">
          <div className={`p-8 text-center ${
            activeOrders.every(o => o.status === "completed")
              ? 'bg-gradient-to-br from-emerald-500 to-teal-500'
              : 'bg-gradient-to-br from-amber-500 to-orange-500'
          }`}>
            {activeOrders.every(o => o.status === "completed") ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={bounceConfig}>
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">Ready for Pickup!</h3>
                <p className="text-white/80 mt-2">Your order is waiting</p>
              </motion.div>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <CookingAnimation size="lg" />
                </div>
                <h3 className="text-2xl font-bold text-white">Cooking Your Food</h3>
                <p className="text-white/80 mt-2">Table {activeOrders[0]?.table_number}</p>
              </>
            )}
          </div>

          <ScrollArea className="max-h-[40vh] p-4">
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <div key={order.id} className={`rounded-2xl p-4 ${
                  order.status === "completed" 
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30' 
                    : 'bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                }`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-lg">#{order.order_number}</span>
                    <Badge className={order.status === "completed" ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}>
                      {order.status === "completed" ? '✓ Ready' : '⏳ Cooking'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {order.items?.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-zinc-600 dark:text-zinc-400">{item.name} {item.quantity > 1 && `×${item.quantity}`}</span>
                        <span className="font-medium">{formatINR(item.price * (item.quantity || 1))}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">{formatINR(order.items?.items?.reduce((sum: number, item: any) => sum + (item.price * (item.quantity || 1)), 0) || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setShowOrderStatusDialog(false)} className="w-full h-12 rounded-2xl font-semibold">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Confirmation Dialog */}
      <Dialog open={showOrderConfirmation} onOpenChange={setShowOrderConfirmation}>
        <DialogContent className="max-w-sm w-[90vw] p-0 gap-0 rounded-3xl overflow-hidden border-0 shadow-2xl bg-white dark:bg-zinc-950 z-[200]">
          <div className="p-8 text-center bg-gradient-to-br from-emerald-500 to-teal-500">
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={bounceConfig}>
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">Order Placed!</h2>
            <p className="text-4xl font-bold text-white">#{orderNumber}</p>
            <p className="text-white/80 mt-2">Table {tableNumber}</p>
          </div>
          <div className="p-6 bg-white dark:bg-zinc-950">
            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl mb-4 flex items-center justify-center gap-3">
              <CookingAnimation size="sm" />
              <span className="font-medium text-amber-600 dark:text-amber-400">Cooking your food...</span>
            </div>
            <Button onClick={() => setShowOrderConfirmation(false)} className="w-full h-14 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold text-lg">
              Continue Browsing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog - Emoji Rating */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent className="max-w-sm w-[90vw] p-0 gap-0 rounded-3xl overflow-hidden border-0 shadow-2xl bg-white dark:bg-zinc-900">
          <div className="p-6 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-center">
            <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={bounceConfig}>
              <div className="text-6xl mb-2">🎉</div>
            </motion.div>
            <h2 className="text-2xl font-bold text-white">How was your meal?</h2>
            <p className="text-white/80 text-sm mt-1">Your feedback helps us improve</p>
          </div>
          <div className="p-6">
            {/* Emoji Rating */}
            <div className="flex justify-center gap-3 mb-6">
              {[
                { value: 1, emoji: '😞', label: 'Bad' },
                { value: 2, emoji: '😕', label: 'Okay' },
                { value: 3, emoji: '😊', label: 'Good' },
                { value: 4, emoji: '😄', label: 'Great' },
                { value: 5, emoji: '🤩', label: 'Amazing' },
              ].map(({ value, emoji, label }) => (
                <motion.button 
                  key={value} 
                  whileHover={{ scale: 1.2, y: -5 }} 
                  whileTap={{ scale: 0.9 }} 
                  onClick={() => setRating(value)} 
                  className={`flex flex-col items-center p-2 rounded-2xl transition-all ${
                    rating === value 
                      ? 'bg-amber-100 dark:bg-amber-500/20 ring-2 ring-amber-500' 
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className={`text-4xl transition-all ${rating === value ? 'scale-110' : 'grayscale opacity-60'}`}>{emoji}</span>
                  <span className={`text-xs mt-1 font-medium ${rating === value ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400'}`}>{label}</span>
                </motion.button>
              ))}
            </div>
            <Textarea placeholder="Tell us more about your experience (optional)" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="rounded-2xl resize-none mb-4 border-2 focus:border-amber-500" />
            <Button onClick={submitFeedback} disabled={rating === 0} className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-zinc-300 disabled:to-zinc-400 text-white rounded-2xl font-bold text-lg shadow-lg shadow-amber-500/30 disabled:shadow-none transition-all">
              Submit Feedback
            </Button>
            <button
              onClick={() => {
                setShowFeedback(false);
                localStorage.removeItem(`orders_${restaurantId}_${sessionId}`);
                localStorage.removeItem(`orders_timestamp_${restaurantId}_${sessionId}`);
                setActiveOrders([]);
                setCurrentOrder(null);
              }}
              className="w-full mt-3 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 py-2"
            >
              Maybe later
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Menu Item Card Component with smooth slide-in animation
const MenuItemCard = ({ item, index, cartQty, onAdd, onUpdate, formatINR, imageLoaded, setImageLoaded }: any) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30, y: 20 }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        type: "spring" as const, 
        stiffness: 300, 
        damping: 25, 
        delay: (index % 4) * 0.08 
      }}
      whileHover={{ y: -6, scale: 1.02 }}
    >
      <Card className="overflow-hidden border-0 shadow-lg bg-white dark:bg-zinc-900 rounded-3xl hover:shadow-xl transition-all duration-300">
        <div className="flex p-4 gap-4">
          <div className="relative w-28 h-28 flex-shrink-0">
            <div className={`absolute inset-0 bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse ${imageLoaded[item.id] ? 'hidden' : ''}`} />
            <img
              src={item.image_url || '/placeholder.svg'}
              alt={item.name}
              onLoad={() => setImageLoaded((prev: any) => ({ ...prev, [item.id]: true }))}
              className={`w-full h-full object-cover rounded-2xl transition-opacity duration-300 ${imageLoaded[item.id] ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
            />
            {!item.is_available && (
              <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                <span className="text-white text-xs font-semibold px-2 py-1 bg-red-500 rounded-lg">Unavailable</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white text-base leading-tight line-clamp-2">{item.name}</h3>
              {item.description && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{item.description}</p>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <span className="text-xl font-bold text-zinc-900 dark:text-white">{formatINR(item.price)}</span>
              
              {item.is_available && (
                <AnimatePresence mode="wait">
                  {cartQty > 0 ? (
                    <motion.div 
                      key="qty"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="flex items-center bg-gradient-to-r from-red-500 to-orange-500 rounded-xl overflow-hidden shadow-lg"
                    >
                      <button onClick={() => onUpdate(item.id, -1)} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center text-white font-bold">{cartQty}</span>
                      <button onClick={() => onAdd(item)} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10">
                        <Plus className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="add"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onAdd(item)}
                      className="px-5 py-2.5 bg-white dark:bg-zinc-800 border-2 border-red-500 text-red-500 rounded-xl font-bold text-sm hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    >
                      ADD
                    </motion.button>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default CustomerMenu;
