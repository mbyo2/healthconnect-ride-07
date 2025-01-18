import { z } from "zod";

export const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
});

export const appointmentSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  type: z.string().min(1, "Appointment type is required"),
  notes: z.string().optional(),
});

export const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
  receiver_id: z.string().uuid("Invalid receiver ID"),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
export type AppointmentFormData = z.infer<typeof appointmentSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;