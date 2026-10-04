import { SectionHeader } from "@/components/SectionHeader";
import { SectionContainer } from "@/components/shared";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { FormBlock } from "@/payload-types";

import { DEFAULT_MAUTIC_ACTION } from "./config";
import { Form } from "./ui";
import type { FormFieldProps } from "./ui";

export const FORM_SUBMIT_PATH = "/api/forms/submit";

export async function FormBlockComponent({
  eyebrow,
  heading,
  description,
  mode,
  formName,
  mauticFormId,
  mauticActionUrl,
  fields,
  submitLabel,
  consentText,
  successMessage,
  successLink,
  section,
  id,
}: FormBlock) {
  const locale = await resolveLocale();
  const header = prepareSectionHeaderProps({ description, eyebrow, heading });
  const isMautic = mode === "mautic";
  const blockId = id ?? formName;
  const success = successLink ? prepareLinkProps(successLink, locale) : null;

  const formFields: FormFieldProps[] = (fields ?? []).map((field) => ({
    label: field.label,
    name: field.name,
    options: (field.options ?? "")
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean),
    placeholder: field.placeholder,
    required: Boolean(field.required),
    type: field.type,
    width: field.width === "half" ? "half" : "full",
  }));

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>{header && <SectionHeader {...header} />}</div>
        <Form
          domId={`form-${blockId}`}
          mode={isMautic ? "mautic" : "internal"}
          action={
            isMautic
              ? `${mauticActionUrl || DEFAULT_MAUTIC_ACTION}${mauticFormId ?? ""}`
              : FORM_SUBMIT_PATH
          }
          formId={blockId}
          formName={formName}
          mauticFormId={mauticFormId}
          fields={formFields}
          submitLabel={submitLabel || "Submit"}
          consentText={consentText}
          successMessage={successMessage || "Thank you."}
          successLink={
            success?.href ? { href: success.href, label: successLink?.label || "Download" } : null
          }
        />
      </div>
    </SectionContainer>
  );
}
