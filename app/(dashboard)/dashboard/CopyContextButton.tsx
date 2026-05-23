'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function CopyContextButton() {
  const [state, setState] = useState<'idle' | 'copying' | 'copied'>('idle')

  async function handleCopy() {
    setState('copying')
    try {
      const res = await fetch('/api/context?format=markdown')
      if (!res.ok) throw new Error('Failed to fetch context')
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('idle')
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      disabled={state === 'copying'}
    >
      {state === 'copied' ? 'Copied!' : state === 'copying' ? 'Copying…' : 'Copy Context'}
    </Button>
  )
}
