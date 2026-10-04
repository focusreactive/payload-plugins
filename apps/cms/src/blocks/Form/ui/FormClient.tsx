"use client";

import { useEffect, useRef, useState } from "react";

interface FormClientProps {
  action: string;
  enhance: boolean;
  formAttributes?: Record<string, string>;
  children: React.ReactNode;
  success: React.ReactNode;
}

/**
 * Progressive enhancement for internal forms: fills the hidden page/referrer inputs and submits
 * with fetch so the success state appears without navigation. Without JavaScript the form posts
 * normally and the server redirects to the success anchor.
 */
export function FormClient({
  action,
  enhance,
  formAttributes,
  children,
  success,
}: FormClientProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }
    const page = form.elements.namedItem("page");
    const referrer = form.elements.namedItem("referrer");
    if (page instanceof HTMLInputElement && !page.value) {
      page.value = window.location.href;
    }
    if (referrer instanceof HTMLInputElement && !referrer.value) {
      referrer.value = document.referrer;
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!enhance) {
      return;
    }
    event.preventDefault();
    setStatus("sending");
    try {
      const response = await fetch(action, {
        body: new FormData(event.currentTarget),
        headers: { Accept: "application/json" },
        method: "POST",
      });
      setStatus(response.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <div data-visible="">{success}</div>;
  }

  return (
    <form
      ref={formRef}
      method="post"
      action={action}
      onSubmit={handleSubmit}
      aria-busy={status === "sending" || undefined}
      {...formAttributes}
    >
      {children}
      {status === "error" && (
        <p role="alert" className="mt-4 text-small text-ct-error">
          Something went wrong. Please try again or email us.
        </p>
      )}
    </form>
  );
}
