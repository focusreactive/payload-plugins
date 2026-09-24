export function blobHostname(blobBaseUrl: string | null | undefined): string | null;

export function mediaFileRedirects(blobBaseUrl: string | null | undefined): Array<{
  destination: string;
  permanent: true;
  source: "/api/media/file/:filename";
}>;

export function mediaRemotePatterns(args: {
  blobBaseUrl: string | null | undefined;
  nodeEnv: string | undefined;
}): Array<{
  hostname: string;
  pathname?: string;
  port?: string;
  protocol: "http" | "https";
}>;
