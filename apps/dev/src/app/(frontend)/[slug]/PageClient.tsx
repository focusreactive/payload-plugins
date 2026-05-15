"use client";

import { useLivePreview } from "@payloadcms/live-preview-react";
import React from "react";

import { RenderBlocks } from "../../../components/RenderBlocks";

interface Page {
  title: string;
  slug: string;
  sections: any[];
}

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
      <RenderBlocks blocks={data.sections ?? []} />
    </div>
  );
}
