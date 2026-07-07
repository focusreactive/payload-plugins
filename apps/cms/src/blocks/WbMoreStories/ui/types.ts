export interface WbMoreStoriesStory {
  category: string;
  title: string;
  href?: string;
}

export interface WbMoreStoriesRankedStory {
  rank: string;
  category: string;
  title: string;
  href?: string;
}

export interface WbMoreStoriesProps {
  storiesHeading?: string;
  stories: WbMoreStoriesStory[];
  mostReadHeading?: string;
  mostRead: WbMoreStoriesRankedStory[];
}
