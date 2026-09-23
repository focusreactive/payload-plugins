import { CardsGrid } from "./ui";
import type { IDefaultCardProps } from "./ui/types";
import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  Clock,
  Compass,
  FileText,
  Gauge,
  GitBranch,
  Layers,
  LayoutGrid,
  Map,
  Plug,
  Shield,
  Sparkles,
  Target,
  Users,
  Wand2,
  Workflow,
  Zap,
} from "lucide-react";
import React from "react";

import { resolveLocale } from "@/lib/utils/resolveLocale";
import { SectionContainer } from "@/components/shared";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import type { CardsGridBlock } from "@/payload-types";

import type { CardIcon } from "./icons";

const ICON_MAP: Record<CardIcon, React.ReactElement> = {
  activity: <Activity size={22} strokeWidth={1.8} />,
  "bar-chart-3": <BarChart3 size={22} strokeWidth={1.8} />,
  bell: <Bell size={22} strokeWidth={1.8} />,
  calendar: <Calendar size={22} strokeWidth={1.8} />,
  clock: <Clock size={22} strokeWidth={1.8} />,
  compass: <Compass size={22} strokeWidth={1.8} />,
  "file-text": <FileText size={22} strokeWidth={1.8} />,
  gauge: <Gauge size={22} strokeWidth={1.8} />,
  "git-branch": <GitBranch size={22} strokeWidth={1.8} />,
  layers: <Layers size={22} strokeWidth={1.8} />,
  "layout-grid": <LayoutGrid size={22} strokeWidth={1.8} />,
  map: <Map size={22} strokeWidth={1.8} />,
  plug: <Plug size={22} strokeWidth={1.8} />,
  shield: <Shield size={22} strokeWidth={1.8} />,
  sparkles: <Sparkles size={22} strokeWidth={1.8} />,
  target: <Target size={22} strokeWidth={1.8} />,
  users: <Users size={22} strokeWidth={1.8} />,
  "wand-2": <Wand2 size={22} strokeWidth={1.8} />,
  workflow: <Workflow size={22} strokeWidth={1.8} />,
  zap: <Zap size={22} strokeWidth={1.8} />,
};

export async function CardsGridBlockComponent({
  eyebrow,
  heading,
  description,
  items,
  columns,
  section,
  id,
  isFirstBlock,
}: CardsGridBlock & { isFirstBlock?: boolean }) {
  const locale = await resolveLocale();

  const cards: IDefaultCardProps[] = (items ?? []).map((item) => {
    const iconKey = item.icon as CardIcon | null | undefined;
    const icon = iconKey ? (ICON_MAP[iconKey] ?? null) : undefined;

    return {
      alignVariant: (item.alignVariant as IDefaultCardProps["alignVariant"]) ?? "center",
      backgroundColor: (item.backgroundColor as IDefaultCardProps["backgroundColor"]) ?? "none",
      description: item.description ?? undefined,
      icon,
      image: prepareMediaProps(item.image ?? null),
      link: prepareLinkProps(item.link, locale),
      rounded: (item.rounded as IDefaultCardProps["rounded"]) ?? "none",
      title: item.title,
    };
  });

  const header = prepareSectionHeaderProps({ eyebrow, description, heading, isFirstBlock });

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      {header && (
        // Untitled UI's own section-heading scale, verbatim from features-simple-icons-04. The
        // eyebrow span comes from features-alternating-layout-04 because their icon grid has no
        // eyebrow of its own, and the same borrow is already used by the Content and CTA sections.
        <div className="mb-12 flex flex-col">
          {header.eyebrow?.text && (
            <span className="text-sm font-semibold text-brand-secondary md:text-md">
              {header.eyebrow.text}
            </span>
          )}
          {header.title && (
            <h2 className="mt-5 text-display-sm font-semibold text-primary md:text-display-md">
              {header.title}
            </h2>
          )}
          {header.subtitle && (
            <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">{header.subtitle}</p>
          )}
        </div>
      )}
      <CardsGrid items={cards} columns={columns ?? 3} />
    </SectionContainer>
  );
}
