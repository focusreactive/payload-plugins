import type { Locale } from "@/core/types";
import { PostHero, RichText } from "@/core/ui";
import { getRelatedPosts } from "@/dal/getRelatedPosts";
import type { Post } from "@/payload-types";

import { PostCta } from "./components/PostCta";
import { PostFaq } from "./components/PostFaq";
import { RelatedPostsSection } from "./components/RelatedPostsSection";

interface PostContentProps {
  post: Post;
  locale: Locale;
  relatedPostsLabel?: string | null;
}

export const PostContent: React.FC<PostContentProps> = async ({ post, locale, relatedPostsLabel }) => {
  const relatedPosts = await getRelatedPosts({ locale, post });

  const hasFaq = (post.faq?.items?.length ?? 0) > 0;
  const hasCta = Boolean(post.cta?.heading);

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

      {hasFaq && post.faq && <PostFaq faq={post.faq} />}

      {relatedPosts.length > 0 && <RelatedPostsSection posts={relatedPosts} relatedPostsLabel={relatedPostsLabel} />}

      {hasCta && post.cta && <PostCta cta={post.cta} />}
    </article>
  );
};
