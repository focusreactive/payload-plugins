import { Button } from "@payloadcms/ui";
import type { ReactNode } from "react";

import type { TreeItem } from "../../types.js";
import type { Translate } from "../compat.js";
import { levelPadding } from "./levelPadding.js";

/** What the empty states can start; `null` is the top level. */
export type EmptyCreateActions = {
  /** Whether the user may create a folder / a page in this folder. The server still decides. */
  canCreateFolder: boolean;
  canCreatePage: (folder: TreeItem | null) => boolean;
  onCreateFolder: (folder: TreeItem | null) => void;
  /** Opens New page with the folder's first page type; absent when the site has no page type. */
  onCreatePage: ((folder: TreeItem | null) => void) | null;
};

/**
 * The muted row under an open folder with nothing in it (spec section 7.2, "This folder is
 * empty"), with links to create a page or a folder in it.
 */
export const EmptyRow = ({
  actions,
  folder,
  level,
  translate,
}: {
  actions: EmptyCreateActions;
  folder: TreeItem;
  level: number;
  translate: Translate;
}): ReactNode => (
  <div
    aria-level={level + 1}
    className="fr-folders-row fr-folders-row--status"
    data-testid="empty-row"
    role="row"
  >
    <div
      className="fr-folders-cell fr-folders-cell--wide fr-folders-empty-row"
      role="gridcell"
      style={{ paddingInlineStart: levelPadding(level) }}
    >
      <span className="fr-folders-muted">{translate("emptyFolder")}</span>
      {actions.onCreatePage === null ? null : (
        <button
          className="fr-folders-link-button"
          data-testid="empty-create-page"
          disabled={!actions.canCreatePage(folder)}
          onClick={() => actions.onCreatePage?.(folder)}
          type="button"
        >
          {translate("emptyCreatePage")}
        </button>
      )}
      <button
        className="fr-folders-link-button"
        data-testid="empty-create-folder"
        disabled={!actions.canCreateFolder}
        onClick={() => actions.onCreateFolder(folder)}
        type="button"
      >
        {translate("emptyCreateFolder")}
      </button>
    </div>
  </div>
);

/**
 * What the view shows instead of the tree when its own root has nothing in it: a database with no
 * content at all ("No content yet"), or the zoomed folder with no children ("This folder is
 * empty"). Both offer the same two ways to start.
 */
export const EmptyPanel = ({
  actions,
  folder,
  isZoomed,
  translate,
}: {
  actions: EmptyCreateActions;
  /** The zoomed folder's row, when it is known; `null` at the top level. */
  folder: TreeItem | null;
  isZoomed: boolean;
  translate: Translate;
}): ReactNode => (
  <section
    className="fr-folders-empty-panel"
    data-testid="empty-panel"
    data-variant={isZoomed ? "folder" : "site"}
  >
    <h2 className="fr-folders-empty-panel__title">
      {translate(isZoomed ? "emptyFolder" : "emptyNoContent")}
    </h2>
    {isZoomed ? null : <p className="fr-folders-muted">{translate("emptyNoContentHint")}</p>}
    <div className="fr-folders-empty-panel__actions">
      <Button
        buttonStyle="primary"
        disabled={!actions.canCreateFolder}
        extraButtonProps={{ "data-testid": "empty-create-folder" }}
        margin={false}
        onClick={() => actions.onCreateFolder(folder)}
        size="medium"
      >
        {translate("emptyCreateFolder")}
      </Button>
      {actions.onCreatePage === null ? null : (
        <Button
          buttonStyle="secondary"
          disabled={!actions.canCreatePage(folder)}
          extraButtonProps={{ "data-testid": "empty-create-page" }}
          margin={false}
          onClick={() => actions.onCreatePage?.(folder)}
          size="medium"
        >
          {translate("emptyCreatePage")}
        </Button>
      )}
    </div>
  </section>
);
