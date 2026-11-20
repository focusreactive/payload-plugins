"use client";

import { SlugField } from "@payloadcms/ui";
import type { SlugFieldClientProps } from "payload";

/**
 * Payload's SlugField with a leading "/" drawn before the input (see `custom.scss`),
 * so editors read the slug as a URL segment. Purely visual: the stored value is unchanged.
 */
export const SlugPathField = (props: SlugFieldClientProps) => (
  <div className="slug-path-field">
    <SlugField {...props} />
  </div>
);
