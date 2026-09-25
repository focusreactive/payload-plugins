import type { AccessGuard } from "../../../../types/AccessGuard.js";
import { AnyAccessGuard } from "../../../../server/shared/index.js";
import type { RawPayloadComponentExport } from "../../../../types/PayloadComponentExport.js";
import type { TargetSelectionMode } from "../../../../types/TargetSelection.js";
import { clientComponentPath } from "../../../shared/utils/componentPath.js";

export class BulkDocumentTranslationDashboard implements RawPayloadComponentExport {
  serverProps?: object | Record<string, any> | undefined;

  constructor(
    readonly access: AccessGuard = new AnyAccessGuard(),
    readonly targetSelection: TargetSelectionMode = "single"
  ) {
    this.serverProps = { access, targetSelection };
  }
  path = clientComponentPath(
    "widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.server"
  );
}
