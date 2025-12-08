import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Moon, Sun, X, Utensils, Salad, UtensilsCrossed,
  Coffee, IceCream, Soup, Pizza, Sandwich, Flame, Leaf, Fish, Beef, Cookie,
  Globe, Clock, Instagram, Facebook, Twitter, ChevronDown, ChevronUp
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import ServiceCallButton from "@/components/ServiceCallButton";

const springConfig = { type: "spring" as const, stiffness: 300, damping: 25 };
const bounceConfig = { type: "spring" as const, stiffness: 400, damping: 20 };

const getCategoryIcon = (name: string) => {
  const lower = name.toLowerCase().trim();
  if (lower.includes('starter') || lower.includes('appetizer') || lower.includes('salad')) return Salad;
  if (lower.includes('main') || lower.includes('course')) return UtensilsCrossed;
  if (lower.includes('dessert') || lower.includes('sweet') || lower.includes('ice')) return IceCream;
  if (lower.includes('drink') || lower.includes('beverage')) return Coffee;
  if (lower.includes('soup')) return Soup;
  if (lower.includes('pizza')) return Pizza;
  if (lower.includes('burger') || lower.includes('sandwich')) return Sandwich;
  if (lower.includes('grill') || lower.includes('bbq')) return Flame;
  if (lower.includes('veg')) return Leaf;
  if (lower.includes('fish') || lower.includes('seafood')) return Fish;
  if (lower.includes('chicken') || lower.includes('meat')) return Beef;
  if (lower.includes('snack')) return Cookie;
  return Utensils;
};

