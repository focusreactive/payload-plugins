import type { RawPayloadComponentExport } from "../../../../types/PayloadComponentExport.js";
import { clientComponentPath } from "../../../shared/utils/componentPath.js";

/** The list column's cell; a client component, so it carries no server props. */
export class TranslationStatusCellExport implements RawPayloadComponentExport {
  path = clientComponentPath("widgets/translation-status-column/ui/TranslationStatusCell");
}
