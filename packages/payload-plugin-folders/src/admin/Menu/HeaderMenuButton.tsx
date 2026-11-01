import { Button } from "@payloadcms/ui";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

import type { Translate } from "../compat.js";
import { MoreIcon } from "../Tree/icons.js";
import type { MenuAnchor, MenuGroups } from "./menuEntries.js";
import { PopupMenu } from "./PopupMenu.js";

/**
 * The "..." button of the header (spec section 7.2) and the menu under it, for the actions that
 * are not about one row. The caller leaves the button out when it has no entries for this user.
 */
export const HeaderMenuButton = ({
  groups,
  label,
  onSelect,
  translate,
}: {
  groups: MenuGroups;
  /** The button's and the menu's accessible name. */
  label: string;
  onSelect: (entryId: string) => void;
  translate: Translate;
}): ReactNode => {
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);
  const opener = useRef<Element | null>(null);

  return (
    <>
      <Button
        aria-label={label}
        buttonStyle="secondary"
        extraButtonProps={{
          "aria-expanded": anchor !== null,
          "aria-haspopup": "menu",
          "data-testid": "header-menu-button",
        }}
        margin={false}
        onClick={(event) => {
          const button = event.currentTarget;
          opener.current = button;
          const { bottom, right } = button.getBoundingClientRect();
          setAnchor({ align: "end", x: right, y: bottom });
        }}
        size="medium"
      >
        <MoreIcon />
      </Button>
      {anchor === null ? null : (
        <PopupMenu
          anchor={anchor}
          groups={groups}
          label={label}
          onClose={(restoreFocus) => {
            setAnchor(null);
            if (restoreFocus && opener.current instanceof HTMLElement) {
              opener.current.focus();
            }
          }}
          onSelect={onSelect}
          testId="header-menu"
          translate={translate}
        />
      )}
    </>
  );
};
