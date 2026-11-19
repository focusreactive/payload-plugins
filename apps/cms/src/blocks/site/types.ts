import type React from "react";

import type { EntityCollection } from "@/lib/config/entityRoutes";
import type { Locale } from "@/lib/types";
import type { Clinic, Condition, Doctor, Page, Post, State, Treatment } from "@/payload-types";

/** The record whose page a section is rendered on, so a section can show that record's data. */
export type SiteBlockContext =
  | { collection: "page"; doc: Page }
  | { collection: "posts"; doc: Post }
  | { collection: "states"; doc: State }
  | { collection: "clinics"; doc: Clinic }
  | { collection: "doctors"; doc: Doctor }
  | { collection: "treatments"; doc: Treatment }
  | { collection: "conditions"; doc: Condition };

export type SiteBlockContextCollection = EntityCollection | "page" | "posts";

/** What every site section component receives on top of its own fields. */
export interface SiteBlockRenderProps {
  locale: Locale;
  context?: SiteBlockContext;
}

export type SiteBlockProps<TBlock> = TBlock & SiteBlockRenderProps;

// Each component is typed by its own block; the registry only knows it takes block data.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SiteBlockComponent = (props: any) => React.ReactNode | Promise<React.ReactNode>;

export type SiteBlockComponents = Record<string, SiteBlockComponent>;
