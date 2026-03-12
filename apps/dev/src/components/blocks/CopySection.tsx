import React from 'react'

type Props = {
  text: string
}

export function CopySection({ text }: Props) {
  return (
    <section style={{ padding: '60px 40px', borderBottom: '1px solid #eee' }}>
      <p style={{ fontSize: '1.125rem', lineHeight: 1.7, margin: 0 }}>{text}</p>
    </section>
  )
}
