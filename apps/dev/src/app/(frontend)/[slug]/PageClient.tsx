"use client";

import React from "react";
import { useLivePreview } from "@payloadcms/live-preview-react";
import { ExperimentTracker } from "@focus-reactive/payload-plugin-ab/analytics/client";
import { RenderBlocks } from "../../../components/RenderBlocks";

type Page = {
  title: string;
  slug: string;
  sections: any[];
};

interface Props {
  initialData: Page;
  serverURL: string;
}

export function PageClient({ initialData, serverURL }: Props) {
  const { data } = useLivePreview<Page>({
    depth: 1,
    initialData,
    serverURL,
  });

  return (
    <div>
      <ExperimentTracker experimentId={`/${data.slug}`} />
      <RenderBlocks blocks={data.sections ?? []} />
    </div>
  );
}
