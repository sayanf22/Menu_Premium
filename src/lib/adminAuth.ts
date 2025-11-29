import { supabase } from "@/integrations/supabase/client";

export interface AdminSession {
  email: string;
  loginTime: number;
  sessionToken: string; // Add session token for additional security
}

const ADMIN_SESSION_KEY = "admin_session";
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

// Generate a secure session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function authenticateAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Call the RPC function to verify password
    const { data, error } = await supabase.rpc("verify_admin_password", {
      p_email: email,
      p_password: password,
    });

    if (error) {
      console.error("Authentication error:", error);
      return { success: false, error: "Authentication failed" };
    }

    if (data === true) {
      // Create session with secure token
      const session: AdminSession = {
        email,
        loginTime: Date.now(),
        sessionToken: generateSessionToken(),
      };
      // Use sessionStorage instead of localStorage for better security
      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));

      // Log the login action
      await supabase.from("admin_actions_log").insert({
        admin_email: email,
        action_type: "login",
        details: { timestamp: new Date().toISOString() },
      });

      return { success: true };
    }

    return { success: false, error: "Invalid email or password" };
  } catch (error) {
    console.error("Authentication error:", error);
    return { success: false, error: "Connection error. Please try again" };
  }
}

export function getAdminSession(): AdminSession | null {
  try {
    const sessionStr = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionStr) return null;

    const session: AdminSession = JSON.parse(sessionStr);

    // Validate session structure
    if (!session.email || !session.loginTime || !session.sessionToken) {
      clearAdminSession();
      return null;
    }

    // Check if session has expired
    if (Date.now() - session.loginTime > SESSION_TIMEOUT) {
      clearAdminSession();
      return null;
    }

    return session;
  } catch {
    clearAdminSession();
    return null;
  }
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function isAdminAuthenticated(): boolean {
  return getAdminSession() !== null;
}
