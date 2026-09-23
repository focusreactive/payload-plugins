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
import type { FC } from "react";

import type { CardIcon } from "@/blocks/CardsGrid/icons";
import { SectionContainer } from "@/components/shared";
import type { FeatureListBlock } from "@/payload-types";
import { FeaturedIcon } from "@/shared/ui/shadcn/foundations/featured-icon/featured-icon";

const ICONS: Record<CardIcon, FC<{ className?: string }>> = {
  activity: Activity,
  "bar-chart-3": BarChart3,
  bell: Bell,
  calendar: Calendar,
  clock: Clock,
  compass: Compass,
  "file-text": FileText,
  gauge: Gauge,
  "git-branch": GitBranch,
  layers: Layers,
  "layout-grid": LayoutGrid,
  map: Map,
  plug: Plug,
  shield: Shield,
  sparkles: Sparkles,
  target: Target,
  users: Users,
  "wand-2": Wand2,
  workflow: Workflow,
  zap: Zap,
};

export function FeatureListBlockComponent({
  eyebrow,
  heading,
  description,
  items,
  section,
  id,
}: FeatureListBlock) {
  return (
    <SectionContainer
      // features-simple-icons-04 carries its own padding and container.
      sectionData={{ ...section, id, paddingY: "none", paddingX: "none", maxWidth: "none" }}
    >
      <div className="py-16 md:py-24">
        <div className="mx-auto w-full max-w-container px-4 md:px-8">
          <div className="grid grid-cols-1 gap-12 md:gap-16 lg:grid-cols-3">
            <div className="max-w-3xl lg:col-span-1">
              {eyebrow && (
                <span className="text-sm font-semibold text-brand-secondary md:text-md">
                  {eyebrow}
                </span>
              )}
              {heading && (
                <h2 className="mt-3 text-display-sm font-semibold text-primary md:text-display-md">
                  {heading}
                </h2>
              )}
              {description && (
                <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">{description}</p>
              )}
            </div>
            <div className="lg:col-span-2">
              <ul className="grid w-full grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2 md:gap-y-12">
                {(items ?? []).map((item, index) => {
                  const Icon = item.icon ? ICONS[item.icon as CardIcon] : null;
                  return (
                    <li key={item.id ?? index} className="flex gap-4">
                      {Icon && (
                        <FeaturedIcon
                          icon={Icon}
                          color="brand"
                          theme="light"
                          size="lg"
                          className="shrink-0"
                        />
                      )}
                      <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-semibold text-primary">{item.title}</h3>
                        {item.description && (
                          <p className="text-md text-pretty text-tertiary">{item.description}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
