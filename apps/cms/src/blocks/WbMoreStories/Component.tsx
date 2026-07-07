import React from "react";

import type { WbMoreReadBlock } from "@/payload-types";

import { WbMoreStories } from "./ui";

export function WbMoreStoriesBlockComponent(props: WbMoreReadBlock) {
  const { storiesHeading, stories, mostReadHeading, mostRead } = props;

  return (
    <WbMoreStories
      storiesHeading={storiesHeading ?? "More Stories"}
      stories={(stories ?? []).map((story) => ({
        category: story.category ?? "",
        title: story.title ?? "",
        href: story.href ?? "#",
      }))}
      mostReadHeading={mostReadHeading ?? "Most Read"}
      mostRead={(mostRead ?? []).map((story) => ({
        rank: story.rank ?? "",
        category: story.category ?? "",
        title: story.title ?? "",
        href: story.href ?? "#",
      }))}
    />
  );
}
