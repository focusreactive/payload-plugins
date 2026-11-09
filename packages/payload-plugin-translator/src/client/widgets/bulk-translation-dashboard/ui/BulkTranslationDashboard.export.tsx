import type { AccessGuard } from "../../../../types/AccessGuard.js";
import { AnyAccessGuard } from "../../../../server/shared/index.js";
import type { RawPayloadComponentExport } from "../../../../types/PayloadComponentExport.js";
import type { TargetSelectionMode } from "../../../../types/TargetSelection.js";
import { clientComponentPath } from "../../../shared/utils/componentPath.js";

export class BulkDocumentTranslationDashboard implements RawPayloadComponentExport {
  serverProps?: object | Record<string, any> | undefined;

  readonly access: AccessGuard;
  readonly targetSelection: TargetSelectionMode;

  constructor(
    access: AccessGuard = new AnyAccessGuard(),
    targetSelection: TargetSelectionMode = "single"
  ) {
    this.access = access;
    this.targetSelection = targetSelection;
    this.serverProps = { access, targetSelection };
  }
  path = clientComponentPath(
    "widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.server"
  );
}
