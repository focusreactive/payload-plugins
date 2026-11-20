import { SectionHeading } from "@/components/SectionHeading";
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
import type { CardsGridBlock } from "@/payload-types";

import type { CardIcon } from "./icons";

const ICON_MAP: Record<CardIcon, React.ReactElement> = {
  activity: <Activity size={32} strokeWidth={1.5} />,
  "bar-chart-3": <BarChart3 size={32} strokeWidth={1.5} />,
  bell: <Bell size={32} strokeWidth={1.5} />,
  calendar: <Calendar size={32} strokeWidth={1.5} />,
  clock: <Clock size={32} strokeWidth={1.5} />,
  compass: <Compass size={32} strokeWidth={1.5} />,
  "file-text": <FileText size={32} strokeWidth={1.5} />,
  gauge: <Gauge size={32} strokeWidth={1.5} />,
  "git-branch": <GitBranch size={32} strokeWidth={1.5} />,
  layers: <Layers size={32} strokeWidth={1.5} />,
  "layout-grid": <LayoutGrid size={32} strokeWidth={1.5} />,
  map: <Map size={32} strokeWidth={1.5} />,
  plug: <Plug size={32} strokeWidth={1.5} />,
  shield: <Shield size={32} strokeWidth={1.5} />,
  sparkles: <Sparkles size={32} strokeWidth={1.5} />,
  target: <Target size={32} strokeWidth={1.5} />,
  users: <Users size={32} strokeWidth={1.5} />,
  "wand-2": <Wand2 size={32} strokeWidth={1.5} />,
  workflow: <Workflow size={32} strokeWidth={1.5} />,
  zap: <Zap size={32} strokeWidth={1.5} />,
};

export async function CardsGridBlockComponent({
  heading,
  items,
  columns,
  section,
  id,
}: CardsGridBlock) {
  const locale = await resolveLocale();

  const cards: IDefaultCardProps[] = (items ?? []).map((item) => {
    const iconKey = item.icon as CardIcon | null | undefined;
    const icon = iconKey ? (ICON_MAP[iconKey] ?? null) : undefined;

    return {
      alignVariant: (item.alignVariant as IDefaultCardProps["alignVariant"]) ?? "left",
      backgroundColor: (item.backgroundColor as IDefaultCardProps["backgroundColor"]) ?? "none",
      description: item.description ?? undefined,
      icon,
      image: prepareMediaProps(item.image ?? null),
      link: prepareLinkProps(item.link, locale),
      rounded: (item.rounded as IDefaultCardProps["rounded"]) ?? "none",
      title: item.title,
    };
  });

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <SectionHeading {...heading} align="split" className="mb-sectionGap" />
      <CardsGrid items={cards} columns={columns ?? 3} />
    </SectionContainer>
  );
}
