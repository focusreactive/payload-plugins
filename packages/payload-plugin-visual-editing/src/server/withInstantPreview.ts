import type { CollectionConfig, Config, CustomComponent, GlobalConfig } from "payload";

import { PACKAGE_NAME } from "../shared/packageName.js";

const INSTANT_PREVIEW_COMPONENT_PATH = `${PACKAGE_NAME}/admin#InstantPreviewBroadcaster`;
const OPEN_FORM_ANNOUNCER_PATH = `${PACKAGE_NAME}/admin#OpenFormAnnouncer`;

type RootLivePreview = NonNullable<Config["admin"]>["livePreview"];

export type InstantPreviewOptions = {
  rootLivePreview: RootLivePreview;
  excludeFieldNames: string[];
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

const instantPreviewControlsOf = (
  entity: PreviewableEntity,
  slugsPreviewedByRoot: readonly string[] | undefined,
  { excludeFieldNames }: InstantPreviewOptions
): CustomComponent[] => [
  { path: OPEN_FORM_ANNOUNCER_PATH },
  ...(hasLivePreview(entity, slugsPreviewedByRoot)
    ? [{ clientProps: { excludeFieldNames }, path: INSTANT_PREVIEW_COMPONENT_PATH }]
    : []),
];

const withInstantPreviewIn = <Entity extends PreviewableEntity>(
  entity: Entity,
  slotName: SlotName,
  slugsPreviewedByRoot: readonly string[] | undefined,
  options: InstantPreviewOptions
): Entity => {
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
          beforeDocumentControls: [
            ...(slot?.beforeDocumentControls ?? []),
            ...instantPreviewControlsOf(entity, slugsPreviewedByRoot, options),
          ],
        },
      },
    },
  };
};

export const withInstantPreviewCollection = (
  collection: CollectionConfig,
  options: InstantPreviewOptions
): CollectionConfig =>
  withInstantPreviewIn(collection, "edit", options.rootLivePreview?.collections, options);

export const withInstantPreviewGlobal = (
  global: GlobalConfig,
  options: InstantPreviewOptions
): GlobalConfig =>
  withInstantPreviewIn(global, "elements", options.rootLivePreview?.globals, options);
