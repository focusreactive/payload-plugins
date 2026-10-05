import { cn, resolveBackdropTone } from "@/components/utils";
import { AbstractBackdrop } from "@/components/AbstractBackdrop";
import { GridLines } from "@/components/GridLines";
import { MauticForm } from "@/components/MauticForm";
import type { SectionHeaderProps } from "@/components/SectionHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { getNewsletterForm } from "@/lib/mautic";

interface NewsletterSectionProps {
  /** Block id: Mautic returns to `#form-newsletter-<id>-ok`. */
  id?: string | null;
  header?: SectionHeaderProps | null;
  inputPlaceholder: string;
  buttonLabel: string;
  disclaimer?: string | null;
  theme?: string | null;
}

export async function NewsletterSection({
  id,
  header,
  inputPlaceholder,
  buttonLabel,
  disclaimer,
  theme,
}: NewsletterSectionProps) {
  const mautic = await getNewsletterForm();
  const backdropTone = resolveBackdropTone(theme);
  const formId = `newsletter-${id ?? "band"}`;
  const successId = `form-${formId}-ok`;

  // §6.7: on light sections the band is a dark-blue card with the ring backdrop.
  const card = backdropTone !== "dark";
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        card && "dark-zone rounded-lg bg-ct-dark-blue px-6 text-ct-white"
      )}
      data-theme={card ? "dark" : undefined}
    >
      <AbstractBackdrop tone="dark" intensity="subtle" />
      {!card && <GridLines tone={backdropTone} />}
      <div className="relative z-10 flex flex-col items-center gap-[26px] py-[clamp(48px,7vw,96px)] text-center">
        {header && <SectionHeader {...header} align="center" className="max-w-[760px]" />}

        <div aria-live="polite" className="ct-form flex flex-col items-center gap-4">
          <p id={successId} className="ct-form-success text-lead font-medium" tabIndex={-1}>
            You&rsquo;re in. Talk soon.
          </p>
          <MauticForm
            {...mautic}
            successAnchor={successId}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <label htmlFor={`${formId}-email`} className="sr-only">
              Email address
            </label>
            <input
              id={`${formId}-email`}
              type="email"
              name="mauticform[email]"
              required
              placeholder={inputPlaceholder}
              className={cn(
                "min-h-11 min-w-[280px] rounded-md border border-transparent bg-white px-4",
                "text-ct-grey-900 placeholder:text-ct-grey-600",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                "text-base"
              )}
            />
            <button
              type="submit"
              name="mauticform[submit]"
              className={cn(
                "min-h-11 rounded-md bg-accent px-5",
                "text-accent-foreground text-base font-semibold",
                "transition-colors hover:bg-ct-white hover:text-ct-dark-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              )}
            >
              {buttonLabel}
            </button>
          </MauticForm>
        </div>

        {disclaimer && <p className="text-small text-muted-foreground">{disclaimer}</p>}
      </div>
    </div>
  );
}
