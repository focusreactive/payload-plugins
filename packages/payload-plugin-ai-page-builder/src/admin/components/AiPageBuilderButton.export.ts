import type { RawPayloadComponent } from "payload";

import { adminComponentPath } from "../../shared/componentPath";

export class AiPageBuilderButtonExport implements RawPayloadComponent {
  path: string;
  serverProps?: { basePath: string };

  constructor(basePath: string) {
    this.path = adminComponentPath("AiPageBuilderButton.server");
    this.serverProps = { basePath };
  }
}
