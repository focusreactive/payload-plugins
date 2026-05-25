import { headers as getHeaders } from 'next/headers'
import type { BeforeDocumentControlsServerProps, CollectionConfig } from 'payload'

import type { AccessGuard } from '../../../../types/AccessGuard'
import { collectionHasDrafts } from '../../../../server/shared/guards'

import TranslateDocument from './TranslateDocument'

type TranslateDocumentServerProps = BeforeDocumentControlsServerProps & {
  collection: CollectionConfig
  access: AccessGuard
}

async function TranslateDocumentServer(props: TranslateDocumentServerProps) {
  const headers = await getHeaders()
  const hasAccess = await props.access.check({
    req: { user: props.user, headers, payload: props.payload },
  })

  if (!hasAccess) return null
  if (!props.id) return null

  const hasDrafts = collectionHasDrafts(props.collection)

  return <TranslateDocument hasDrafts={hasDrafts} />
}

export default TranslateDocumentServer
