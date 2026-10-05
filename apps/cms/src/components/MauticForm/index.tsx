"use client";

import { useEffect, useRef } from "react";

interface MauticFormProps {
  action: string | null;
  formId: string;
  formName: string;
  /** Element id Mautic returns to after a submit; CSS `:target` shows the success state. */
  successAnchor: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Plain HTML post in the shape of Mautic's "manual copy" form: no iframe and no Mautic script, so
 * it works without JavaScript. JavaScript only fills the return URL.
 */
export function MauticForm({
  action,
  formId,
  formName,
  successAnchor,
  className,
  children,
}: MauticFormProps) {
  const returnRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (returnRef.current) {
      const { origin, pathname, search } = window.location;
      returnRef.current.value = `${origin}${pathname}${search}#${successAnchor}`;
    }
  }, [successAnchor]);

  return (
    <form
      method="post"
      action={action ?? undefined}
      id={`mauticform_${formName}`}
      data-mautic-form={formName}
      encType="multipart/form-data"
      className={className}
      onSubmit={(event) => {
        // Demo without a Mautic URL: show the same success state Mautic would return to.
        if (!action) {
          event.preventDefault();
          window.location.hash = successAnchor;
        }
      }}
    >
      <input type="hidden" name="mauticform[formId]" value={formId} />
      <input type="hidden" name="mauticform[formName]" value={formName} />
      <input ref={returnRef} type="hidden" name="mauticform[return]" value="" />
      {children}
    </form>
  );
}
