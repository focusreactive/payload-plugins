"use client";

import { useEffect, useRef, useState } from "react";

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
  const [notConnected, setNotConnected] = useState(false);

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
        // Until a Mautic URL is set the fields stay usable, but nothing is posted anywhere.
        if (!action) {
          event.preventDefault();
          setNotConnected(true);
        }
      }}
    >
      <input type="hidden" name="mauticform[formId]" value={formId} />
      <input type="hidden" name="mauticform[formName]" value={formName} />
      <input ref={returnRef} type="hidden" name="mauticform[return]" value="" />
      {children}
      {notConnected && (
        <p role="status" className="w-full text-small text-muted-foreground">
          Thanks! Form submissions are not connected yet in this demo.
        </p>
      )}
    </form>
  );
}
