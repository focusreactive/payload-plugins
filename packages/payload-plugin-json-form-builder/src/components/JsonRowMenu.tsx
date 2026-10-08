"use client";

import { clsx as cn } from "clsx";
import type { ReactNode } from "react";
import { MoreIcon, Popup, PopupList } from "@payloadcms/ui";

export type MenuItem = { label: string; onClick: () => void; icon?: ReactNode; className?: string };

export const JsonRowMenu = ({ items }: { items: MenuItem[] }) => (
  <Popup
    button={<MoreIcon />}
    buttonClassName="json-form__menu"
    className="json-form__menu-popup"
    horizontalAlign="center"
    render={({ close }) => (
      <PopupList.ButtonGroup buttonSize="small">
        {items.map((item) => (
          <PopupList.Button
            className={cn("array-actions__action", "json-form__action", item.className)}
            key={item.label}
            onClick={() => {
              item.onClick();
              close();
            }}
          >
            {item.icon}
            {item.label}
          </PopupList.Button>
        ))}
      </PopupList.ButtonGroup>
    )}
    size="medium"
  />
);
