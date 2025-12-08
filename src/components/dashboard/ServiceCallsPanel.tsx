import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, User, Droplets, Receipt, Check, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ServiceCall {
  id: string;
  restaurant_id: string;
  table_number: string;
  call_type: "waiter" | "water" | "bill";
  status: "pending" | "acknowledged" | "completed";
  created_at: string;
  acknowledged_at: string | null;
  completed_at: string | null;
}

interface ServiceCallsPanelProps {
  restaurantId: string;
  onNewCall?: (call: ServiceCall) => void;
}

const CALL_CONFIG = {
  waiter: { icon: User, label: "Waiter", color: "bg-blue-500", lightBg: "bg-blue-50 dark:bg-blue-900/20" },
  water: { icon: Droplets, label: "Water", color: "bg-cyan-500", lightBg: "bg-cyan-50 dark:bg-cyan-900/20" },
  bill: { icon: Receipt, label: "Bill", color: "bg-green-500", lightBg: "bg-green-50 dark:bg-green-900/20" },
};

const ServiceCallsPanel = ({ restaurantId, onNewCall }: ServiceCallsPanelProps) => {
  const { toast } = useToast();
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processedCallIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  useEffect(() => {
    fetchCalls();
    subscribeToServiceCalls();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [restaurantId]);

  const fetchCalls = async () => {
    try {
      const { data, error } = await supabase
        .from("service_calls")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .in("status", ["pending", "acknowledged"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setCalls((data || []) as ServiceCall[]);
      // Mark existing calls as processed to avoid sound on initial load
      ((data || []) as ServiceCall[]).forEach(call => processedCallIds.current.add(call.id));
      initialLoadDone.current = true;
    } catch (error) {
      console.error("Error fetching service calls:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToServiceCalls = () => {
    const channelName = `service-calls-dashboard-${restaurantId}-${Date.now()}`;
    
    channelRef.current = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_calls",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const newCall = payload.new as ServiceCall;
          
          // Skip if already processed
          if (processedCallIds.current.has(newCall.id)) return;
          processedCallIds.current.add(newCall.id);
          
          setCalls(prev => [newCall, ...prev]);
          
          // Only play sound and show notification after initial load
          if (initialLoadDone.current) {
            playNotificationSound();
            onNewCall?.(newCall);
            
            toast({
              title: `🔔 ${CALL_CONFIG[newCall.call_type].label} Request!`,
              description: `Table ${newCall.table_number} needs ${newCall.call_type}`,
              duration: 10000,
            });

            // Vibrate on mobile
            if ("vibrate" in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_calls",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const updated = payload.new as ServiceCall;
          setCalls(prev => {
            if (updated.status === "completed") {
              return prev.filter(c => c.id !== updated.id);
            }
            return prev.map(c => c.id === updated.id ? updated : c);
          });
        }
      )
      .subscribe();
  };

  // Bell ringing sound notification (plays for 6+ seconds)
  const playNotificationSound = () => {
    // Clear any existing sound interval
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") ctx.resume();

    let ringCount = 0;
    const maxRings = 8; // 8 rings over ~6-7 seconds

    const playBellRing = () => {
      if (ringCount >= maxRings) {
        if (soundIntervalRef.current) {
          clearInterval(soundIntervalRef.current);
          soundIntervalRef.current = null;
        }
        return;
      }

      const now = ctx.currentTime;
      
      // Create a realistic bell sound with multiple harmonics
      const bellFrequencies = [
        { freq: 830, gain: 0.4 },   // Main bell tone (high)
        { freq: 1245, gain: 0.25 }, // First harmonic
        { freq: 1660, gain: 0.15 }, // Second harmonic
        { freq: 415, gain: 0.2 },   // Lower undertone
      ];

      bellFrequencies.forEach(({ freq, gain: gainValue }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.frequency.value = freq;
        osc.type = "sine";
        
        // Bell-like envelope: quick attack, long decay
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(gainValue, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(gainValue * 0.3, now + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        osc.start(now);
        osc.stop(now + 0.6);
      });

      // Add a second strike for "ding-dong" effect
      setTimeout(() => {
        const now2 = ctx.currentTime;
        const secondBellFreqs = [
          { freq: 622, gain: 0.35 },  // Lower tone for "dong"
          { freq: 933, gain: 0.2 },
          { freq: 1244, gain: 0.1 },
        ];

        secondBellFreqs.forEach(({ freq, gain: gainValue }) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.frequency.value = freq;
          osc.type = "sine";
          
          gainNode.gain.setValueAtTime(0, now2);
          gainNode.gain.linearRampToValueAtTime(gainValue, now2 + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(gainValue * 0.3, now2 + 0.15);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now2 + 0.5);
          
          osc.start(now2);
          osc.stop(now2 + 0.5);
        });
      }, 200);

      ringCount++;
    };

    // Play immediately and then every 800ms for ding-dong pattern
    playBellRing();
    soundIntervalRef.current = setInterval(playBellRing, 800);
  };

  // Stop sound when component unmounts or when all calls are handled
  useEffect(() => {
    return () => {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
      }
    };
  }, []);

  const updateCallStatus = async (callId: string, status: "acknowledged" | "completed") => {
    try {
      const updateData: any = { status };
      if (status === "acknowledged") updateData.acknowledged_at = new Date().toISOString();
      if (status === "completed") updateData.completed_at = new Date().toISOString();

      const { error } = await supabase
        .from("service_calls")
        .update(updateData)
        .eq("id", callId);

      if (error) throw error;

      // Optimistic update
      setCalls(prev => {
        if (status === "completed") {
          return prev.filter(c => c.id !== callId);
        }
        return prev.map(c => c.id === callId ? { ...c, ...updateData } : c);
      });

      toast({
        title: status === "acknowledged" ? "👍 Acknowledged" : "✅ Completed",
        description: `Request marked as ${status}`,
        duration: 2000,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update request",
        variant: "destructive",
      });
    }
  };

  const pendingCalls = calls.filter(c => c.status === "pending");

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getTimeSince = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Service Calls</h3>
            <p className="text-sm text-muted-foreground">
              {calls.length === 0 ? "No active requests" : `${calls.length} active request${calls.length > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        {pendingCalls.length > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            {pendingCalls.length} Pending
          </Badge>
        )}
      </div>

      {/* Calls List */}
      {calls.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No service requests</p>
          <p className="text-sm text-muted-foreground mt-1">
            Requests from customers will appear here
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {calls.map((call) => {
              const config = CALL_CONFIG[call.call_type];
              const Icon = config.icon;
              const isPending = call.status === "pending";

              return (
                <motion.div
                  key={call.id}
                  layout
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 100, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <Card className={`overflow-hidden ${isPending ? "ring-2 ring-orange-500 shadow-lg" : ""}`}>
                    <div className={`p-4 ${config.lightBg}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">Table {call.table_number}</span>
                              <Badge variant="destructive" className="animate-pulse">
                                {CALL_CONFIG[call.call_type].label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(call.created_at)} • {getTimeSince(call.created_at)}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            // Stop sound when marking as done
                            if (soundIntervalRef.current) {
                              clearInterval(soundIntervalRef.current);
                              soundIntervalRef.current = null;
                            }
                            updateCallStatus(call.id, "completed");
                          }}
                          className="gap-1 bg-green-500 hover:bg-green-600"
                        >
                          <Check className="w-4 h-4" />
                          Done
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ServiceCallsPanel;
