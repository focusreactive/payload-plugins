"use client";

import { useTranslation } from "@payloadcms/ui";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";

const spinKeyframes = `
@keyframes sso-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

const buttonStyle: React.CSSProperties = {
  alignItems: "center",
  background: "var(--theme-elevation-0)",
  border: "1px solid var(--theme-elevation-200)",
  borderRadius: "var(--style-radius-m)",
  color: "var(--theme-text)",
  cursor: "pointer",
  display: "flex",
  fontSize: 15,
  gap: 12,
  justifyContent: "center",
  padding: "12px 16px",
  width: "100%",
};

function GoogleMark() {
  return (
    <svg aria-hidden height="20" viewBox="0 0 48 48" width="20">
      <path
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        fill="#EA4335"
      />
      <path
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        fill="#4285F4"
      />
      <path
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        fill="#FBBC05"
      />
      <path
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        fill="#34A853"
      />
    </svg>
  );
}

function MicrosoftMark() {
  return (
    <svg aria-hidden height="20" viewBox="0 0 21 21" width="20">
      <rect fill="#F25022" height="10" width="10" x="0" y="0" />
      <rect fill="#7FBA00" height="10" width="10" x="11" y="0" />
      <rect fill="#00A4EF" height="10" width="10" x="0" y="11" />
      <rect fill="#FFB900" height="10" width="10" x="11" y="11" />
    </svg>
  );
}

export default function SSOButtons() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [microsoftNote, setMicrosoftNote] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleGoogleClick = () => {
    setLoading(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    router.replace(url.pathname + url.search);
    window.location.href = "/api/auth/oidc";
  };

  return (
    <div style={{ marginTop: 12 }}>
      {error ? (
        <div
          role="alert"
          style={{
            background: "var(--theme-error-500)",
            borderRadius: "var(--border-radius-m)",
            color: "var(--theme-elevation-0)",
            fontSize: 13,
            marginBottom: 12,
            padding: "8px 12px",
          }}
        >
          {decodeURIComponent(error)}
        </div>
      ) : null}

      <div style={{ alignItems: "center", display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ background: "var(--theme-elevation-150)", flex: 1, height: 1 }} />
        <div style={{ color: "var(--theme-text)", fontSize: 12, opacity: 0.7 }}>
          {t("sso:dividerLabel" as never)}
        </div>
        <div style={{ background: "var(--theme-elevation-150)", flex: 1, height: 1 }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button disabled={loading} onClick={handleGoogleClick} style={buttonStyle} type="button">
          {loading ? (
            <>
              <Loader2
                aria-hidden
                style={{ animation: "sso-spin 1s linear infinite", height: 20, width: 20 }}
              />
              <style>{spinKeyframes}</style>
            </>
          ) : (
            <GoogleMark />
          )}
          <span>{loading ? t("general:loading") : "Continue with Google"}</span>
        </button>

        {/* Shown for the sign-in options a project can have; Microsoft is connected per project. */}
        <button onClick={() => setMicrosoftNote(true)} style={buttonStyle} type="button">
          <MicrosoftMark />
          <span>Continue with Microsoft</span>
        </button>
        {microsoftNote ? (
          <div
            style={{ color: "var(--theme-text)", fontSize: 13, opacity: 0.7, textAlign: "center" }}
          >
            Microsoft sign-in is connected when the project is set up.
          </div>
        ) : null}
      </div>
    </div>
  );
}
