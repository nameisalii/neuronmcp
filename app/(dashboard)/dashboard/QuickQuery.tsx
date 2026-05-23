'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'

interface QueryResult {
  answer: string
  confidence: number
  sources: { id: string; category: string; source: string; verified: boolean }[]
}

export default function QuickQuery() {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = (await res.json()) as QueryResult & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Query failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything about how your team works…"
          disabled={loading}
          className="flex-1 px-3 py-2 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          type="submit"
          disabled={loading || question.trim().length < 3}
          className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '…' : 'Ask'}
        </button>
      </form>

      {error && (
        <p className="text-xs text-red-600 px-1">{error}</p>
      )}

      {result && (
        <Card padding="sm" className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-gray-800 leading-relaxed">{result.answer}</p>
            {result.confidence > 0 && (
              <span className="shrink-0 text-xs font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                {result.confidence}%
              </span>
            )}
          </div>
          {result.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
              {result.sources.map((s) => (
                <span
                  key={s.id}
                  className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 capitalize"
                >
                  {s.category} · {s.source}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
