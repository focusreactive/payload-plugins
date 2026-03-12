import React from 'react'

type Props = {
  title: string
  description?: string
}

export function HeroSection({ title, description }: Props) {
  return (
    <section style={{ padding: '80px 40px', borderBottom: '1px solid #eee' }}>
      <h1 style={{ fontSize: '3rem', margin: '0 0 16px' }}>{title}</h1>
      {description && (
        <p style={{ fontSize: '1.25rem', color: '#555', margin: 0 }}>{description}</p>
      )}
    </section>
  )
}
