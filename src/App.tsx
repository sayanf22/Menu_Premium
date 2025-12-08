import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { setupVisibilityOptimization } from "@/lib/realtimeOptimization";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import Auth from "./pages/Auth";
import DashboardWithSidebar from "./pages/DashboardWithSidebar";
import MenuOnlyDashboard from "./pages/MenuOnlyDashboard";
import CustomerMenu from "./pages/CustomerMenu";
import CustomerMenuRouter from "./pages/CustomerMenuRouter";
import MenuSession from "./pages/MenuSession";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboardWithSidebar from "./pages/AdminDashboardWithSidebar";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
// Policy pages for Razorpay verification
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import ShippingPolicy from "./pages/ShippingPolicy";
import Contact from "./pages/Contact";
import Pricing from "./pages/Pricing";
import About from "./pages/About";

// Configure React Query with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute default
      gcTime: 5 * 60 * 1000, // 5 minutes cache time
      retry: 1, // Retry failed requests once
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: true, // Refetch on reconnect
    },
  },
});

const App = () => {
  // Setup realtime optimization on app mount
  useEffect(() => {
    const cleanup = setupVisibilityOptimization();
    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SubscriptionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<DashboardWithSidebar />} />
              <Route path="/menu-dashboard" element={<MenuOnlyDashboard />} />
              <Route path="/scan/:restaurantId" element={<MenuSession />} />
              <Route path="/menu/:restaurantId" element={<CustomerMenuRouter />} />
              <Route path="/admindashboard/login" element={<AdminLogin />} />
              <Route path="/admindashboard" element={<AdminDashboardWithSidebar />} />
              {/* Policy pages for Razorpay verification */}
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/shipping-policy" element={<ShippingPolicy />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </QueryClientProvider>
  );
};

export default App;
