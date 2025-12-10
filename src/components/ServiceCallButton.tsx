import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, User, Droplets, Receipt, X, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isRateLimited, getClientFingerprint } from "@/lib/security";

interface ServiceCallButtonProps {
  restaurantId: string;
  tableNumber?: string;
  disabled?: boolean;
}

const SERVICE_OPTIONS = [
  { type: "waiter", label: "Waiter", icon: User, color: "from-blue-500 to-indigo-500" },
  { type: "water", label: "Water", icon: Droplets, color: "from-cyan-500 to-blue-500" },
  { type: "bill", label: "Bill", icon: Receipt, color: "from-green-500 to-emerald-500" },
] as const;

type CallType = typeof SERVICE_OPTIONS[number]["type"];

const ServiceCallButton = ({ restaurantId, tableNumber: propTableNumber, disabled }: ServiceCallButtonProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<CallType | null>(null);
  const [recentCalls, setRecentCalls] = useState<Record<CallType, boolean>>({
    waiter: false,
    water: false,
    bill: false,
  });
  const [, setPendingCalls] = useState<any[]>([]);
  const channelRef = useRef<any>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [localTableNumber, setLocalTableNumber] = useState(() => 
    localStorage.getItem(`service_table_${restaurantId}`) || ""
  );
  
  // Use prop table number if provided, otherwise use local state
  const tableNumber = propTableNumber || localTableNumber;
  
  // Save table number to localStorage when changed
  const handleTableNumberChange = (value: string) => {
    setLocalTableNumber(value);
    if (value) {
      localStorage.setItem(`service_table_${restaurantId}`, value);
    }
  };

  // Auto-close realtime connection after 2 minutes of inactivity
  const resetAutoCloseTimer = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    autoCloseTimerRef.current = setTimeout(() => {
      // Close the modal and disconnect realtime after 2 minutes
      setIsOpen(false);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }, 2 * 60 * 1000); // 2 minutes
  };

  // Cleanup auto-close timer on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  // Subscribe to realtime updates only when modal is open
  useEffect(() => {
    if (!isOpen || !restaurantId || !tableNumber) return;

    // Start auto-close timer when modal opens
    resetAutoCloseTimer();

    // Fetch existing pending calls for this table
    const fetchPendingCalls = async () => {
      const { data } = await supabase
        .from("service_calls")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("table_number", tableNumber)
        .in("status", ["pending", "acknowledged"])
        .order("created_at", { ascending: false });
      
      if (data) {
        setPendingCalls(data);
        // Mark recent calls
        const recent: Record<CallType, boolean> = { waiter: false, water: false, bill: false };
        data.forEach(call => {
          if (call.status === "pending" || call.status === "acknowledged") {
            recent[call.call_type as CallType] = true;
          }
        });
        setRecentCalls(recent);
      }
    };

    fetchPendingCalls();

    // Subscribe to updates
    const channelName = `service-calls-${restaurantId}-${tableNumber}-${Date.now()}`;
    channelRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_calls",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newCall = payload.new as any;
            if (newCall.table_number === tableNumber) {
              setPendingCalls(prev => [newCall, ...prev]);
              setRecentCalls(prev => ({ ...prev, [newCall.call_type]: true }));
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as any;
            if (updated.table_number === tableNumber) {
              setPendingCalls(prev => 
                prev.map(c => c.id === updated.id ? updated : c)
                  .filter(c => c.status !== "completed")
              );
              if (updated.status === "completed") {
                setRecentCalls(prev => ({ ...prev, [updated.call_type]: false }));
                toast({
                  title: "✅ Request Completed",
                  description: `Your ${updated.call_type} request has been handled`,
                  duration: 3000,
                });
              } else if (updated.status === "acknowledged") {
                toast({
                  title: "👍 Request Acknowledged",
                  description: `Staff is on the way for your ${updated.call_type} request`,
                  duration: 3000,
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [isOpen, restaurantId, tableNumber, toast]);

  const handleServiceCall = async (callType: CallType) => {
    if (!tableNumber) {
      toast({
        title: "Table number required",
        description: "Please enter your table number first",
        variant: "destructive",
      });
      return;
    }

    // Reset auto-close timer on user activity
    resetAutoCloseTimer();

    // Rate limit: 3 calls per minute per type
    const rateLimitKey = `service_call_${callType}_${getClientFingerprint()}`;
    if (isRateLimited(rateLimitKey, { maxRequests: 3, windowMs: 60000 })) {
      toast({
        title: "Please wait",
        description: "You've made too many requests. Try again in a minute.",
        variant: "destructive",
      });
      return;
    }

    // Check if there's already a pending call of this type
    if (recentCalls[callType]) {
      toast({
        title: "Request already sent",
        description: `Your ${callType} request is being processed`,
        variant: "default",
      });
      return;
    }

    setLoading(callType);

    try {
      const { error } = await supabase
        .from("service_calls")
        .insert({
          restaurant_id: restaurantId,
          table_number: tableNumber,
          call_type: callType,
          status: "pending",
        });

      if (error) throw error;

      setRecentCalls(prev => ({ ...prev, [callType]: true }));
      
      toast({
        title: "🔔 Request Sent!",
        description: `${callType.charAt(0).toUpperCase() + callType.slice(1)} request sent to staff`,
        duration: 3000,
      });

      // Vibrate on mobile
      if ("vibrate" in navigator) {
        navigator.vibrate(100);
      }
    } catch (err: any) {
      toast({
        title: "Failed to send request",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  if (disabled) return null;

  return (
    <>
      {/* Floating Bell Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.5 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-4 z-40 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
        {Object.values(recentCalls).some(v => v) && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </motion.button>

      {/* Service Call Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm sm:w-full"
            >
              <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Call Staff</h3>
                        {tableNumber ? (
                          <p className="text-white/80 text-sm">Table {tableNumber}</p>
                        ) : (
                          <p className="text-white/80 text-sm">Enter your table number</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Table Number Input (only if not provided) */}
                {!propTableNumber && (
                  <div className="px-4 pt-4">
                    <Input
                      type="text"
                      placeholder="Enter table number"
                      value={localTableNumber}
                      onChange={(e) => handleTableNumberChange(e.target.value)}
                      className="h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-center text-lg font-semibold"
                      maxLength={10}
                    />
                  </div>
                )}

                {/* Options */}
                <div className="p-4 space-y-3">
                  {SERVICE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isPending = recentCalls[option.type];
                    const isLoading = loading === option.type;

                    return (
                      <motion.button
                        key={option.type}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleServiceCall(option.type)}
                        disabled={isLoading || isPending}
                        className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${
                          isPending
                            ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-500"
                            : "bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-2 border-transparent"
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center text-white shadow-lg`}>
                          {isLoading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : isPending ? (
                            <Check className="w-6 h-6" />
                          ) : (
                            <Icon className="w-6 h-6" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-zinc-900 dark:text-white">
                            {option.label}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {isPending ? "Request sent ✓" : `Request ${option.label.toLowerCase()}`}
                          </p>
                        </div>
                        {isPending && (
                          <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                            Sent
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-4 pb-4">
                  <p className="text-center text-xs text-zinc-400">
                    Staff will be notified immediately
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ServiceCallButton;
