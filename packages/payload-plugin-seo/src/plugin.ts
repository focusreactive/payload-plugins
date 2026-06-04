import type { Config, Plugin } from "payload";

export const seoPlugin =
  (): Plugin =>
  (incomingConfig: Config): Config => {
    return incomingConfig;
  };
