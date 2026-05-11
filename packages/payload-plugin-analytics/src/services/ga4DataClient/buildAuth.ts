import type { Ga4Config } from "../../types/config";

export interface Ga4Credentials {
  client_email: string;
  private_key: string;
}

export function buildAuth(serviceAccount: Ga4Config["serviceAccount"]): Ga4Credentials {
  return {
    client_email: serviceAccount.clientEmail,
    private_key: serviceAccount.privateKey,
  };
}
