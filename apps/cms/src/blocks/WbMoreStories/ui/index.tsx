import type { WbMoreStoriesProps, WbMoreStoriesRankedStory, WbMoreStoriesStory } from "./types";

function StoryLink({ story }: { story: WbMoreStoriesStory }) {
  return (
    <a
      href={story.href ?? "#"}
      className="flex flex-col gap-[5px] border-b border-border py-6 no-underline transition-opacity last:border-b-0 hover:opacity-70"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary">
        {story.category}
      </span>
      <span className="font-display text-[16px] font-medium leading-[1.32] text-foreground">
        {story.title}
      </span>
    </a>
  );
}

function RankedStoryLink({ story }: { story: WbMoreStoriesRankedStory }) {
  return (
    <a
      href={story.href ?? "#"}
      className="grid grid-cols-[auto_1fr] items-start gap-3.5 border-b border-white/[0.14] py-6 no-underline transition-opacity last:border-b-0 hover:opacity-[0.78]"
    >
      <span className="font-display text-[11px] font-semibold leading-[1.45] tracking-[0.08em] text-white/40">
        {story.rank}
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/40">
          {story.category}
        </span>
        <span className="font-display text-[15px] font-medium leading-[1.32] text-white">
          {story.title}
        </span>
      </div>
    </a>
  );
}

export function WbMoreStories({
  storiesHeading = "More Stories",
  stories,
  mostReadHeading = "Most Read",
  mostRead,
}: WbMoreStoriesProps) {
  return (
    <section className="mx-auto max-w-containerMaxW px-containerBase pt-[88px]">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-2">
        <div className="w-full pt-8">
          <h3 className="m-0 mb-2 pb-2 font-display text-[24px] font-semibold tracking-[-0.015em] text-foreground">
            {storiesHeading}
          </h3>
          {stories.map((story) => (
            <StoryLink key={story.title} story={story} />
          ))}
        </div>

        <div className="w-full rounded-[10px] bg-secondary px-8 pb-6 pt-8">
          <h3 className="m-0 mb-2 pb-2 font-display text-[24px] font-semibold tracking-[-0.015em] text-white">
            {mostReadHeading}
          </h3>
          {mostRead.map((story) => (
            <RankedStoryLink key={story.rank} story={story} />
          ))}
        </div>
      </div>
    </section>
  );
}
