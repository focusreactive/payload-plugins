import React from "react";

import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { WbMoreReadBlock } from "@/payload-types";

import { WbMoreStories } from "./ui";

export async function WbMoreStoriesBlockComponent(props: WbMoreReadBlock) {
  const { storiesHeading, stories, mostReadHeading, mostRead } = props;
  const locale = await resolveLocale();

  return (
    <WbMoreStories
      storiesHeading={storiesHeading ?? "More Stories"}
      stories={(stories ?? []).map((story) => ({
        category: story.category ?? "",
        title: story.title ?? "",
        href: prepareLinkProps(story.link, locale).href || "#",
      }))}
      mostReadHeading={mostReadHeading ?? "Most Read"}
      mostRead={(mostRead ?? []).map((story) => ({
        rank: story.rank ?? "",
        category: story.category ?? "",
        title: story.title ?? "",
        href: prepareLinkProps(story.link, locale).href || "#",
      }))}
    />
  );
}
