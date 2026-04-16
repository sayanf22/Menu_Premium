import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, QrCode } from "lucide-react";
import { getClientFingerprint } from "@/lib/security";

/**
 * QR Code Landing Page - Creates a new session and redirects to menu
 * URL: /scan/:restaurantId          → single QR (no table pre-filled)
 * URL: /scan/:restaurantId?table=7  → per-table QR (table 7 pre-filled)
 */
const MenuSession = () => {
  const { restaurantId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Table number embedded in QR URL (per-table mode)
  const tableFromQR = searchParams.get("table");

  useEffect(() => {
    if (!restaurantId) {
      setError("Invalid QR code");
      return;
    }
    createSessionAndRedirect();
  }, [restaurantId]);

  const createSessionAndRedirect = async () => {
    try {
      const fingerprint = getClientFingerprint();

      const { data: sessionId, error: createError } = await supabase.rpc(
        "create_menu_session",
        {
          p_restaurant_id: restaurantId,
          p_table_number: tableFromQR || null,
          p_device_fingerprint: fingerprint,
        }
      );

      if (createError) {
        console.error("Session creation error:", createError);
        setError("Failed to start menu session. Please try again.");
        return;
      }

      if (!sessionId) {
        setError("Failed to create session");
        return;
      }

      // Build redirect URL — include table param so CustomerMenu pre-fills it
      const redirectUrl = tableFromQR
        ? `/menu/${restaurantId}?session=${sessionId}&table=${encodeURIComponent(tableFromQR)}`
        : `/menu/${restaurantId}?session=${sessionId}`;

      navigate(redirectUrl, { replace: true });
    } catch (err) {
      console.error("Error creating session:", err);
      setError("Something went wrong. Please scan the QR code again.");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-black p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <QrCode className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Oops!</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-6">{error}</p>
          <p className="text-sm text-zinc-400">
            Please scan the QR code at the restaurant to view the menu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-500">
      <div className="text-center text-white">
        <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
        <p className="text-lg font-medium">Loading menu...</p>
      </div>
    </div>
  );
};

export default MenuSession;
