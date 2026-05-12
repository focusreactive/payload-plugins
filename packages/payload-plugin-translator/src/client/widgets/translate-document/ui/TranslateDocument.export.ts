import type { CollectionConfig } from 'payload'

import type { AccessGuard } from '../../../../types/AccessGuard'
import { AnyAccessGuard } from '../../../../server/shared'
import type { RawPayloadComponentExport } from '../../../shared/types/PayloadComponentExport'
import { clientComponentPath } from '../../../shared/utils/componentPath'

export class TranslateDocumentExport implements RawPayloadComponentExport {
  serverProps?: object | Record<string, any> | undefined

  constructor(
    readonly collection: CollectionConfig,
    readonly access: AccessGuard = new AnyAccessGuard(),
  ) {
    this.serverProps = { collection, access }
  }
  path = clientComponentPath('widgets/translate-document/ui/TranslateDocument.server')
}
