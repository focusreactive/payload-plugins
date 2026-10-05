import { SectionHeader } from "@/components/SectionHeader";
import { SectionContainer } from "@/components/shared";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import { getMauticForm } from "@/lib/mautic";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { FormBlock } from "@/payload-types";

import { Form } from "./ui";
import type { FormFieldProps } from "./ui";

export async function FormBlockComponent({
  eyebrow,
  heading,
  description,
  mauticFormId,
  mauticFormName,
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
  const blockId = id ?? mauticFormName;
  const mautic = await getMauticForm(mauticFormId, mauticFormName);
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
          mautic={mautic}
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
