import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, Package, Bell, X } from "lucide-react";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Order {
  id: string;
  order_number: string;
  table_number: string;
  items: any;
  status: string;
  created_at: string;
}

interface OrderManagementProps {
  restaurantId: string;
  onNewOrder?: (order: Order) => void;
  newOrderTrigger?: Order | null; // Receives new orders from parent
  isVisible?: boolean; // Whether the component is currently visible
}

const OrderManagement = ({ restaurantId, onNewOrder, newOrderTrigger, isVisible }: OrderManagementProps) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const lastFetchTime = useRef<number>(0);

  // Sound and notification now handled at Dashboard level

  useEffect(() => {
    // Always fetch fresh data when component mounts
    console.log('🔄 OrderManagement: Component mounted, fetching orders');
    fetchOrders();
    subscribeToOrders();

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [restaurantId]);

  // Refetch when component becomes visible
  useEffect(() => {
    if (isVisible) {
      console.log('👁️ OrderManagement: Became visible, refetching orders');
      fetchOrders();
    }
  }, [isVisible]);

  // Handle new orders from parent (Dashboard realtime subscription)
  useEffect(() => {
    console.log('🔄 OrderManagement: newOrderTrigger changed', newOrderTrigger);
    
    if (newOrderTrigger && newOrderTrigger.id) {
      console.log('📥 OrderManagement: Received new order from parent', newOrderTrigger);
      console.log('📋 Current orders count:', orders.length);
      
      // Force immediate state update
      setOrders(currentOrders => {
        const exists = currentOrders.some(o => o.id === newOrderTrigger.id);
        if (exists) {
          console.log('⚠️ Order already in list, skipping');
          return currentOrders;
        }
        console.log('✅ Adding new order to list from parent');
        const newList = [newOrderTrigger, ...currentOrders];
        console.log('📊 New orders count:', newList.length);
        
        // Also highlight the new order
        setNewOrderIds(prev => new Set(prev).add(newOrderTrigger.id));
        
        // Remove highlight after 10 seconds
        setTimeout(() => {
          setNewOrderIds(prev => {
            const updated = new Set(prev);
            updated.delete(newOrderTrigger.id);
            return updated;
          });
        }, 10000);
        
        return newList;
      });
    } else {
      console.log('⚠️ OrderManagement: newOrderTrigger is null/undefined or missing id');
    }
  }, [newOrderTrigger]); // Watch for any changes to newOrderTrigger

  const fetchOrders = async () => {
    try {
      console.log("📥 Fetching orders for restaurant:", restaurantId);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      console.log("✅ Orders fetched:", data?.length, "orders");

      if (error) throw error;
      setOrders(data || []);
      
      toast({
        title: "Orders Refreshed",
        description: `Loaded ${data?.length || 0} orders`,
        duration: 2000,
      });
    } catch (error: any) {
      console.error("❌ Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    }
  };

  const subscribeToOrders = () => {
    // Clean up existing channel if any
    if (channelRef.current) {
      console.log('🔕 OrderManagement: Removing existing channel');
      supabase.removeChannel(channelRef.current);
    }

    console.log('🔔 OrderManagement: Setting up UPDATE subscription for restaurant:', restaurantId);

    // Create a unique channel for this restaurant
    // Only subscribe to UPDATE events (INSERT handled by Dashboard)
    const channelName = `order-management-updates-${restaurantId}-${Date.now()}`;
    console.log('📡 OrderManagement channel:', channelName);

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
          console.log('📝 OrderManagement: Order updated via Realtime:', payload);
          // Optimistically update order in state
          const updatedOrder = payload.new as Order;
          setOrders(prev => prev.map(order =>
            order.id === updatedOrder.id ? updatedOrder : order
          ));
        }
      )
      .subscribe((status, err) => {
        console.log('🔔 OrderManagement subscription status:', status);
        if (err) {
          console.error('❌ Subscription error:', err);
        }

        if (status === 'SUBSCRIBED') {
          console.log('✅ OrderManagement realtime connected!');
          console.log('👂 Listening for order updates on restaurant:', restaurantId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime connection error');
          toast({
            title: "⚠️ Connection Issue",
            description: "Realtime updates may not work. Please refresh.",
            variant: "destructive",
            duration: 5000,
          });
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Realtime connection timed out');
          toast({
            title: "⚠️ Connection Timeout",
            description: "Retrying connection...",
            variant: "destructive",
            duration: 3000,
          });
        } else if (status === 'CLOSED') {
          console.log('🔕 Realtime connection closed');
        }
      });
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // Optimistic update
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
      // Revert on error
      fetchOrders();
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "preparing":
        return "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/50";
      case "completed":
        return "bg-gray-500/10 text-gray-600 dark:text-gray-500 border-gray-400/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const isCompleted = (status: string) => status === "completed";

  const statusFlow = ["preparing", "completed"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Order Management</h2>
          <p className="text-sm md:text-base text-muted-foreground">Track and manage customer orders in real-time</p>
        </div>
        <Button 
          onClick={fetchOrders} 
          variant="outline"
          className="gap-2 w-full sm:w-auto"
        >
          <Package className="h-4 w-4" />
          Refresh Orders
        </Button>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => {
          const completed = isCompleted(order.status);
          const isNew = newOrderIds.has(order.id);

          return (
            <Card
              key={order.id}
              className={`
                transition-all duration-500
                ${completed
                  ? 'opacity-60 grayscale bg-muted/30 border-muted'
                  : 'hover:shadow-lg border-2'
                }
                ${isNew ? 'ring-4 ring-orange-500/50 animate-pulse' : ''}
              `}
            >
              <CardHeader className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div className="flex-1">
                    <CardTitle className={`flex items-center gap-2 md:gap-3 ${completed ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl font-bold'}`}>
                      {isNew && <Bell className="h-5 w-5 md:h-6 md:w-6 text-orange-500 animate-bounce" />}
                      <Package className={`${completed ? 'h-4 w-4 md:h-5 md:w-5' : 'h-5 w-5 md:h-7 md:w-7'} ${completed ? 'text-muted-foreground' : 'text-primary'}`} />
                      <span className={completed ? 'text-muted-foreground' : 'text-foreground'}>
                        Order #{order.order_number}
                      </span>
                    </CardTitle>
                    <p className={`${completed ? 'text-sm' : 'text-base md:text-lg font-semibold'} mt-1 md:mt-2 ${completed ? 'text-muted-foreground' : 'text-primary'}`}>
                      Table {order.table_number}
                    </p>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-0 w-full sm:w-auto">
                    <Badge className={`${getStatusColor(order.status)} border-2 px-2 md:px-3 py-1 text-xs md:text-sm font-bold`}>
                      {order.status.toUpperCase()}
                    </Badge>
                    <p className={`text-xs mt-0 sm:mt-2 flex items-center gap-1 ${completed ? 'text-muted-foreground' : 'text-foreground'}`}>
                      <Clock className="h-3 w-3" />
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 md:p-6 pt-0 md:pt-0">
                <div>
                  <h4 className={`font-semibold mb-2 md:mb-3 ${completed ? 'text-sm' : 'text-base md:text-lg'} ${completed ? 'text-muted-foreground' : 'text-foreground'}`}>
                    Items:
                  </h4>
                  <ul className="space-y-1.5 md:space-y-2">
                    {order.items?.items?.map((item: any, index: number) => (
                      <li
                        key={index}
                        className={`flex justify-between items-center ${completed ? 'text-sm' : 'text-base md:text-lg font-medium'} ${completed ? 'text-muted-foreground' : 'text-foreground'}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`${completed ? 'text-base' : 'text-lg md:text-xl'}`}>•</span>
                          <span className={completed ? '' : 'font-semibold'}>{item.name}</span>
                        </span>
                        <span className={`${completed ? 'text-sm' : 'text-base md:text-lg font-bold'} ${completed ? 'text-muted-foreground' : 'text-primary'}`}>
                          ₹{item.price}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Total Price */}
                  <div className={`flex justify-between items-center pt-2 md:pt-3 mt-2 md:mt-3 border-t ${completed ? 'border-muted' : 'border-primary/20'}`}>
                    <span className={`${completed ? 'text-sm font-medium' : 'text-lg md:text-xl font-bold'} ${completed ? 'text-muted-foreground' : 'text-foreground'}`}>
                      Total:
                    </span>
                    <span className={`${completed ? 'text-base font-semibold' : 'text-xl md:text-2xl font-bold'} ${completed ? 'text-muted-foreground' : 'text-primary'}`}>
                      ₹{order.items?.items?.reduce((sum: number, item: any) => sum + (parseFloat(item.price) || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Only show action buttons for non-completed orders */}
                {!completed && (
                  <div className="flex gap-2 flex-wrap pt-2">
                    {statusFlow.map((status) => (
                      <Button
                        key={status}
                        size="default"
                        variant={order.status === status ? "default" : "outline"}
                        onClick={() => updateOrderStatus(order.id, status)}
                        className="font-semibold flex-1 sm:flex-none text-sm"
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {orders.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No orders yet</p>
          <p className="text-sm text-muted-foreground mt-2">Orders will appear here when customers place them</p>
        </Card>
      )}
    </div>
  );
};

export default OrderManagement;