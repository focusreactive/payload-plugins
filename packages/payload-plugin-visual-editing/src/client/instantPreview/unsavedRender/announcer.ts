import type { AdminPage } from "../adminChannel.js";
import type { LiveField } from "../liveFields.js";

import { VE_RICH_TEXT_RENDERED_TYPE } from "../../../shared/protocol.js";
import { announceToAdmin } from "../adminChannel.js";
import { renderedByDocument } from "../liveFields.js";

type Announced = { fields: LiveField[]; page: AdminPage };

const announcedByPage = new Map<string, Announced>();

const announceQueued = () => {
  for (const { fields, page } of announcedByPage.values()) {
    announceToAdmin(VE_RICH_TEXT_RENDERED_TYPE, renderedByDocument(fields), page);
  }
  announcedByPage.clear();
};

export const announceLiveRichText = (field: LiveField, page: AdminPage): void => {
  if (announcedByPage.size === 0) queueMicrotask(announceQueued);
  const pageAddress = JSON.stringify([page.adminOrigin, page.locale ?? null]);
  const announced = announcedByPage.get(pageAddress) ?? { fields: [], page };
  announced.fields.push(field);
  announcedByPage.set(pageAddress, announced);
};
