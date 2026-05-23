'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'

interface Source {
  id: string
  content: string
  category: string
  source: string
  verified: boolean
  confidence: number
}

interface QueryResult {
  answer: string
  confidence: number
  sources: Source[]
}

export default function QueryPage() {
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
      const data = await res.json() as QueryResult & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Query failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ask your Brain</h1>
        <p className="text-gray-500 text-sm mt-1">Ask anything about how your company works.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What is our refund policy?"
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-md border border-gray-300 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          type="submit"
          disabled={loading || question.trim().length < 3}
          className="px-5 py-2.5 rounded-md bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {!result && !error && !loading && (
        <p className="text-center text-sm text-gray-400 py-12">
          Ask anything about how your company works
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
        </div>
      )}

      {error && (
        <Card padding="sm" className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <Card padding="md">
            <div className="flex items-start justify-between gap-4 mb-3">
              <p className="text-gray-900 text-sm leading-relaxed flex-1">{result.answer}</p>
              {result.confidence > 0 && (
                <span className="shrink-0 text-xs font-medium text-brand-700 bg-brand-50 px-2 py-1 rounded-full">
                  {result.confidence}% match
                </span>
              )}
            </div>

            {result.sources.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Sources</p>
                <div className="flex flex-wrap gap-2">
                  {result.sources.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
                    >
                      <span className="font-medium capitalize">{s.category}</span>
                      <span className="text-gray-400">·</span>
                      <span>{s.source}</span>
                      {s.verified && (
                        <>
                          <span className="text-gray-400">·</span>
                          <span className="text-green-600 font-medium">verified</span>
                        </>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
