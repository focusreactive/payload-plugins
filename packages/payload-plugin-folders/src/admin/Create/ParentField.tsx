import { Button } from "@payloadcms/ui";
import { useState } from "react";
import type { ReactNode } from "react";

import type { TreeItem } from "../../types.js";
import type { FoldersApiContext } from "../api.js";
import type { Translate } from "../compat.js";
import { FolderPickerTree } from "../Move/FolderPickerTree.js";
import type { FolderChoice } from "../Move/FolderPickerTree.js";
import type { TreeStore } from "../store.js";

/**
 * The parent folder field of the folder and page forms: the folder's name, a Change button, and
 * the same picker Move to... uses, opened under it. `refusalFor` says which folders are off.
 */
export const ParentField = ({
  apiContext,
  choice,
  foldersSlug,
  onChoose,
  refusalFor,
  store,
  translate,
}: {
  apiContext: FoldersApiContext;
  choice: FolderChoice;
  foldersSlug: string;
  onChoose: (choice: FolderChoice) => void;
  refusalFor: (target: TreeItem | null) => string | null;
  store: TreeStore;
  translate: Translate;
}): ReactNode => {
  const [isPicking, setIsPicking] = useState(false);

  return (
    <div className="fr-folders-field">
      <span className="fr-folders-field__label">{translate("createParent")}</span>
      <div className="fr-folders-parent">
        <span data-testid="parent-name">{choice.title}</span>
        <Button
          buttonStyle="secondary"
          extraButtonProps={{ "data-testid": "parent-change" }}
          margin={false}
          onClick={() => setIsPicking((current) => !current)}
          size="medium"
        >
          {translate("createParentChange")}
        </Button>
      </div>
      {isPicking ? (
        <div className="fr-folders-picker" data-testid="parent-picker">
          <FolderPickerTree
            choice={choice}
            context={apiContext}
            foldersSlug={foldersSlug}
            onChoose={(picked) => {
              onChoose(picked);
              setIsPicking(false);
            }}
            refusalFor={refusalFor}
            store={store}
            translate={translate}
          />
        </div>
      ) : null}
    </div>
  );
};
