import { RenderBlocks } from "@/blocks/RenderBlocks";
import type { Locale } from "@/lib/types";
import { PostHero } from "@/components/PostHero";
import { RichText } from "@/components/shared";
import { getRelatedPosts } from "@/dal/getRelatedPosts";
import type { Post } from "@/payload-types";

import { RelatedPostsSection } from "./components/RelatedPostsSection";

interface PostContentProps {
  post: Post;
  locale: Locale;
  relatedPostsLabel?: string | null;
}

export const PostContent: React.FC<PostContentProps> = async ({
  post,
  locale,
  relatedPostsLabel,
}) => {
  const relatedPosts = await getRelatedPosts({ locale, post });

  return (
    <article>
      <PostHero post={post} locale={locale} />

      <section className="py-sectionBase">
        <div className="mx-auto w-full max-w-containerMaxW px-containerBase">
          <div className="mx-auto max-w-[720px]">
            <RichText content={post.content} />
          </div>
        </div>
      </section>

      <RenderBlocks blocks={post.blocks ?? []} />

      {relatedPosts.length > 0 && (
        <RelatedPostsSection posts={relatedPosts} relatedPostsLabel={relatedPostsLabel} />
      )}
    </article>
  );
};
