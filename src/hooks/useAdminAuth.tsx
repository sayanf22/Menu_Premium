import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  authenticateAdmin,
  getAdminSession,
  clearAdminSession,
  isAdminAuthenticated,
  AdminSession,
} from "@/lib/adminAuth";

export function useAdminAuth() {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session on mount
    const currentSession = getAdminSession();
    setSession(currentSession);
    setIsLoading(false);

    // Set up session check interval (every minute)
    const interval = setInterval(() => {
      const currentSession = getAdminSession();
      if (!currentSession && session) {
        // Session expired
        setSession(null);
        navigate("/admindashboard/login");
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [navigate, session]);

  const login = async (email: string, password: string) => {
    const result = await authenticateAdmin(email, password);
    if (result.success) {
      const newSession = getAdminSession();
      setSession(newSession);
      return { success: true };
    }
    return result;
  };

  const logout = () => {
    clearAdminSession();
    setSession(null);
    navigate("/admindashboard/login");
  };

  const requireAuth = () => {
    if (!isAdminAuthenticated()) {
      navigate("/admindashboard/login");
      return false;
    }
    return true;
  };

  return {
    session,
    isLoading,
    isAuthenticated: !!session,
    login,
    logout,
    requireAuth,
  };
}
