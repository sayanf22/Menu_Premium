import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, Package, Bell, RefreshCw, ChevronDown, ChevronUp, 
  Users, ShoppingBag, Receipt, CheckCircle2, Timer, Utensils,
  Search, Filter, Calendar, TrendingUp, X
} from "lucide-react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";

interface Order {
  id: string;
  order_number: string;
  table_number: string;
  items: any;
  status: string;
  created_at: string;
  session_id: string | null;
}

interface SessionGroup {
  sessionId: string;
  tableNumber: string;
  orders: Order[];
  totalItems: number;
  totalPrice: number;
  allItems: { name: string; quantity: number; price: number; selectedSize?: string }[];
  latestOrderTime: string;
  earliestOrderTime: string;
  hasNewOrder: boolean;
  allCompleted: boolean;
}

interface OrderManagementProps {
  restaurantId: string;
  onNewOrder?: (order: Order) => void;
  newOrderTrigger?: Order | null;
  isVisible?: boolean;
}

type FilterTab = 'active' | 'completed' | 'all';

const GROUPING_WINDOW_MS = 90 * 60 * 1000; // 90 minutes

const OrderManagement = ({ restaurantId, newOrderTrigger, isVisible }: OrderManagementProps) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter states
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'all'>('today');

  useEffect(() => {
    fetchOrders();
    subscribeToOrders();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [restaurantId]);

  useEffect(() => {
    if (isVisible) {
      fetchOrders();
    }
  }, [isVisible]);

  useEffect(() => {
    if (newOrderTrigger && newOrderTrigger.id) {
      setOrders(currentOrders => {
        const exists = currentOrders.some(o => o.id === newOrderTrigger.id);
        if (exists) return currentOrders;
        
        setNewOrderIds(prev => new Set(prev).add(newOrderTrigger.id));
        const sessionKey = newOrderTrigger.session_id || `table_${newOrderTrigger.table_number}_${newOrderTrigger.id}`;
        setExpandedSessions(prev => new Set(prev).add(sessionKey));
        
        // Switch to active tab when new order comes
        setActiveTab('active');
        
        setTimeout(() => {
          setNewOrderIds(prev => {
            const updated = new Set(prev);
            updated.delete(newOrderTrigger.id);
            return updated;
          });
        }, 10000);
        
        return [newOrderTrigger, ...currentOrders];
      });
    }
  }, [newOrderTrigger]);

  const fetchOrders = async () => {
    try {
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const subscribeToOrders = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelName = `order-management-updates-${restaurantId}-${Date.now()}`;

    channelRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as Order;
          setOrders(prev => prev.map(order =>
            order.id === updatedOrder.id ? updatedOrder : order
          ));
        }
      )
      .subscribe();
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "✅ Order updated",
        description: `Status changed to ${newStatus}`,
        duration: 2000,
      });
    } catch (error: any) {
      fetchOrders();
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  // Filter orders based on date
  const filteredByDate = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      if (dateFilter === 'today') {
        return orderDate >= startOfToday;
      } else if (dateFilter === 'week') {
        return orderDate >= startOfWeek;
      }
      return true;
    });
  }, [orders, dateFilter]);

  // Filter by search query
  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return filteredByDate;
    const q = searchQuery.toLowerCase();
    return filteredByDate.filter(order => 
      order.order_number.toLowerCase().includes(q) ||
      order.table_number.toLowerCase().includes(q) ||
      order.items?.items?.some((item: any) => item.name.toLowerCase().includes(q))
    );
  }, [filteredByDate, searchQuery]);

  // Filter by tab (active/completed/all)
  const filteredOrders = useMemo(() => {
    if (activeTab === 'active') {
      return filteredBySearch.filter(o => o.status !== 'completed');
    } else if (activeTab === 'completed') {
      return filteredBySearch.filter(o => o.status === 'completed');
    }
    return filteredBySearch;
  }, [filteredBySearch, activeTab]);

  // Group orders by session_id
  const sessionGroups = useMemo((): SessionGroup[] => {
    const now = Date.now();
    const groups: Map<string, SessionGroup> = new Map();

    filteredOrders.forEach(order => {
      const sessionKey = order.session_id || `legacy_${order.id}`;
      
      if (!groups.has(sessionKey)) {
        groups.set(sessionKey, {
          sessionId: sessionKey,
          tableNumber: order.table_number,
          orders: [],
          totalItems: 0,
          totalPrice: 0,
          allItems: [],
          latestOrderTime: order.created_at,
          earliestOrderTime: order.created_at,
          hasNewOrder: false,
          allCompleted: true,
        });
      }

      const group = groups.get(sessionKey)!;
      group.orders.push(order);
      
      if (newOrderIds.has(order.id)) {
        group.hasNewOrder = true;
      }

      if (order.status !== 'completed') {
        group.allCompleted = false;
      }

      if (new Date(order.created_at) > new Date(group.latestOrderTime)) {
        group.latestOrderTime = order.created_at;
      }
      if (new Date(order.created_at) < new Date(group.earliestOrderTime)) {
        group.earliestOrderTime = order.created_at;
      }

      const orderItems = order.items?.items || [];
      orderItems.forEach((item: any) => {
        const existingItem = group.allItems.find(
          i => i.name === item.name && i.selectedSize === item.selectedSize
        );
        if (existingItem) {
          existingItem.quantity += item.quantity || 1;
        } else {
          group.allItems.push({
            name: item.name,
            quantity: item.quantity || 1,
            price: item.price,
            selectedSize: item.selectedSize,
          });
        }
        group.totalItems += item.quantity || 1;
        group.totalPrice += (item.price || 0) * (item.quantity || 1);
      });
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.allCompleted !== b.allCompleted) {
        return a.allCompleted ? 1 : -1;
      }
      return new Date(b.latestOrderTime).getTime() - new Date(a.latestOrderTime).getTime();
    });
  }, [filteredOrders, newOrderIds]);

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessions(prev => {
      const updated = new Set(prev);
      if (updated.has(sessionId)) {
        updated.delete(sessionId);
      } else {
        updated.add(sessionId);
      }
      return updated;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "preparing":
        return "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/50";
      case "completed":
        return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/50";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ${mins % 60}m ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { 
      day: 'numeric',
      month: 'short',
    });
  };

  // Stats based on all orders (not filtered)
  const activeOrdersCount = orders.filter(o => o.status !== 'completed').length;
  const completedOrdersCount = orders.filter(o => o.status === 'completed').length;
  const todayRevenue = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return orders
      .filter(o => new Date(o.created_at) >= startOfToday)
      .reduce((sum, o) => {
        const orderTotal = o.items?.items?.reduce((s: number, item: any) => 
          s + ((item.price || 0) * (item.quantity || 1)), 0) || 0;
        return sum + orderTotal;
      }, 0);
  }, [orders]);

  const tabs: { id: FilterTab; label: string; count: number }[] = [
    { id: 'active', label: 'Active', count: activeOrdersCount },
    { id: 'completed', label: 'Completed', count: completedOrdersCount },
    { id: 'all', label: 'All Orders', count: orders.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Order Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time order tracking grouped by customer session
          </p>
        </div>
        <Button 
          onClick={fetchOrders} 
          variant="outline"
          className="gap-2"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('active')}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/20">
              <Timer className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeOrdersCount}</p>
              <p className="text-xs text-muted-foreground">Active Orders</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('completed')}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedOrdersCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">₹{todayRevenue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Today's Revenue</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/20">
              <ShoppingBag className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sessionGroups.reduce((sum, g) => sum + g.totalItems, 0)}</p>
              <p className="text-xs text-muted-foreground">Items in View</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className="gap-2"
            >
              {tab.label}
              <Badge variant={activeTab === tab.id ? 'secondary' : 'outline'} className="ml-1">
                {tab.count}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Search & Date Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order #, table, or item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={dateFilter === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('today')}
              className="gap-1"
            >
              <Calendar className="h-4 w-4" />
              Today
            </Button>
            <Button
              variant={dateFilter === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('week')}
            >
              This Week
            </Button>
            <Button
              variant={dateFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('all')}
            >
              All Time
            </Button>
          </div>
        </div>
      </div>

      {/* Session Groups */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {sessionGroups.map((group) => {
            const isExpanded = expandedSessions.has(group.sessionId);
            
            return (
              <motion.div
                key={group.sessionId}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`overflow-hidden transition-all duration-300 ${
                  group.allCompleted 
                    ? 'opacity-70 bg-muted/30' 
                    : group.hasNewOrder 
                      ? 'ring-2 ring-orange-500/50 shadow-lg shadow-orange-500/10' 
                      : 'hover:shadow-md'
                }`}>
                  {/* Session Header */}
                  <button
                    onClick={() => toggleSessionExpand(group.sessionId)}
                    className="w-full p-4 md:p-5 flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${
                        group.allCompleted 
                          ? 'bg-muted' 
                          : group.hasNewOrder 
                            ? 'bg-orange-500/20 animate-pulse' 
                            : 'bg-primary/10'
                      }`}>
                        {group.hasNewOrder && !group.allCompleted && (
                          <Bell className="h-6 w-6 text-orange-500 animate-bounce" />
                        )}
                        {!group.hasNewOrder && !group.allCompleted && (
                          <Utensils className="h-6 w-6 text-primary" />
                        )}
                        {group.allCompleted && (
                          <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl md:text-2xl font-bold">
                            Table {group.tableNumber}
                          </h3>
                          {group.orders.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {group.orders.length} orders
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {getTimeAgo(group.latestOrderTime)}
                          </span>
                          <span>•</span>
                          <span>{group.totalItems} items</span>
                          {dateFilter !== 'today' && (
                            <>
                              <span>•</span>
                              <span>{formatDate(group.latestOrderTime)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl md:text-2xl font-bold text-primary">
                          ₹{group.totalPrice.toFixed(0)}
                        </p>
                        {!group.allCompleted && (
                          <Badge className={getStatusColor('preparing')} variant="outline">
                            In Progress
                          </Badge>
                        )}
                        {group.allCompleted && (
                          <Badge className={getStatusColor('completed')} variant="outline">
                            Completed
                          </Badge>
                        )}
                      </div>
                      <div className="p-2 rounded-full bg-muted/50">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-4 border-t">
                          {/* Combined Items Summary */}
                          <div className="pt-4">
                            <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                              <Receipt className="h-4 w-4" />
                              All Items Summary
                            </h4>
                            <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                              {group.allItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                  <span className="flex items-center gap-2">
                                    <span className="font-medium">{item.name}</span>
                                    {item.selectedSize && (
                                      <Badge variant="outline" className="text-xs px-1.5 py-0 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30">
                                        {item.selectedSize}
                                      </Badge>
                                    )}
                                    <span className="text-muted-foreground">×{item.quantity}</span>
                                  </span>
                                  <span className="font-semibold">₹{(item.price * item.quantity).toFixed(0)}</span>
                                </div>
                              ))}
                              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                                <span>Total</span>
                                <span className="text-primary">₹{group.totalPrice.toFixed(0)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Individual Orders */}
                          <div>
                            <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Individual Orders
                            </h4>
                            <div className="space-y-3">
                              {group.orders.map((order) => {
                                const isNew = newOrderIds.has(order.id);
                                const isCompleted = order.status === 'completed';
                                
                                return (
                                  <Card 
                                    key={order.id} 
                                    className={`p-3 md:p-4 ${
                                      isNew ? 'ring-2 ring-orange-500/50 bg-orange-500/5' : ''
                                    } ${isCompleted ? 'opacity-60' : ''}`}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                          {isNew && <Bell className="h-4 w-4 text-orange-500 animate-bounce" />}
                                          <span className="font-bold">#{order.order_number}</span>
                                          <Badge className={`${getStatusColor(order.status)} text-xs`} variant="outline">
                                            {order.status.toUpperCase()}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">
                                            {formatTime(order.created_at)}
                                          </span>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-1.5">
                                          {order.items?.items?.map((item: any, idx: number) => (
                                            <Badge 
                                              key={idx} 
                                              variant="secondary" 
                                              className="text-xs font-normal"
                                            >
                                              {item.name}
                                              {item.selectedSize && (
                                                <span className="ml-1 text-violet-600 dark:text-violet-400">
                                                  ({item.selectedSize})
                                                </span>
                                              )}
                                              {item.quantity > 1 && ` ×${item.quantity}`}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>

                                      {!isCompleted && (
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            variant={order.status === 'preparing' ? 'default' : 'outline'}
                                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                                            className="text-xs"
                                          >
                                            Preparing
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => updateOrderStatus(order.id, 'completed')}
                                            className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                          >
                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                            Complete
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {sessionGroups.length === 0 && (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {activeTab === 'active' && 'No active orders'}
            {activeTab === 'completed' && 'No completed orders'}
            {activeTab === 'all' && 'No orders yet'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {activeTab === 'active' && 'Active orders will appear here when customers place them'}
            {activeTab === 'completed' && 'Completed orders will appear here'}
            {activeTab === 'all' && 'Orders will appear here when customers place them'}
          </p>
          {(searchQuery || dateFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setDateFilter('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};

export default OrderManagement;
