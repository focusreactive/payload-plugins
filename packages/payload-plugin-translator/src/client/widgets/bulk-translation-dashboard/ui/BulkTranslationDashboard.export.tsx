import type { AccessGuard } from '../../../../types/AccessGuard'
import { AnyAccessGuard } from '../../../../server/shared'
import type { RawPayloadComponentExport } from '../../../shared/types/PayloadComponentExport'
import { clientComponentPath } from '../../../shared/utils/componentPath'

export class BulkDocumentTranslationDashboard implements RawPayloadComponentExport {
  serverProps?: object | Record<string, any> | undefined

  constructor(readonly access: AccessGuard = new AnyAccessGuard()) {
    this.serverProps = { access }
  }
  path = clientComponentPath('widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.server')
}
