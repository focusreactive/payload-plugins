import { Form } from "@/blocks/Form/ui";
import type { FormFieldProps } from "@/blocks/Form/ui";
import {
  EMPLOYMENT_TYPE_OPTIONS,
  WORKPLACE_OPTIONS,
  optionLabel,
} from "@/collections/Vacancies/options";
import { Eyebrow } from "@/components/Eyebrow";
import { RichText, SectionContainer } from "@/components/shared";
import { getMauticForm } from "@/lib/mautic";
import type { Locale } from "@/lib/types";
import { formatPostDate } from "@/lib/utils/formatPostDate";
import type { Vacancy } from "@/payload-types";

// Names are the Mautic field aliases the apply form posts; the Application tab documents them.
const APPLY_FIELDS: FormFieldProps[] = [
  { label: "Full name", name: "name", required: true, type: "text", width: "half" },
  { label: "Email", name: "email", required: true, type: "email", width: "half" },
  { label: "LinkedIn or portfolio URL", name: "linkedin", type: "text" },
  { label: "Why you", name: "message", required: true, type: "textarea" },
  {
    label: "I agree that you process my data to assess my application",
    name: "consent",
    required: true,
    type: "checkbox",
  },
];

async function Apply({ vacancy }: { vacancy: Vacancy }) {
  const { mauticFormId, mauticFormName, email } = vacancy.apply ?? {};

  if (mauticFormId && mauticFormName) {
    const mautic = await getMauticForm(mauticFormId, mauticFormName);
    if (mautic.action) {
      return (
        <Form
          domId={`apply-${vacancy.id}`}
          mautic={mautic}
          fields={APPLY_FIELDS}
          submitLabel="Send application"
          successMessage="Thank you. We read every application and reply within two weeks."
        />
      );
    }
  }

  if (email) {
    return (
      <p className="text-lead text-foreground">
        Send your CV and a short cover letter to{" "}
        <a
          href={`mailto:${email}?subject=${encodeURIComponent(vacancy.title)}`}
          className="text-primary underline underline-offset-[3px]"
        >
          {email}
        </a>
        .
      </p>
    );
  }

  return <p className="text-lead text-muted-foreground">Applications open soon.</p>;
}

export async function VacancyContent({ vacancy, locale }: { vacancy: Vacancy; locale: Locale }) {
  const facts = [
    vacancy.department,
    vacancy.location,
    optionLabel(WORKPLACE_OPTIONS, vacancy.workplace),
    optionLabel(EMPLOYMENT_TYPE_OPTIONS, vacancy.employmentType),
  ].filter(Boolean);
  const closes = vacancy.closesAt ? formatPostDate(vacancy.closesAt, locale) : null;

  return (
    <article>
      <SectionContainer sectionData={{ theme: "light-gray" }}>
        <div className="flex max-w-[820px] flex-col gap-5">
          <Eyebrow tone="outline">Careers</Eyebrow>
          <h1 className="text-display-2 text-heading">{vacancy.title}</h1>
          <p className="max-w-[60ch] text-lead text-muted-foreground">{vacancy.summary}</p>
          {facts.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Role details">
              {facts.map((fact) => (
                <li
                  key={fact}
                  className="rounded-pill bg-primary-soft px-3 py-1 text-small font-medium text-primary-soft-foreground"
                >
                  {fact}
                </li>
              ))}
            </ul>
          )}
          {closes && (
            <p className="text-small text-muted-foreground">Applications close on {closes}.</p>
          )}
        </div>
      </SectionContainer>

      <SectionContainer sectionData={{ theme: "light" }}>
        <div className="mx-auto max-w-[720px]">
          <RichText content={vacancy.description} variant="copy" />
        </div>
      </SectionContainer>

      <SectionContainer sectionData={{ theme: "light-gray" }}>
        <div id="apply" className="mx-auto flex max-w-[720px] flex-col gap-6">
          <h2 className="text-h-section text-heading">Apply for this role</h2>
          <Apply vacancy={vacancy} />
        </div>
      </SectionContainer>
    </article>
  );
}
