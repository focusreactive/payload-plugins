import { Link } from "@/components/shared";

import { FormClient } from "./FormClient";
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
 * §5.6 / §6.7: a real <form>. Internal mode posts to /api/forms/submit (fetch-enhanced; without
 * JS the 303 redirect lands on `#<domId>-ok` and CSS :target shows the success state). Mautic mode
 * renders the markup Mautic's "manual copy" expects — `mauticform[...]` names, no iframe, no JS.
 */
export function Form(props: FormProps) {
  const { domId, mode, action, fields, submitLabel, consentText, successMessage, successLink } =
    props;
  const mautic = mode === "mautic";
  const consentId = consentText ? `${domId}-consent` : undefined;

  const hidden = mautic ? (
    <>
      <input type="hidden" name="mauticform[formId]" value={props.mauticFormId ?? ""} />
      <input type="hidden" name="mauticform[formName]" value={props.formName} />
      <input type="hidden" name="mauticform[return]" value="" />
    </>
  ) : (
    <>
      <input type="hidden" name="formId" value={props.formId} />
      <input type="hidden" name="formName" value={props.formName} />
      <input type="hidden" name="page" value="" />
      <input type="hidden" name="referrer" value="" />
      <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
        <label htmlFor={`${domId}-website`}>Website</label>
        <input
          id={`${domId}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
    </>
  );

  const body = (
    <>
      {hidden}
      <div className="grid gap-5 md:grid-cols-2">
        {fields.map((field) => (
          <FormField key={field.name} field={field} domId={domId} mautic={mautic} />
        ))}
      </div>
      {consentText && (
        <p id={consentId} className="mt-5 max-w-[70ch] text-small text-muted-foreground">
          {consentText}
        </p>
      )}
      <button
        type="submit"
        name={mautic ? "mauticform[submit]" : undefined}
        aria-describedby={consentId}
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        {submitLabel}
      </button>
    </>
  );

  return (
    <div id={domId} className="ct-form relative">
      {mautic ? (
        <form
          method="post"
          action={action}
          id={`mauticform_${props.formName}`}
          data-mautic-form={props.formName}
          encType="multipart/form-data"
          autoComplete="off"
        >
          {body}
        </form>
      ) : (
        <FormClient
          action={action}
          enhance
          success={<Success message={successMessage} link={successLink} />}
        >
          {body}
        </FormClient>
      )}
      {!mautic && <Success id={`${domId}-ok`} message={successMessage} link={successLink} />}
    </div>
  );
}
