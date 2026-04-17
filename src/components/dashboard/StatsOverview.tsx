import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Eye, Package, MessageSquare, TrendingUp, TrendingDown, 
  Utensils, IndianRupee, Clock, ArrowUpRight, ArrowDownRight,
  ShoppingBag, Star, Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StatsOverviewProps {
  restaurantId: string;
}

interface DayStats {
  orders: number;
  revenue: number;
  avgOrderValue: number;
}

const StatsOverview = ({ restaurantId }: StatsOverviewProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalOrders: 0,
    totalFeedback: 0,
    totalMenuItems: 0,
    avgRating: 0,
    activeOrders: 0,
  });
  const [today, setToday] = useState<DayStats>({ orders: 0, revenue: 0, avgOrderValue: 0 });
  const [yesterday, setYesterday] = useState<DayStats>({ orders: 0, revenue: 0, avgOrderValue: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    fetchAllStats();
    subscribeToMenuViews();
  }, [restaurantId]);

  const subscribeToMenuViews = () => {
    const channel = supabase
      .channel(`stats-views-${restaurantId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "menu_views", filter: `restaurant_id=eq.${restaurantId}` },
        () => { toast({ title: "👁️ New Menu View!", description: "Someone is viewing your menu" }); fetchAllStats(); }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const fetchAllStats = async () => {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);

      // Parallel fetch all data
      const [viewsRes, ordersRes, feedbackRes, menuRes, allOrdersRes, ratingRes] = await Promise.all([
        supabase.from("menu_views").select("view_count").eq("restaurant_id", restaurantId).single(),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
        supabase.from("feedback").select("*", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
        supabase.from("menu_items").select("*", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
        supabase.from("orders").select("id, order_number, table_number, items, status, created_at").eq("restaurant_id", restaurantId).gte("created_at", startOfYesterday.toISOString()).order("created_at", { ascending: false }),
        supabase.from("feedback").select("rating").eq("restaurant_id", restaurantId),
      ]);

      const allOrders = allOrdersRes.data || [];
      const ratings = ratingRes.data || [];
      const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;

      // Active orders (pending/accepted/preparing)
      const activeCount = allOrders.filter(o => ["pending", "accepted", "preparing"].includes(o.status)).length;

      // Calculate today and yesterday stats
      const todayOrders = allOrders.filter(o => new Date(o.created_at) >= startOfToday);
      const yesterdayOrders = allOrders.filter(o => {
        const d = new Date(o.created_at);
        return d >= startOfYesterday && d < startOfToday;
      });

      const calcRevenue = (orders: any[]) => orders.reduce((sum, o) => {
        const items = o.items?.items || [];
        return sum + items.reduce((s: number, i: any) => s + ((i.price || 0) * (i.quantity || 1)), 0);
      }, 0);

      const todayRevenue = calcRevenue(todayOrders);
      const yesterdayRevenue = calcRevenue(yesterdayOrders);

      setStats({
        totalViews: viewsRes.data?.view_count || 0,
        totalOrders: ordersRes.count || 0,
        totalFeedback: feedbackRes.count || 0,
        totalMenuItems: menuRes.count || 0,
        avgRating: Math.round(avgRating * 10) / 10,
        activeOrders: activeCount,
      });

      setToday({
        orders: todayOrders.length,
        revenue: todayRevenue,
        avgOrderValue: todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0,
      });

      setYesterday({
        orders: yesterdayOrders.length,
        revenue: yesterdayRevenue,
        avgOrderValue: yesterdayOrders.length > 0 ? yesterdayRevenue / yesterdayOrders.length : 0,
      });

      // Recent 5 orders
      setRecentOrders(todayOrders.slice(0, 5));

      // Top items (from all recent orders)
      const itemCounts: Record<string, number> = {};
      allOrders.forEach(o => {
        (o.items?.items || []).forEach((i: any) => {
          itemCounts[i.name] = (itemCounts[i.name] || 0) + (i.quantity || 1);
        });
      });
      const sorted = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      setTopItems(sorted.map(([name, count]) => ({ name, count })));

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (v: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  const getChange = (today: number, yesterday: number) => {
    if (yesterday === 0) return today > 0 ? 100 : 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const ordersChange = getChange(today.orders, yesterday.orders);
  const revenueChange = getChange(today.revenue, yesterday.revenue);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Dashboard Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Track your restaurant's performance at a glance</p>
      </div>

      {/* Primary Stats — Today's Performance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <Card className="border-0 shadow-md rounded-2xl p-5 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 shadow-sm">
              <IndianRupee className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            {revenueChange !== 0 && (
              <Badge className={`rounded-full text-xs font-semibold ${revenueChange > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`} variant="outline">
                {revenueChange > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                {Math.abs(revenueChange)}%
              </Badge>
            )}
          </div>
          <p className="text-2xl md:text-3xl font-extrabold">{formatINR(today.revenue)}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Today's Revenue</p>
        </Card>

        {/* Today's Orders */}
        <Card className="border-0 shadow-md rounded-2xl p-5 bg-gradient-to-br from-blue-500/10 to-blue-500/5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 shadow-sm">
              <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            {ordersChange !== 0 && (
              <Badge className={`rounded-full text-xs font-semibold ${ordersChange > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`} variant="outline">
                {ordersChange > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                {Math.abs(ordersChange)}%
              </Badge>
            )}
          </div>
          <p className="text-2xl md:text-3xl font-extrabold">{today.orders}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Today's Orders</p>
        </Card>

        {/* Active Orders */}
        <Card className="border-0 shadow-md rounded-2xl p-5 bg-gradient-to-br from-orange-500/10 to-orange-500/5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-orange-500/20 shadow-sm">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            {stats.activeOrders > 0 && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
            )}
          </div>
          <p className="text-2xl md:text-3xl font-extrabold">{stats.activeOrders}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Active Orders</p>
        </Card>

        {/* Menu Views */}
        <Card className="border-0 shadow-md rounded-2xl p-5 bg-gradient-to-br from-violet-500/10 to-violet-500/5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-violet-500/20 shadow-sm">
              <Eye className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-extrabold">{stats.totalViews}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Total Menu Views</p>
        </Card>
      </div>

      {/* Middle Row — Yesterday Comparison + Avg Order Value */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Yesterday's Revenue</p>
          <p className="text-lg font-bold">{formatINR(yesterday.revenue)}</p>
        </Card>
        <Card className="border-0 shadow-sm rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Yesterday's Orders</p>
          <p className="text-lg font-bold">{yesterday.orders}</p>
        </Card>
        <Card className="border-0 shadow-sm rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Avg Order Value</p>
          <p className="text-lg font-bold">{formatINR(today.avgOrderValue)}</p>
        </Card>
        <Card className="border-0 shadow-sm rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Avg Rating</p>
          <p className="text-lg font-bold flex items-center gap-1">
            {stats.avgRating > 0 ? (
              <><Star className="h-4 w-4 text-amber-500 fill-amber-500" />{stats.avgRating}</>
            ) : "—"}
          </p>
        </Card>
      </div>

      {/* Bottom Row — Recent Orders + Top Items + Quick Stats */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
          <div className="p-5 pb-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Recent Orders Today
            </h3>
          </div>
          <div className="px-5 pb-5">
            {recentOrders.length > 0 ? (
              <div className="space-y-2">
                {recentOrders.map((order, idx) => (
                  <div key={order.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        #{order.order_number?.slice(-3)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Table {order.table_number}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(order.created_at)}</p>
                      </div>
                    </div>
                    <Badge className={`rounded-full text-xs ${
                      order.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      order.status === 'preparing' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      order.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-zinc-100 text-zinc-700'
                    }`} variant="outline">
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No orders today yet</p>
            )}
          </div>
        </Card>

        {/* Top Selling Items */}
        <Card className="border-0 shadow-md rounded-2xl overflow-hidden">
          <div className="p-5 pb-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Top Selling Items
            </h3>
          </div>
          <div className="px-5 pb-5">
            {topItems.length > 0 ? (
              <div className="space-y-2">
                {topItems.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                        idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-zinc-400' : idx === 2 ? 'bg-orange-400' : 'bg-zinc-300'
                      }`}>
                        {idx + 1}
                      </div>
                      <p className="text-sm font-semibold truncate">{item.name}</p>
                    </div>
                    <Badge variant="secondary" className="rounded-full text-xs font-bold">
                      {item.count} sold
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No sales data yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm rounded-2xl p-4 text-center">
          <Utensils className="h-5 w-5 text-primary mx-auto mb-2" />
          <p className="text-xl font-extrabold">{stats.totalMenuItems}</p>
          <p className="text-xs text-muted-foreground font-medium">Menu Items</p>
        </Card>
        <Card className="border-0 shadow-sm rounded-2xl p-4 text-center">
          <Package className="h-5 w-5 text-primary mx-auto mb-2" />
          <p className="text-xl font-extrabold">{stats.totalOrders}</p>
          <p className="text-xs text-muted-foreground font-medium">Total Orders</p>
        </Card>
        <Card className="border-0 shadow-sm rounded-2xl p-4 text-center">
          <MessageSquare className="h-5 w-5 text-primary mx-auto mb-2" />
          <p className="text-xl font-extrabold">{stats.totalFeedback}</p>
          <p className="text-xs text-muted-foreground font-medium">Feedback</p>
        </Card>
      </div>
    </div>
  );
};

export default StatsOverview;
