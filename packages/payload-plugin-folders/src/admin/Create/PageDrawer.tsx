import { useDocumentDrawer } from "@payloadcms/ui";
import { useEffect, useRef } from "react";

import type { NewPageValues } from "./CreatePageDialog.js";

/**
 * A collection's own create form in a drawer, with the dialog's four values filled in (spec
 * section 7.7). It opens as soon as it is shown and tells the caller when it closes, saved or not.
 */
export const PageDrawer = ({
  collection,
  onClose,
  onSaved,
  values,
}: {
  collection: string;
  onClose: () => void;
  onSaved: () => void;
  values: NewPageValues;
}) => {
  const [DocumentDrawer, , { closeDrawer, isDrawerOpen, openDrawer }] = useDocumentDrawer({
    collectionSlug: collection,
  });
  const hasOpened = useRef(false);

  useEffect(() => {
    openDrawer();
  }, [openDrawer]);

  // The drawer reports only that it closed; a close after it opened is the end of this one.
  useEffect(() => {
    if (isDrawerOpen) {
      hasOpened.current = true;
    } else if (hasOpened.current) {
      onClose();
    }
  }, [isDrawerOpen, onClose]);

  return (
    <DocumentDrawer
      initialData={values}
      // Saving a page here must leave the editor on the tree, not follow Payload's redirect to the
      // new page's edit view.
      redirectAfterCreate={false}
      onSave={() => {
        onSaved();
        closeDrawer();
      }}
    />
  );
};
