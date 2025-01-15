import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendEmail } from "@/utils/email";
import { Provider } from "@/types/provider";
import { generateTimeSlots, isSlotAvailable } from "@/utils/scheduling";

export const useBooking = (provider: Provider) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [loading, setLoading] = useState(false);

  // Fetch provider availability
  const { data: availability } = useQuery({
    queryKey: ["providerAvailability", provider.id, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;
      
      const dayOfWeek = selectedDate.getDay();
      const { data, error } = await supabase
        .from("provider_availability")
        .select("*")
        .eq("provider_id", provider.id)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate,
  });

  // Fetch existing appointments
  const { data: existingAppointments } = useQuery({
    queryKey: ["appointments", provider.id, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];
      
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("provider_id", provider.id)
        .eq("date", selectedDate.toISOString().split("T")[0]);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate,
  });

  const availableTimeSlots = availability
    ? generateTimeSlots(
        availability.start_time,
        availability.end_time,
        30,
        availability.break_start,
        availability.break_end
      ).filter((time) =>
        selectedDate && existingAppointments
          ? isSlotAvailable(selectedDate, time, existingAppointments)
          : true
      )
    : [];

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("appointments")
        .insert({
          patient_id: user.id,
          provider_id: provider.id,
          date: selectedDate.toISOString().split("T")[0],
          time: selectedTime,
          status: "scheduled",
          type: "general",
          duration: 30,
        });

      if (error) throw error;

      await sendEmail({
        type: "appointment_reminder",
        to: [user.email!],
        data: {
          date: selectedDate.toISOString().split("T")[0],
          time: selectedTime,
          provider: {
            first_name: provider.first_name,
            last_name: provider.last_name,
          },
        },
      });

      toast.success("Appointment booked successfully!");
      return true;
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error("Failed to book appointment");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedDate,
    setSelectedDate,
    selectedTime,
    setSelectedTime,
    loading,
    availableTimeSlots,
    handleBookAppointment,
  };
};