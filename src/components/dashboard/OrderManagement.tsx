import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, Package, Bell, RefreshCw, ChevronDown, ChevronUp, 
  Users, ShoppingBag, Receipt, CheckCircle2, Timer, Utensils
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
}

interface TableGroup {
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

const GROUPING_WINDOW_MS = 90 * 60 * 1000; // 90 minutes

const OrderManagement = ({ restaurantId, newOrderTrigger, isVisible }: OrderManagementProps) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

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
        // Auto-expand the table group for new orders
        setExpandedTables(prev => new Set(prev).add(newOrderTrigger.table_number));
        
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

  // Group orders by table within 90-minute window
  const tableGroups = useMemo((): TableGroup[] => {
    const now = Date.now();
    const groups: Map<string, TableGroup> = new Map();

    // Filter orders within the grouping window (90 mins) or still active
    const relevantOrders = orders.filter(order => {
      const orderTime = new Date(order.created_at).getTime();
      const isWithinWindow = now - orderTime < GROUPING_WINDOW_MS;
      const isActive = order.status !== 'completed';
      return isWithinWindow || isActive;
    });

    relevantOrders.forEach(order => {
      const tableKey = order.table_number;
      
      if (!groups.has(tableKey)) {
        groups.set(tableKey, {
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

      const group = groups.get(tableKey)!;
      group.orders.push(order);
      
      // Track new orders
      if (newOrderIds.has(order.id)) {
        group.hasNewOrder = true;
      }

      // Track completion status
      if (order.status !== 'completed') {
        group.allCompleted = false;
      }

      // Update time range
      if (new Date(order.created_at) > new Date(group.latestOrderTime)) {
        group.latestOrderTime = order.created_at;
      }
      if (new Date(order.created_at) < new Date(group.earliestOrderTime)) {
        group.earliestOrderTime = order.created_at;
      }

      // Aggregate items
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

    // Sort groups: active tables first, then by latest order time
    return Array.from(groups.values()).sort((a, b) => {
      if (a.allCompleted !== b.allCompleted) {
        return a.allCompleted ? 1 : -1;
      }
      return new Date(b.latestOrderTime).getTime() - new Date(a.latestOrderTime).getTime();
    });
  }, [orders, newOrderIds]);

  const toggleTableExpand = (tableNumber: string) => {
    setExpandedTables(prev => {
      const updated = new Set(prev);
      if (updated.has(tableNumber)) {
        updated.delete(tableNumber);
      } else {
        updated.add(tableNumber);
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
    return `${hours}h ${mins % 60}m ago`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Stats
  const activeOrdersCount = orders.filter(o => o.status !== 'completed').length;
  const activeTables = tableGroups.filter(g => !g.allCompleted).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Order Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time order tracking grouped by table
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
        <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
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
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeTables}</p>
              <p className="text-xs text-muted-foreground">Active Tables</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{orders.filter(o => o.status === 'completed').length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/20">
              <ShoppingBag className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tableGroups.reduce((sum, g) => sum + g.totalItems, 0)}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Table Groups */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {tableGroups.map((group) => {
            const isExpanded = expandedTables.has(group.tableNumber);
            
            return (
              <motion.div
                key={group.tableNumber}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`overflow-hidden transition-all duration-300 ${
                  group.allCompleted 
                    ? 'opacity-60 bg-muted/30' 
                    : group.hasNewOrder 
                      ? 'ring-2 ring-orange-500/50 shadow-lg shadow-orange-500/10' 
                      : 'hover:shadow-md'
                }`}>
                  {/* Table Header - Clickable */}
                  <button
                    onClick={() => toggleTableExpand(group.tableNumber)}
                    className="w-full p-4 md:p-5 flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      {/* Table Icon */}
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
                      
                      {/* Table Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl md:text-2xl font-bold">
                            Table {group.tableNumber}
                          </h3>
                          {group.orders.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {group.orders.length} orders
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {getTimeAgo(group.latestOrderTime)}
                          </span>
                          <span>•</span>
                          <span>{group.totalItems} items</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Total & Expand */}
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
                                        <div className="flex items-center gap-2 mb-2">
                                          {isNew && <Bell className="h-4 w-4 text-orange-500 animate-bounce" />}
                                          <span className="font-bold">#{order.order_number}</span>
                                          <Badge className={`${getStatusColor(order.status)} text-xs`} variant="outline">
                                            {order.status.toUpperCase()}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">
                                            {formatTime(order.created_at)}
                                          </span>
                                        </div>
                                        
                                        {/* Order Items */}
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

                                      {/* Status Buttons */}
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
      {tableGroups.length === 0 && (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
          <p className="text-sm text-muted-foreground">
            Orders will appear here when customers place them
          </p>
        </Card>
      )}
    </div>
  );
};

export default OrderManagement;
