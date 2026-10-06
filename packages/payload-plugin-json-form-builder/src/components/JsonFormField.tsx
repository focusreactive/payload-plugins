import type { JSONFieldServerComponent } from "payload";
import type { ComponentProps } from "react";
import { allows } from "../field/index.js";
import type { BuildGate } from "../field/index.js";
import { JsonFormClient } from "./JsonFormClient.js";

type Props = ComponentProps<JSONFieldServerComponent> & { build?: BuildGate };

export const JsonFormField = ({
  build,
  clientField,
  path,
  permissions,
  readOnly,
  req,
  schemaPath,
}: Props) => (
  <JsonFormClient
    field={clientField}
    mayBuild={allows(build, req.user)}
    path={path}
    permissions={permissions}
    readOnly={readOnly}
    schemaPath={schemaPath}
  />
);
