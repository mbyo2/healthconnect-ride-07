import { supabase } from "@/integrations/supabase/client";

type EmailType = "appointment_reminder" | "payment_confirmation" | "registration_confirmation";

interface SendEmailParams {
  type: EmailType;
  to: string[];
  data: Record<string, any>;
}

export const sendEmail = async ({ type, to, data }: SendEmailParams) => {
  try {
    const { data: response, error } = await supabase.functions.invoke("send-email", {
      body: { type, to, data },
    });

    if (error) throw error;
    return response;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};