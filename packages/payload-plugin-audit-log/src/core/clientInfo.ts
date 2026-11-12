import { MAX_IP_LENGTH, MAX_USER_AGENT_LENGTH } from "../constants";

export type ClientInfo = { ip: string | null; userAgent: string | null };

const capped = (value: string | null | undefined, maxLength: number): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
};

const headerOf = (headers: Headers | undefined, name: string): string | null =>
  typeof headers?.get === "function" ? headers.get(name) : null;

const forwardedClientIp = (headers: Headers | undefined): string | undefined =>
  headerOf(headers, "x-forwarded-for")?.split(",")[0];

export const clientInfoOf = (headers: Headers | undefined): ClientInfo => ({
  ip:
    capped(forwardedClientIp(headers), MAX_IP_LENGTH) ??
    capped(headerOf(headers, "x-real-ip"), MAX_IP_LENGTH),
  userAgent: capped(headerOf(headers, "user-agent"), MAX_USER_AGENT_LENGTH),
});
