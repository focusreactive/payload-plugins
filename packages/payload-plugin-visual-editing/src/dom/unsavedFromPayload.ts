import type { BaseValues } from "../client/instantPreview/unsavedRender/baseValues.js";
import type { ValueSource } from "../client/instantPreview/unsavedRender/valueSource.js";
import type { RenderRichTextHtml, RenderRichTextValue } from "./liveRichTextElements.js";

import { renderedThroughPayload } from "../client/instantPreview/unsavedRender/renderValue.js";

type FromPayload = {
  source: ValueSource;
  bases: BaseValues | null;
  renderValue: RenderRichTextValue | undefined;
};

export const renderInPayload = ({ bases, renderValue, source }: FromPayload): RenderRichTextHtml =>
  renderValue
    ? renderedThroughPayload({ bases, renderValue, source })
    : (request, signal) => source.html(request, signal);
