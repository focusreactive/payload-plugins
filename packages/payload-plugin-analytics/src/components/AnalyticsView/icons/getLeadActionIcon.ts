import {
  Phone,
  Mail,
  Navigation,
  MessageCircle,
  Send,
  ExternalLink,
  CalendarCheck,
  FormInput,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { LeadActionKind } from "../../../types/events";

const MAP: Record<LeadActionKind, LucideIcon> = {
  phone_click: Phone,
  email_click: Mail,
  directions_click: Navigation,
  whatsapp_click: MessageCircle,
  telegram_click: Send,
  website_click: ExternalLink,
  booking_click: CalendarCheck,
  form_submit: FormInput,
};

export function getLeadActionIcon(kind: LeadActionKind): LucideIcon {
  return MAP[kind] ?? Zap;
}
