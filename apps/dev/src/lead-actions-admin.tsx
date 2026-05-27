'use client'

import { createLeadActionRegistry } from '@focus-reactive/payload-plugin-analytics/client'
import { Zap } from 'lucide-react'

export default createLeadActionRegistry({
  cta_pricing_click: { icon: Zap, label: 'Pricing CTA' },
})
