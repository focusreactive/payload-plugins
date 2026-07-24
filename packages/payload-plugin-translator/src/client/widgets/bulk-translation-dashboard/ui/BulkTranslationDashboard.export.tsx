import type { AccessGuard } from "../../../../types/AccessGuard";
import { AnyAccessGuard } from "../../../../server/shared";
import type { RawPayloadComponentExport } from "../../../../types/PayloadComponentExport";
import type { TargetSelectionMode } from "../../../../types/TargetSelection";
import { clientComponentPath } from "../../../shared/utils/componentPath";

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