const categoryColors = [
  { bg: 'from-orange-500 to-red-500', light: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
  { bg: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'from-violet-500 to-purple-500', light: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  { bg: 'from-amber-500 to-yellow-500', light: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  { bg: 'from-pink-500 to-rose-500', light: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400' },
  { bg: 'from-cyan-500 to-blue-500', light: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
];

const CustomerMenuViewOnly = () => {
  const { restaurantId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSplash, setShowSplash] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('customer-menu-theme') === 'dark');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [serviceDisabled, setServiceDisabled] = useState(false);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [restaurantContact, setRestaurantContact] = useState<{ name: string; email: string; phone: string | null } | null>(null);
  const [tableNumber, setTableNumber] = useState(() => localStorage.getItem(`table_${restaurantId}`) || "");

  const formatINR = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

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
      if (restaurantId) {
        const { data: subStatus } = await supabase
          .rpc("get_restaurant_subscription_status" as any, { p_restaurant_id: restaurantId });
        const statusArray = subStatus as any[];
        if (statusArray && statusArray.length > 0 && !statusArray[0].is_subscription_active) {
          setSubscriptionExpired(true);
          setRestaurantContact({ name: data.name, email: data.email, phone: data.phone });
        }
      }
      return data;
    },
    staleTime: 60 * 60 * 1000,
    enabled: !!restaurantId,
  });

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menuItems', restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("id, name, description, price, image_url, is_available, category_id")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    staleTime: 60 * 60 * 1000,
    enabled: !!restaurantId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("menu_categories")
        .select("id, name, display_order")
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true });
      return data || [];
    },
    staleTime: 60 * 60 * 1000,
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#000000';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '';
    }
    localStorage.setItem('customer-menu-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const groupedItems = useMemo(() => categories.reduce((acc, cat) => {
    acc[cat.id] = menuItems.filter(item => item.category_id === cat.id && item.is_available);
    return acc;
  }, {} as Record<string, any[]>), [categories, menuItems]);

  const uncategorizedItems = useMemo(() => menuItems.filter(item => !item.category_id && item.is_available), [menuItems]);

  const displayedCategories = useMemo(() => {
    const catsWithItems = categories.filter(c => groupedItems[c.id]?.length > 0);
    if (selectedCategory) return catsWithItems.filter(c => c.id === selectedCategory);
    return catsWithItems;
  }, [categories, groupedItems, selectedCategory]);

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return menuItems.filter(item => item.is_available && (item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)));
  }, [menuItems, searchQuery]);

  // Splash Screen
  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-orange-500 via-red-500 to-pink-500">
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={bounceConfig} className="text-center">
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-28 h-28 mx-auto mb-6 rounded-3xl bg-white/20 backdrop-blur-xl flex items-center justify-center overflow-hidden shadow-2xl border border-white/30"
          >
            {restaurant?.logo_url ? <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" /> : <Utensils className="w-14 h-14 text-white" />}
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-3xl font-bold text-white drop-shadow-lg">
            {restaurant?.name || "Menu"}
          </motion.h1>
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 100 }} transition={{ delay: 0.5, duration: 0.6 }} className="h-1 bg-white/30 rounded-full mx-auto mt-6 overflow-hidden">
            <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }} className="h-full w-1/2 bg-white rounded-full" />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Service Disabled
  if (serviceDisabled && restaurantContact) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-black p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={springConfig}>
          <Card className="max-w-md w-full p-8 text-center border-0 shadow-2xl rounded-3xl">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Service Unavailable</h1>
            <p className="text-zinc-500">{restaurantContact.name}'s menu is currently unavailable.</p>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Subscription Expired
  if (subscriptionExpired && restaurantContact) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-black p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={springConfig}>
          <Card className="max-w-md w-full p-8 text-center border-0 shadow-2xl rounded-3xl">
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-10 w-10 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Menu Temporarily Unavailable</h1>
            <p className="text-zinc-500 mb-4">{restaurantContact.name}'s digital menu service is currently inactive.</p>
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl space-y-2">
              <p className="text-sm font-medium">Please contact the restaurant:</p>
              {restaurantContact.email && <a href={`mailto:${restaurantContact.email}`} className="block text-sm text-orange-500 hover:underline">📧 {restaurantContact.email}</a>}
              {restaurantContact.phone && <a href={`tel:${restaurantContact.phone}`} className="block text-sm text-orange-500 hover:underline">📞 {restaurantContact.phone}</a>}
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  const restaurantName = restaurant?.name || "Menu";
  const socialLinks = restaurant?.social_links as any;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black transition-colors duration-300">
      {/* Header */}
      <motion.header initial={{ y: -100 }} animate={{ y: 0 }} transition={springConfig} className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                {restaurant?.logo_url ? (
                  <img src={restaurant.logo_url} alt="" className="w-11 h-11 rounded-2xl object-cover shadow-lg" />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                    <Utensils className="w-5 h-5 text-white" />
                  </div>
                )}
              </motion.div>
              <h1 className="font-bold text-zinc-900 dark:text-white truncate text-lg">{restaurantName}</h1>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 shadow-md">
              {isDarkMode ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-zinc-600" />}
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Search */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedCategory(null); }}
            className="pl-12 h-12 bg-white dark:bg-zinc-900 border-0 rounded-2xl shadow-lg text-base"
          />
        </motion.div>
      </div>

      {/* Categories */}
      {categories.length > 0 && !searchQuery && (
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <ScrollArea className="w-full">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-2 pb-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(null)}
                className={`px-5 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all shadow-md ${
                  !selectedCategory ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                All
              </motion.button>
              {categories.filter(c => groupedItems[c.id]?.length > 0).map((cat, idx) => {
                const Icon = getCategoryIcon(cat.name);
                const color = categoryColors[idx % categoryColors.length];
                return (
                  <motion.button
                    key={cat.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 shadow-md ${
                      selectedCategory === cat.id ? `bg-gradient-to-r ${color.bg} text-white` : `bg-white dark:bg-zinc-900 ${color.text}`
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {cat.name}
                  </motion.button>
                );
              })}
            </motion.div>
          </ScrollArea>
        </div>
      )}

      {/* Menu Items */}
      <main className="max-w-4xl mx-auto px-4 pb-8">
        {searchQuery && searchResults.length > 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Search Results</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {searchResults.map((item, idx) => (
                <MenuItemCard key={item.id} item={item} formatINR={formatINR} index={idx} />
              ))}
            </div>
          </motion.div>
        ) : searchQuery ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-zinc-400" />
            </div>
            <p className="text-zinc-500 text-lg">No dishes found for "{searchQuery}"</p>
          </motion.div>
        ) : (
          <div className="space-y-12">
            {displayedCategories.map((category, catIdx) => {
              const Icon = getCategoryIcon(category.name);
              const color = categoryColors[catIdx % categoryColors.length];
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: catIdx * 0.1 }}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color.bg} flex items-center justify-center shadow-xl`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white capitalize">{category.name}</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {groupedItems[category.id]?.map((item, idx) => (
                      <MenuItemCard key={item.id} item={item} formatINR={formatINR} index={idx} />
                    ))}
                  </div>
                </motion.div>
              );
            })}
            {uncategorizedItems.length > 0 && !selectedCategory && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-500 to-zinc-600 flex items-center justify-center shadow-xl">
                    <Utensils className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Other Items</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {uncategorizedItems.map((item, idx) => (
                    <MenuItemCard key={item.id} item={item} formatINR={formatINR} index={idx} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/50 dark:border-zinc-800/50 py-6 mt-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Social Links - Minimalistic */}
          {socialLinks && Object.keys(socialLinks).some(k => socialLinks[k]) && (
            <div className="flex justify-center gap-4 mb-4">
              {socialLinks.instagram && (
                <motion.a whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-pink-500 transition-colors">
                  <Instagram className="h-5 w-5" />
                </motion.a>
              )}
              {socialLinks.facebook && (
                <motion.a whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-blue-500 transition-colors">
                  <Facebook className="h-5 w-5" />
                </motion.a>
              )}
              {socialLinks.twitter && (
                <motion.a whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} href={socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-sky-500 transition-colors">
                  <Twitter className="h-5 w-5" />
                </motion.a>
              )}
              {socialLinks.website && (
                <motion.a whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                  <Globe className="h-5 w-5" />
                </motion.a>
              )}
            </div>
          )}
          {/* Powered by AddMenu */}
          <div className="text-center">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Powered by <span className="font-semibold text-orange-500">AddMenu</span>
            </p>
          </div>
        </div>
      </footer>

      {/* Service Call Button - Waiter/Water/Bill */}
      <ServiceCallButton restaurantId={restaurantId || ""} tableNumber={tableNumber} />
    </div>
  );
};


// Enhanced Menu Item Card with expandable description
const MenuItemCard = ({ item, formatINR, index }: { item: any; formatINR: (v: number) => string; index: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasLongDescription = item.description && item.description.length > 80;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        delay: index * 0.05
      }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group"
    >
      <Card className="overflow-hidden border-0 bg-white dark:bg-zinc-900 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <motion.img
            src={item.image_url || '/placeholder.svg'}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.4 }}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {!item.is_available && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <span className="text-white font-bold px-4 py-2 bg-red-500 rounded-2xl text-sm shadow-lg">Currently Unavailable</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex justify-between items-start gap-3 mb-3">
            <h3 className="font-bold text-zinc-900 dark:text-white text-lg leading-tight flex-1">
              {item.name}
            </h3>
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500 text-xl whitespace-nowrap">
              {formatINR(item.price)}
            </span>
          </div>

          {/* Description with expand/collapse */}
          {item.description && (
            <AnimatePresence mode="wait">
              <motion.div
                key={isExpanded ? 'expanded' : 'collapsed'}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <p className={`text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed ${!isExpanded && hasLongDescription ? 'line-clamp-2' : ''}`}>
                  {item.description}
                </p>
              </motion.div>
            </AnimatePresence>
          )}

          {/* View more/less button */}
          {hasLongDescription && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-3 flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
            >
              {isExpanded ? (
                <>
                  <span>Show less</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Read more</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </motion.button>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

export default CustomerMenuViewOnly;
