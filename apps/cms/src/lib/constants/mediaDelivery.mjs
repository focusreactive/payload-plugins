const DEV_MEDIA_PORTS = ["3333", "3000"];

export function blobHostname(blobBaseUrl) {
  const blobBase = blobBaseUrl?.replace(/\/+$/u, "");
  if (!blobBase) return null;

  try {
    return new URL(blobBase).hostname || null;
  } catch {
    return null;
  }
}

export function mediaFileRedirects(blobBaseUrl) {
  const blobBase = blobBaseUrl?.replace(/\/+$/u, "");
  if (!blobBase) return [];

  return [
    {
      destination: `${blobBase}/:filename`,
      permanent: true,
      source: "/api/media/file/:filename",
    },
  ];
}

export function mediaRemotePatterns({ blobBaseUrl, nodeEnv }) {
  const patterns = [];

  if (nodeEnv !== "production") {
    for (const port of DEV_MEDIA_PORTS) {
      patterns.push({
        hostname: "localhost",
        pathname: "/api/media/**",
        port,
        protocol: "http",
      });
    }
  }

  const hostname = blobHostname(blobBaseUrl);
  if (hostname) {
    patterns.push({
      hostname,
      protocol: "https",
    });
  }

  return patterns;
}
