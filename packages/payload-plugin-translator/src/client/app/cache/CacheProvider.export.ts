import type { RawPayloadComponentExport } from "../../../types/PayloadComponentExport";
import { clientComponentPath } from "../../shared/utils/componentPath";

export class CacheProviderExport implements RawPayloadComponentExport {
  path = clientComponentPath("app/cache/CacheProvider");
  serverProps?: { basePath: string };

  constructor(basePath: string) {
    this.serverProps = { basePath };
  }
}
