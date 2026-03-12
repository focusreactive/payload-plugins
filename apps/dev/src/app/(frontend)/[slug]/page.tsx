import React from 'react'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { PageClient } from './PageClient'

type Props = {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
  })

  const page = docs[0]
  if (!page) notFound()

  return (
    <PageClient
      initialData={page as any}
      serverURL={process.env.NEXT_PUBLIC_SERVER_URL ?? ''}
    />
  )
}
