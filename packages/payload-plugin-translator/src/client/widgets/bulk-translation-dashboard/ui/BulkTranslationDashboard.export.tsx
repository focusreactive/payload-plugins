import type { AccessGuard } from "../../../../types/AccessGuard.js";
import { AnyAccessGuard } from "../../../../server/shared/index.js";
import type { RawPayloadComponentExport } from "../../../../types/PayloadComponentExport.js";
import { clientComponentPath } from "../../../shared/utils/componentPath.js";

export class BulkDocumentTranslationDashboard implements RawPayloadComponentExport {
  serverProps?: object | Record<string, any> | undefined;

  readonly access: AccessGuard;

  constructor(access: AccessGuard = new AnyAccessGuard()) {
    this.access = access;
    this.serverProps = { access };
  }
  path = clientComponentPath(
    "widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.server"
  );
}
