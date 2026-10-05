import { MauticForm } from "@/components/MauticForm";
import { Link } from "@/components/shared";

import { FormField } from "./FormFields";
import type { FormProps } from "./types";

export type { FormFieldProps, FormProps } from "./types";

function Success({
  message,
  link,
  id,
}: {
  message: string;
  link?: FormProps["successLink"];
  id?: string;
}) {
  return (
    <div id={id} className="ct-form-success" role="status" tabIndex={-1}>
      <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-7">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-pill bg-primary-soft text-primary-soft-foreground"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m5 12 5 5 9-10" />
          </svg>
        </span>
        <p className="text-lead text-heading">{message}</p>
        {link?.href && (
          <Link
            href={link.href}
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            {link.label}
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * §5.6 / §6.7: a real <form> posted to the client Mautic. Mautic returns to `#<domId>-ok` and CSS
 * :target shows the success state.
 */
export function Form(props: FormProps) {
  const { domId, mautic, fields, submitLabel, consentText, successMessage, successLink } = props;
  const consentId = consentText ? `${domId}-consent` : undefined;
  const successId = `${domId}-ok`;

  return (
    <div id={domId} className="ct-form relative">
      <MauticForm {...mautic} successAnchor={successId}>
        <div className="grid gap-5 md:grid-cols-2">
          {fields.map((field) => (
            <FormField key={field.name} field={field} domId={domId} />
          ))}
        </div>
        {consentText && (
          <p id={consentId} className="mt-5 max-w-[70ch] text-small text-muted-foreground">
            {consentText}
          </p>
        )}
        <button
          type="submit"
          name="mauticform[submit]"
          aria-describedby={consentId}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {submitLabel}
        </button>
      </MauticForm>
      <Success id={successId} message={successMessage} link={successLink} />
    </div>
  );
}
