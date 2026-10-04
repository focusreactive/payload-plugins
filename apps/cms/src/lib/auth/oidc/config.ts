/**
 * OIDC configuration from env.
 * Used by routes /api/auth/oidc and /api/auth/oidc/callback.
 */
function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SERVER_URL;
  if (url) {
    return url.replace(/\/$/, "");
  }
  return "";
}

export interface OIDCConfig {
  /** Issuer as it appears in tokens (the browser-facing URL). */
  issuer: string;
  /**
   * Where the server fetches discovery. Differs from `issuer` when the IdP is reached through an
   * internal hostname (compose: http://keycloak:8081 vs the browser's http://localhost:8081).
   */
  discoveryIssuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
  usePkce: boolean;
  providerName: string;
}

export function getOIDCConfig(): OIDCConfig | null {
  const issuer = process.env.OIDC_ISSUER?.replace(/\/$/, "");
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;

  if (!issuer || !clientId || !clientSecret) {
    return null;
  }

  const baseUrl = getBaseUrl();
  const redirectUri =
    process.env.OIDC_REDIRECT_URI || (baseUrl ? `${baseUrl}/api/auth/oidc/callback` : "");

  if (!redirectUri) {
    return null;
  }

  return {
    clientId,
    discoveryIssuer: process.env.OIDC_INTERNAL_ISSUER?.replace(/\/$/u, "") || issuer,
    clientSecret,
    issuer,
    providerName: process.env.OIDC_PROVIDER_NAME || "SSO",
    redirectUri,
    scopes: process.env.OIDC_SCOPES || "openid profile email",
    usePkce: process.env.OIDC_USE_PKCE === "true",
  };
}

export function isOIDCEnabled(): boolean {
  return getOIDCConfig() !== null;
}
