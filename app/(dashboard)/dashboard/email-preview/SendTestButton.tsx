'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function SendTestButton() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSend() {
    setState('sending')
    try {
      const res = await fetch('/api/email/week1', { method: 'POST' })
      setState(res.ok ? 'sent' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <Button onClick={handleSend} disabled={state === 'sending'} size="sm">
      {state === 'idle' && 'Send test email to my address'}
      {state === 'sending' && 'Sending…'}
      {state === 'sent' && 'Sent!'}
      {state === 'error' && 'Failed — check console'}
    </Button>
  )
}
