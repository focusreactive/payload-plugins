import type { RawPayloadComponentExport } from "../../../../types/PayloadComponentExport";
import { clientComponentPath } from "../../../shared/utils/componentPath";

/**
 * Import-map reference to the per-field Translate control. Appended to a field's
 * `admin.components.beforeInput` by `withFieldTranslation(field)`, so it renders just above the
 * input as an icon button that opens the translate popup.
 *
 * No props: the control reads everything from client context (field value/path via `useField()`,
 * locale via `useLocale`, document via `useDocumentInfo`, available locales via `useConfig`) and
 * writes back uniformly via a form `UPDATE` (works for text/textarea and richText alike).
 */
export class TranslateFieldControlExport implements RawPayloadComponentExport {
  path = clientComponentPath("widgets/translate-field-control/ui/TranslateFieldControl");
}
