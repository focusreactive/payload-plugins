import type { LeadActionKind } from "../../../types/events";

export const LEAD_ACTION_LABELS: Record<LeadActionKind, string> = {
  phone_click: "Phone click",
  email_click: "Email click",
  directions_click: "Directions",
  whatsapp_click: "WhatsApp click",
  telegram_click: "Telegram click",
  website_click: "Website click",
  booking_click: "Booking click",
  form_submit: "Form submit",
};
