import { Button } from "@payloadcms/ui";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

import type { Translate } from "../compat.js";
import type { MenuAnchor, MenuGroups } from "../Menu/menuEntries.js";
import { PopupMenu } from "../Menu/PopupMenu.js";

/**
 * The Create button of the header (spec section 7.2) and the menu under it. The entries are the
 * caller's: Folder, and the page types the folder it creates in allows.
 */
export const CreateMenuButton = ({
  groups,
  onSelect,
  translate,
}: {
  groups: MenuGroups;
  onSelect: (entryId: string) => void;
  translate: Translate;
}): ReactNode => {
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);
  const opener = useRef<Element | null>(null);

  return (
    <>
      <Button
        buttonStyle="primary"
        extraButtonProps={{
          "aria-expanded": anchor !== null,
          "aria-haspopup": "menu",
          "data-testid": "create-button",
        }}
        margin={false}
        onClick={(event) => {
          const button = event.currentTarget;
          opener.current = button;
          const { bottom, left } = button.getBoundingClientRect();
          setAnchor({ x: left, y: bottom });
        }}
        size="medium"
      >
        {translate("createButton")}
      </Button>
      {anchor === null ? null : (
        <PopupMenu
          anchor={anchor}
          groups={groups}
          label={translate("createMenuLabel")}
          onClose={(restoreFocus) => {
            setAnchor(null);
            if (restoreFocus) {
              if (opener.current instanceof HTMLElement) {
                opener.current.focus();
              }
            }
          }}
          onSelect={onSelect}
          testId="create-menu"
          translate={translate}
        />
      )}
    </>
  );
};
