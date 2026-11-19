import React from "react";

import { SiteImage, mediaOf } from "@/components/site/SiteImage";

import type { BlogIdentity } from "./blogData";

/** The blog's logo and description under the articles list and at the end of every article. */
export function BlogBlurb({ blog }: { blog: BlogIdentity }) {
  if (!mediaOf(blog.logo) && !blog.text) {
    return null;
  }

  return (
    <div id="blurb">
      {mediaOf(blog.logo) && (
        <figure className="blurb-logo">
          <SiteImage height={26} media={blog.logo} width={204} />
        </figure>
      )}
      {blog.text && <p>{blog.text}</p>}
    </div>
  );
}
