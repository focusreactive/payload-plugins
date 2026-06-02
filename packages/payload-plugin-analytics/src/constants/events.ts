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

export const LEAD_ACTION_EVENT_NAME = "lead_action" as const;

export const FR_LEAD_TYPE_PARAM = "fr_lead_type" as const;

export const BUILT_IN_LEAD_ACTION_TYPES = ["phone_click", "email_click", "directions_click", "whatsapp_click", "telegram_click", "website_click", "booking_click", "form_submit"] as const;

export type BuiltInLeadActionType = (typeof BUILT_IN_LEAD_ACTION_TYPES)[number];
