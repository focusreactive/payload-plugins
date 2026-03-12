'use client'

import React from 'react'
import { useLivePreview } from '@payloadcms/live-preview-react'
import { RenderBlocks } from '../../../components/RenderBlocks'

type Page = {
  title: string
  slug: string
  sections: any[]
}

type Props = {
  initialData: Page
  serverURL: string
}

export function PageClient({ initialData, serverURL }: Props) {
  const { data } = useLivePreview<Page>({
    initialData,
    serverURL,
    depth: 1,
  })

  return (
    <div>
      <RenderBlocks blocks={data.sections ?? []} />
    </div>
  )
}
