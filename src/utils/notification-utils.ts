
import { 
  AlertCircle, 
  Calendar, 
  MessageSquare, 
  Bell,
  AlertTriangle,
  CheckCircle2,
  Info
} from "lucide-react";

// Function to get appropriate icon based on notification type
export const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'appointment':
      return Calendar;
    case 'message':
      return MessageSquare;
    case 'alert':
      return AlertTriangle;
    case 'success':
      return CheckCircle2;
    case 'info':
      return Info;
    case 'system':
    default:
      return Bell;
  }
};
