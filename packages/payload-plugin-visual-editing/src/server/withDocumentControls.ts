import type { CollectionConfig, Config, CustomComponent, GlobalConfig } from "payload";

import { PACKAGE_NAME } from "../shared/packageName.js";

const PREVIEW_PAGE_ANNOUNCER_PATH = `${PACKAGE_NAME}/admin#PreviewPageAnnouncer`;
const INSTANT_PREVIEW_COMPONENT_PATH = `${PACKAGE_NAME}/admin#InstantPreviewBroadcaster`;
const OPEN_FORM_ANNOUNCER_PATH = `${PACKAGE_NAME}/admin#OpenFormAnnouncer`;

type RootLivePreview = NonNullable<Config["admin"]>["livePreview"];

export type DocumentControlsOptions = {
  rootLivePreview: RootLivePreview;
  excludeFieldNames: string[];
  instantPreview: boolean;
};

type SlotName = "edit" | "elements";

type ControlsSlot = { beforeDocumentControls?: CustomComponent[] };

type PreviewableEntity = {
  admin?: { components?: Partial<Record<SlotName, ControlsSlot>>; livePreview?: unknown };
  slug: string;
};

const hasLivePreview = (
  { admin, slug }: PreviewableEntity,
  slugsPreviewedByRoot: readonly string[] | undefined
): boolean => Boolean(admin?.livePreview) || Boolean(slugsPreviewedByRoot?.includes(slug));

const documentControlsOf = (
  entity: PreviewableEntity,
  slugsPreviewedByRoot: readonly string[] | undefined,
  { excludeFieldNames, instantPreview }: DocumentControlsOptions
): CustomComponent[] => {
  const isPreviewed = hasLivePreview(entity, slugsPreviewedByRoot);
  return [
    ...(isPreviewed ? [{ path: PREVIEW_PAGE_ANNOUNCER_PATH }] : []),
    ...(instantPreview ? [{ path: OPEN_FORM_ANNOUNCER_PATH }] : []),
    ...(instantPreview && isPreviewed
      ? [{ clientProps: { excludeFieldNames }, path: INSTANT_PREVIEW_COMPONENT_PATH }]
      : []),
  ];
};

const withDocumentControlsIn = <Entity extends PreviewableEntity>(
  entity: Entity,
  slotName: SlotName,
  slugsPreviewedByRoot: readonly string[] | undefined,
  options: DocumentControlsOptions
): Entity => {
  const controls = documentControlsOf(entity, slugsPreviewedByRoot, options);
  if (controls.length === 0) return entity;

  const components = entity.admin?.components;
  const slot = components?.[slotName];
  return {
    ...entity,
    admin: {
      ...entity.admin,
      components: {
        ...components,
        [slotName]: {
          ...slot,
          beforeDocumentControls: [...(slot?.beforeDocumentControls ?? []), ...controls],
        },
      },
    },
  };
};

export const withDocumentControlsCollection = (
  collection: CollectionConfig,
  options: DocumentControlsOptions
): CollectionConfig =>
  withDocumentControlsIn(collection, "edit", options.rootLivePreview?.collections, options);

export const withDocumentControlsGlobal = (
  global: GlobalConfig,
  options: DocumentControlsOptions
): GlobalConfig =>
  withDocumentControlsIn(global, "elements", options.rootLivePreview?.globals, options);
