import {
  Phone,
  Mail,
  Navigation,
  MessageCircle,
  Send,
  ExternalLink,
  CalendarCheck,
  FormInput,
} from "lucide-react";
import type { LeadActionRegistry } from "../../types/leadActions";

export const BUILT_IN_LEAD_ACTION_REGISTRY: LeadActionRegistry = {
  phone_click: { icon: Phone, label: "Phone click" },
  email_click: { icon: Mail, label: "Email click" },
  directions_click: { icon: Navigation, label: "Directions" },
  whatsapp_click: { icon: MessageCircle, label: "WhatsApp click" },
  telegram_click: { icon: Send, label: "Telegram click" },
  website_click: { icon: ExternalLink, label: "Website click" },
  booking_click: { icon: CalendarCheck, label: "Booking click" },
  form_submit: { icon: FormInput, label: "Form submit" },
};
