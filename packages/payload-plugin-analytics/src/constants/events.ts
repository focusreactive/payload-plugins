export const TRAFFIC_EVENTS = {
  PAGE_VIEW: "page_view",
  SESSION_START: "session_start",
  FIRST_VISIT: "first_visit",
  USER_ENGAGEMENT: "user_engagement",
} as const;

export const ENGAGEMENT_EVENTS = {
  SCROLL: "scroll",
  CLICK: "click",
  VIEW_SEARCH_RESULTS: "view_search_results",
  FORM_START: "form_start",
  FORM_SUBMIT: "form_submit",
  FILE_DOWNLOAD: "file_download",
  VIDEO_START: "video_start",
  VIDEO_PROGRESS: "video_progress",
  VIDEO_COMPLETE: "video_complete",
} as const;

export const LEAD_ACTION_EVENTS = {
  PHONE_CLICK: "phone_click",
  EMAIL_CLICK: "email_click",
  DIRECTIONS_CLICK: "directions_click",
  WHATSAPP_CLICK: "whatsapp_click",
  TELEGRAM_CLICK: "telegram_click",
  WEBSITE_CLICK: "website_click",
  BOOKING_CLICK: "booking_click",
  FORM_SUBMIT: "form_submit",
} as const;
