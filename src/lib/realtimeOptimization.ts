/**
 * Realtime Connection Optimization
 * Automatically disconnects when tab is hidden, reconnects when visible
 * Saves Supabase free tier concurrent connection limits
 */

import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

// Store for managing reconnection callbacks
type ReconnectCallback = () => void;
const reconnectCallbacks = new Map<string, ReconnectCallback>();
let isTabVisible = !document.hidden;
let visibilityListenerSetup = false;

/**
 * Setup global visibility change listener (call once in App.tsx)
 * Only affects customer menu pages, NOT the dashboard
 */
export function setupVisibilityOptimization() {
  if (visibilityListenerSetup) return () => {};
  visibilityListenerSetup = true;

  const handleVisibilityChange = () => {
    const wasVisible = isTabVisible;
    isTabVisible = !document.hidden;

    // Skip optimization for dashboard pages - they need to stay connected
    const isDashboard = window.location.pathname.includes("/dashboard") || 
                        window.location.pathname.includes("/admindashboard");
    
    if (isDashboard) {
      console.log("👁️ Dashboard detected - keeping connections alive");
      return;
    }

    if (!isTabVisible && wasVisible) {
      // Tab became hidden - disconnect customer menu realtime only
      console.log("👁️ Tab hidden - pausing customer menu connections");
      // Only remove channels registered for reconnection (customer menu)
      reconnectCallbacks.forEach((_, key) => {
        const channels = supabase.getChannels();
        const channel = channels.find(c => c.topic.includes(key));
        if (channel) {
          supabase.removeChannel(channel);
        }
      });
    } else if (isTabVisible && !wasVisible) {
      // Tab became visible - trigger reconnections for customer menu
      console.log("👁️ Tab visible - resuming customer menu connections");
      reconnectCallbacks.forEach((callback, key) => {
        console.log(`🔄 Reconnecting: ${key}`);
        try {
          callback();
        } catch (e) {
          console.error(`Failed to reconnect ${key}:`, e);
        }
      });
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    visibilityListenerSetup = false;
  };
}

/**
 * Register a reconnection callback for a specific subscription
 * Call this when setting up a realtime subscription
 */
export function registerReconnectCallback(key: string, callback: ReconnectCallback) {
  reconnectCallbacks.set(key, callback);
}

/**
 * Unregister a reconnection callback
 * Call this when cleaning up a subscription
 */
export function unregisterReconnectCallback(key: string) {
  reconnectCallbacks.delete(key);
}

/**
 * Check if tab is currently visible
 */
export function isPageVisible(): boolean {
  return isTabVisible;
}

/**
 * Create a managed realtime subscription that auto-reconnects
 */
export function createManagedSubscription(
  channelName: string,
  setupFn: () => RealtimeChannel,
  onReconnect?: () => void
): { channel: RealtimeChannel; cleanup: () => void } {
  let channel = setupFn();

  const reconnect = () => {
    // Remove old channel if exists
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      // Ignore
    }
    // Create new channel
    channel = setupFn();
    if (onReconnect) onReconnect();
  };

  // Register for auto-reconnect
  registerReconnectCallback(channelName, reconnect);

  const cleanup = () => {
    unregisterReconnectCallback(channelName);
    try {
      supabase.removeChannel(channel);
    } catch (e) {
      // Ignore
    }
  };

  return { channel, cleanup };
}

/**
 * Debounce realtime updates to reduce processing
 */
export function createDebouncedCallback<T>(
  callback: (data: T) => void,
  delay: number = 500
): (data: T) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (data: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(data), delay);
  };
}

/**
 * Get current connection count
 */
export function getConnectionCount(): number {
  return supabase.getChannels().length;
}

/**
 * Log connection status (for debugging)
 */
export function logConnectionStatus() {
  const channels = supabase.getChannels();
  console.log(`📡 Active connections: ${channels.length}`);
  channels.forEach((c) => console.log(`  - ${c.topic}`));
}
