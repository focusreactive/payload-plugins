import type { TranslateKitConfig } from "../../../types/wire/TranslateKitConfig.js";
import type { RawPayloadComponentExport } from "../../../types/PayloadComponentExport.js";
import { clientComponentPath } from "../../shared/utils/componentPath.js";

export class CacheProviderExport implements RawPayloadComponentExport {
  path = clientComponentPath("app/cache/CacheProvider");
  clientProps: TranslateKitConfig;

  constructor(config: TranslateKitConfig) {
    this.clientProps = config;
  }
}
