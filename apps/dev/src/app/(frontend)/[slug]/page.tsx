import { notFound } from "next/navigation";
import { getPayload } from "payload";
import React from "react";

import config from "@/payload.config";

import { PageClient } from "./PageClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const payload = await getPayload({ config });

  const { docs } = await payload.find({
    collection: "pages",
    depth: 1,
    limit: 1,
    where: { slug: { equals: slug } },
  });

  const page = docs[0];
  if (!page) {notFound();}

  return (
    <PageClient
      initialData={page as any}
      serverURL={process.env.NEXT_PUBLIC_SERVER_URL ?? ""}
    />
  );
}
