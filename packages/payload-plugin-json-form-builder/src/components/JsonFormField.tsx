import type { JSONFieldServerComponent } from "payload";
import type { ComponentProps } from "react";
import { allows } from "../field/index.js";
import type { BuildGate } from "../field/index.js";
import { JsonFormClient } from "./JsonFormClient.js";

type Props = ComponentProps<JSONFieldServerComponent> & {
  build?: BuildGate;
  library?: boolean;
  shares?: boolean;
};

export const JsonFormField = ({
  build,
  library,
  shares,
  clientField,
  path,
  permissions,
  readOnly,
  req,
  schemaPath,
}: Props) => (
  <JsonFormClient
    field={clientField}
    library={Boolean(library)}
    mayBuild={allows(build, req.user)}
    shares={Boolean(shares)}
    path={path}
    permissions={permissions}
    readOnly={readOnly}
    schemaPath={schemaPath}
  />
);
