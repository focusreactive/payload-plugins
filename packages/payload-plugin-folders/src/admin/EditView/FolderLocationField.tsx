import type { RelationshipFieldServerProps } from "payload";

import { readTreeSettings } from "../TreeView/readTreeSettings.js";
import { FolderLocationFieldClient } from "./FolderLocationFieldClient.js";

/**
 * The page edit view's Location field on the server: it reads the plugin's settings and the page
 * type labels in the user's language, which the browser cannot, and hands them to the client field.
 * `foldersSlug`, `segmentField` and `titleField` come from the field's component config.
 */
export const FolderLocationField = ({
  clientField,
  foldersSlug,
  i18n,
  path,
  payload,
  permissions,
  readOnly,
  schemaPath,
  segmentField,
  titleField,
}: RelationshipFieldServerProps & {
  foldersSlug: string;
  segmentField: string;
  titleField: string;
}) => (
  <FolderLocationFieldClient
    field={clientField}
    path={path}
    permissions={permissions}
    readOnly={readOnly}
    schemaPath={schemaPath}
    segmentField={segmentField}
    settings={readTreeSettings({ foldersSlug, i18n, payload })}
    titleField={titleField}
  />
);
