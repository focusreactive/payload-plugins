import type { VeEditedField } from "../../shared/protocol.js";

import { editedFieldAddressOf } from "../../shared/veDocument.js";

import { findAdminWindow, isFramedByAdmin } from "../adminWindow.js";

export type EditRoutesDeps = {
  win: Window;
  holdsAnyForm(): boolean;
};

export type IsFinished = (field: VeEditedField) => boolean;

export interface EditRoutes {
  currentAdmin(): Window | null;
  pin(field: VeEditedField): void;
  releaseFinished(isFinished: IsFinished): void;
  adminOf(field: VeEditedField): Window | null;
}

type PinnedRoute = { field: VeEditedField; admin: Window | null };

export function createEditRoutes({ holdsAnyForm, win }: EditRoutesDeps): EditRoutes {
  const pinnedRoutes = new Map<string, PinnedRoute>();

  const currentAdmin = (): Window | null => {
    const adminWindow = findAdminWindow(win);
    if (!adminWindow) return null;
    return isFramedByAdmin(win) || holdsAnyForm() ? adminWindow : null;
  };

  const adminOf = (field: VeEditedField): Window | null => {
    const pinned = pinnedRoutes.get(editedFieldAddressOf(field));
    if (!pinned) return currentAdmin();
    return pinned.admin && pinned.admin === currentAdmin() ? pinned.admin : null;
  };

  return {
    adminOf,
    currentAdmin,
    pin(field) {
      pinnedRoutes.set(editedFieldAddressOf(field), { admin: currentAdmin(), field });
    },
    releaseFinished(isFinished) {
      for (const [address, pinned] of pinnedRoutes) {
        if (isFinished(pinned.field)) pinnedRoutes.delete(address);
      }
    },
  };
}
