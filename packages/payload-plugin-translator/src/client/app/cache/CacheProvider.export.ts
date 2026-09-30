import type { RawPayloadComponentExport } from "../../../types/PayloadComponentExport.js";
import { clientComponentPath } from "../../shared/utils/componentPath.js";

export class CacheProviderExport implements RawPayloadComponentExport {
  path = clientComponentPath("app/cache/CacheProvider");
  serverProps?: { basePath: string };

  constructor(basePath: string) {
    this.serverProps = { basePath };
  }
}
