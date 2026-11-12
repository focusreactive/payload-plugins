import { FieldLabel, Pill, useField } from "@payloadcms/ui";
import type {
  DefaultCellComponentProps,
  SelectFieldClientProps,
  TextFieldClientProps,
} from "payload";
import { actionLook, actorTypeLook } from "./auditPillLooks";
import type { PillLook } from "./auditPillLooks";

type Describe = (code: string) => PillLook;

function AuditPill({ code, describe }: { code?: string | null; describe: Describe }) {
  if (!code) return null;
  const { label, pillStyle } = describe(code);
  return (
    <div style={{ display: "inline-flex" }} title={code}>
      <Pill pillStyle={pillStyle} size="small">
        {label}
      </Pill>
    </div>
  );
}

function AuditPillField({
  path,
  label,
  describe,
}: {
  path: string;
  label: TextFieldClientProps["field"]["label"];
  describe: Describe;
}) {
  const { value } = useField<string>({ path });
  return (
    <div className="field-type">
      <FieldLabel label={label} path={path} />
      <AuditPill code={value} describe={describe} />
    </div>
  );
}

export const AuditActionCell = ({ cellData }: DefaultCellComponentProps) => (
  <AuditPill code={cellData} describe={actionLook} />
);

export const AuditActorTypeCell = ({ cellData }: DefaultCellComponentProps) => (
  <AuditPill code={cellData} describe={actorTypeLook} />
);

export const AuditActionField = ({ path, field }: TextFieldClientProps) => (
  <AuditPillField describe={actionLook} label={field.label} path={path} />
);

export const AuditActorTypeField = ({ path, field }: SelectFieldClientProps) => (
  <AuditPillField describe={actorTypeLook} label={field.label} path={path} />
);
