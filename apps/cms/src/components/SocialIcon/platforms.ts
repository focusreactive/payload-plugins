export const SOCIAL_PLATFORMS = [
  "instagram",
  "x",
  "facebook",
  "youtube",
  "github",
  "tiktok",
  "linkedin",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  github: "GitHub",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
};
