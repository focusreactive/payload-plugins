"use client";

import { Button, useTranslation } from "@payloadcms/ui";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";

const spinKeyframes = `
@keyframes sso-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

const ssoProviderName =
  typeof process.env.NEXT_PUBLIC_OIDC_PROVIDER_NAME === "string" &&
  process.env.NEXT_PUBLIC_OIDC_PROVIDER_NAME.length > 0
    ? process.env.NEXT_PUBLIC_OIDC_PROVIDER_NAME
    : "SSO";

export default function SSOButtons() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleSSOClick = () => {
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

      <div
        style={{
          alignItems: "center",
          display: "flex",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            background: "var(--theme-elevation-150)",
            flex: 1,
            height: 1,
          }}
        />
        <div style={{ color: "var(--theme-text)", fontSize: 12, opacity: 0.7 }}>
          {t("sso:dividerLabel" as never)}
        </div>
        <div
          style={{
            background: "var(--theme-elevation-150)",
            flex: 1,
            height: 1,
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <Button
          size="large"
          buttonStyle="secondary"
          iconStyle="without-border"
          disabled={loading}
          extraButtonProps={{ style: { width: "100%" } }}
          onClick={handleSSOClick}
        >
          <span
            style={{
              alignItems: "center",
              display: "flex",
              gap: 8,
              height: "100%",
              width: "100%",
            }}
          >
            {loading ? (
              <>
                <Loader2
                  aria-hidden
                  style={{
                    animation: "sso-spin 1s linear infinite",
                    height: 16,
                    width: 16,
                  }}
                />
                <style>{spinKeyframes}</style>
              </>
            ) : null}
            <span>
              {loading
                ? t("general:loading")
                : t("sso:signInWith" as never, { provider: ssoProviderName })}
            </span>
          </span>
        </Button>
      </div>
    </div>
  );
}
