import { useDocumentDrawer, useModal } from "@payloadcms/ui";
import { useEffect, useRef } from "react";

import type { NewPageValues } from "./CreatePageDialog.js";
import { applyDrawerSave, initialDrawerDraftState, shouldDiscardDraft } from "./drawerDraft.js";
import type { DrawerDraftState, DrawerSaveEvent } from "./drawerDraft.js";
import { defaultPageFieldNames, pageTextValues } from "./localizedValues.js";
import type { PageFieldNames } from "./localizedValues.js";

/**
 * A collection's own create form in a drawer, with the dialog's four values filled in (spec
 * section 7.7). It opens as soon as it is shown and tells the caller when it closes, saved or not.
 *
 * A collection with autosave has its document made as a draft the moment the drawer opens, and
 * autosaves it as the editor types, so a save the drawer hears about is not yet a save the editor
 * asked for. Closing the drawer without saving by hand calls `onDiscard`, so Cancel leaves nothing
 * in the folder.
 */
export const PageDrawer = ({
  collection,
  onClose,
  onDiscard,
  onSaved,
  pageFields,
  values,
}: {
  collection: string;
  onClose: () => void;
  onDiscard: (openedAt: Date) => Promise<void> | void;
  onSaved: () => void;
  pageFields: Readonly<Record<string, PageFieldNames>>;
  values: NewPageValues;
}) => {
  // The drawer hook reports `isDrawerOpen: false` always (it does not track the modal), so the
  // open state is read from the modal itself.
  const [DocumentDrawer, , { closeDrawer, drawerSlug, openDrawer }] = useDocumentDrawer({
    collectionSlug: collection,
  });
  const { isModalOpen } = useModal();
  const isDrawerOpen = isModalOpen(drawerSlug);
  const hasOpened = useRef(false);
  const openedAt = useRef(new Date());
  const draftState = useRef<DrawerDraftState>(initialDrawerDraftState);

  useEffect(() => {
    openDrawer();
  }, [openDrawer]);

  // The drawer reports only that it closed; a close after it opened is the end of this one.
  useEffect(() => {
    if (isDrawerOpen) {
      hasOpened.current = true;
    } else if (hasOpened.current) {
      const isDiscarded = shouldDiscardDraft(draftState.current);
      draftState.current = initialDrawerDraftState;
      if (isDiscarded) {
        // The drawer is gone either way; a failed delete leaves the draft, as it was before.
        const discard = async () => {
          try {
            await onDiscard(openedAt.current);
          } catch {
            // Nothing to do: the draft stays in the folder.
          } finally {
            onClose();
          }
        };
        void discard();
      } else {
        onClose();
      }
    }
  }, [isDrawerOpen, onClose, onDiscard]);

  return (
    <DocumentDrawer
      initialData={{
        folder: values.folder,
        isFolderRoot: values.isFolderRoot,
        ...pageTextValues(
          { slug: values.slug, title: values.title },
          pageFields[collection] ?? defaultPageFieldNames
        ),
      }}
      // Saving a page here must leave the editor on the tree, not follow Payload's redirect to the
      // new page's edit view.
      redirectAfterCreate={false}
      onSave={(event) => {
        draftState.current = applyDrawerSave(draftState.current, event as DrawerSaveEvent);
        if (draftState.current.hasSavedByHand) {
          onSaved();
          closeDrawer();
        }
      }}
    />
  );
};
