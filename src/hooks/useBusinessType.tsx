import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useBusinessType = (restaurantId: string | null) => {
  const [businessType, setBusinessType] = useState<'restaurant' | 'hotel'>('restaurant');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    const fetchBusinessType = async () => {
      try {
        const { data, error } = await supabase
          .from("restaurants")
          .select("business_type")
          .eq("id", restaurantId)
          .single();

        if (error) throw error;
        if (data) {
          setBusinessType(data.business_type || 'restaurant');
        }
      } catch (error) {
        console.error("Error fetching business type:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessType();
  }, [restaurantId]);

  // Helper function to get the correct label
  const getLocationLabel = (capitalize: boolean = true) => {
    const label = businessType === 'hotel' ? 'room' : 'table';
    return capitalize ? label.charAt(0).toUpperCase() + label.slice(1) : label;
  };

  return {
    businessType,
    loading,
    isHotel: businessType === 'hotel',
    isRestaurant: businessType === 'restaurant',
    locationLabel: getLocationLabel(true), // "Table" or "Room"
    locationLabelLower: getLocationLabel(false), // "table" or "room"
  };
};
