/**
 * Information architecture of the new site (plan §7): every page, where its content comes from in
 * the dump ("2.x" entry numbers) and the template recipe that builds it (§6.8).
 */

export type Recipe =
  | "HOME"
  | "HUB"
  | "SERVICE"
  | "SECTOR"
  | "SOLUTION"
  | "ABOUT"
  | "CAREERS"
  | "JD"
  | "LISTING"
  | "CASE_STUDIES"
  | "REPORTS"
  | "EVENTS"
  | "CAMPAIGN"
  | "CONTACT"
  | "LEGAL";

export interface IaPage {
  /** New path ("/" for home). */
  path: string;
  /** Page slug (last path segment; "home" for "/"). */
  slug: string;
  /** Parent path for nested docs (null = top level). */
  parent: string | null;
  title: string;
  /** Dump entry numbers this page is built from (empty = composed, no dump source). */
  sources: string[];
  recipe: Recipe;
  /** Sector filter for caseStudies on sector pages. */
  sector?: "automotive" | "agritech" | "finance" | "medical";
  /** Tag slug for the page's postsList. */
  tag?: string;
  /** Short description used on hub cards and in menus. */
  summary?: string;
}

const page = (
  path: string,
  title: string,
  sources: string[],
  recipe: Recipe,
  extra: Partial<IaPage> = {}
): IaPage => {
  const segments = path.split("/").filter(Boolean);
  return {
    parent: segments.length > 1 ? `/${segments.slice(0, -1).join("/")}` : null,
    path,
    recipe,
    slug: segments.at(-1) ?? "home",
    sources,
    title,
    ...extra,
  };
};

export const IA: IaPage[] = [
  page("/", "Open Source System Software Experts", ["2.1"], "HOME"),

  page("/what-we-do", "What we do", ["2.36"], "HUB", { tag: "engineering" }),
  page("/what-we-do/bare-metal-programming", "Bare Metal Programming", ["2.9"], "SERVICE", {
    tag: "linux-kernel",
  }),
  page("/what-we-do/build-engineering", "Build Engineering", ["2.10"], "SERVICE", {
    tag: "build-engineering",
  }),
  page("/what-we-do/devops", "DevOps", ["2.17"], "SERVICE", { tag: "build-engineering" }),
  page("/what-we-do/embedded-systems", "Embedded Systems", ["2.18"], "SERVICE", {
    tag: "linux-kernel",
  }),
  page("/what-we-do/linux-kernel-bsp", "Linux Kernel & BSP", ["2.27"], "SERVICE", {
    tag: "linux-kernel",
  }),
  page("/what-we-do/long-term-maintainability", "Long-Term Maintainability", ["2.28"], "SERVICE", {
    tag: "engineering",
  }),
  page("/what-we-do/build-and-integration", "Build and Integration", ["2.24"], "SERVICE", {
    tag: "build-engineering",
  }),

  page("/sectors", "Sectors", ["2.7", "2.8", "2.22", "2.29"], "HUB", { tag: "automotive" }),
  page("/sectors/automotive", "Automotive", ["2.8"], "SECTOR", {
    tag: "automotive",
    sector: "automotive",
  }),
  page(
    "/sectors/heavy-equipment-agritech",
    "Heavy Equipment & Agriculture Technology",
    ["2.7"],
    "SECTOR",
    { tag: "engineering", sector: "agritech" }
  ),
  page("/sectors/financial-services", "Financial Services", ["2.22"], "SECTOR", {
    tag: "engineering",
    sector: "finance",
  }),
  page("/sectors/medical-devices", "Medical Devices", ["2.29"], "SECTOR", {
    tag: "medical",
    sector: "medical",
  }),

  page("/technology", "The CT Way", ["2.42"], "HUB", { tag: "trustable-safety" }),
  page("/technology/trustable-software", "Delivering Trustable Software", ["2.42"], "SOLUTION", {
    tag: "trustable-safety",
  }),
  page("/technology/ctrl-os", "CTRL OS — CT Trustable Reproducible Linux", ["2.15"], "SOLUTION", {
    tag: "trustable-safety",
  }),
  page(
    "/technology/trustable-software-framework",
    "The Trustable Software Framework",
    ["2.44"],
    "SOLUTION",
    { tag: "trustable-safety" }
  ),
  page("/technology/nvidia-jetson", "NVIDIA Jetson Platform Development", ["2.25"], "SOLUTION", {
    tag: "engineering",
  }),
  page(
    "/technology/towards-trustable-software",
    "Towards Trustable Software (white paper)",
    ["2.43"],
    "SOLUTION",
    { tag: "trustable-safety" }
  ),

  page("/who-we-are", "About CT", ["2.6"], "ABOUT", { tag: "people-culture" }),
  page("/who-we-are/software-commandments", "The Software Commandments", ["2.12"], "ABOUT"),
  page("/who-we-are/partnerships", "Partnerships", ["2.31"], "ABOUT"),
  page("/who-we-are/environmental-policy", "Environmental Policy", ["2.19"], "ABOUT"),
  page("/who-we-are/careers", "Careers at CT", ["2.26"], "CAREERS"),
  page("/who-we-are/careers/devops-engineer", "DevOps Engineer", ["2.16"], "JD"),
  page("/who-we-are/careers/software-safety-engineer", "Software Safety Engineer", ["2.34"], "JD"),
  page("/who-we-are/careers/software-engineer", "Software Engineer", ["2.37"], "JD"),
  page("/who-we-are/careers/technical-author", "Technical Author", ["2.39"], "JD"),

  page("/resources", "Resources", [], "HUB"),
  page("/resources/news", "News & Announcements", ["2.2"], "LISTING"),
  page("/resources/case-studies", "Case Studies", ["2.11"], "CASE_STUDIES"),
  page("/resources/reports", "Reports & White Papers", ["2.33"], "REPORTS"),
  page("/resources/events", "Events", ["2.20"], "EVENTS", { tag: "events" }),

  page("/ces-2026", "CT at CES 2026", ["2.5"], "CAMPAIGN"),
  page("/contact", "Get in touch", ["2.13"], "CONTACT"),
  page("/privacy-policy", "Privacy Policy", ["2.32"], "LEGAL"),
];

/** Old marketing URLs that are not 1:1 page sources (plan §5.4). */
export const EXTRA_LEGACY: Record<string, string> = {
  "/casestudies.html": "/resources/case-studies",
  "/contact.html": "/contact",
  "/events.html": "/resources/events",
  "/index.html": "/",
  "/join-us.html": "/who-we-are/careers",
  "/news.html": "/resources/news",
  "/privacy.html": "/privacy-policy",
  "/reports.html": "/resources/reports",
  "/services.html": "/what-we-do",
};

/** The page an old URL (dump entry) now lives at; a detail page wins over a hub using the same entry. */
export function iaBySource(number: string): IaPage | undefined {
  const matches = IA.filter((entry) => entry.sources.length === 1 && entry.sources[0] === number);
  return matches.find((entry) => entry.recipe !== "HUB") ?? matches[0];
}

/** Titles use the codename; the seed shows the real company name parsed from the dump instead. */
export function brandTitle(title: string, companyName: string | null): string {
  return companyName ? title.replaceAll(/\bCT\b/gu, companyName) : title;
}
