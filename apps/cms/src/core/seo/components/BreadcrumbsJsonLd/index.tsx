import React from "react";

import { createBreadcrumbsSchema } from "@/core/seo/schemas";

import type { CreateBreadcrumbsOptions } from "../../schemas/breadcrumbsSchema";
import { JsonLd } from "../JsonLd";

type BreadcrumbsJsonLdProps = CreateBreadcrumbsOptions;

export async function BreadcrumbsJsonLd(props: BreadcrumbsJsonLdProps) {
  const structuredData = await createBreadcrumbsSchema(props);
  return <JsonLd data={structuredData} />;
}
