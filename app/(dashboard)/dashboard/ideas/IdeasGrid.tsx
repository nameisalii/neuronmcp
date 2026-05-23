'use client'

import { useState } from 'react'
import { CheckCheck, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { clsx } from 'clsx'

export interface IdeaRow {
  id: string
  content: string
  source: string
  relatedIds: string[]
  actionedAt: string | null
  createdAt: string
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

interface IdeasGridProps {
  ideas: IdeaRow[]
}

export default function IdeasGrid({ ideas }: IdeasGridProps) {
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set())
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set())
  const [actionError, setActionError] = useState<string | null>(null)

  const connectedCount = ideas.filter((i) => i.relatedIds.length > 0).length

  async function handleAction(id: string) {
    setActioningIds((prev) => new Set([...prev, id]))
    setActionError(null)
    try {
      const res = await fetch(`/api/ideas/${id}`, { method: 'PATCH' })
      if (res.ok) {
        setActionedIds((prev) => new Set([...prev, id]))
      } else {
        setActionError('Could not mark as done. Please try again.')
      }
    } catch {
      setActionError('Network error. Please try again.')
    } finally {
      setActioningIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <p className="text-xs text-red-600 px-1">{actionError}</p>
      )}

      {connectedCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-md">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800">
            <span className="font-medium">{connectedCount} of your ideas are related</span> — they
            might combine into something bigger.
          </p>
        </div>
      )}

      {ideas.length === 0 ? (
        <Card padding="lg" className="text-center text-gray-500 text-sm">
          No ideas captured yet. Ideas are extracted from phrases like &ldquo;what if…&rdquo; or
          &ldquo;idea:&rdquo; in your Slack messages.
        </Card>
      ) : (
        <div className="columns-1 sm:columns-2 gap-4">
          {ideas.map((idea) => {
            const isActioned = idea.actionedAt !== null || actionedIds.has(idea.id)
            const isActioning = actioningIds.has(idea.id)

            return (
              <div key={idea.id} className="break-inside-avoid mb-4">
                <Card
                  padding="sm"
                  className={clsx('flex flex-col gap-3', isActioned && 'opacity-60')}
                >
                  <p
                    className={clsx(
                      'text-sm text-gray-800',
                      isActioned && 'line-through text-gray-500'
                    )}
                  >
                    {idea.content}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                      <span>{idea.source}</span>
                      <span>·</span>
                      <span>{timeAgo(idea.createdAt)}</span>
                      {idea.relatedIds.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-blue-600 font-medium">
                            Connected to {idea.relatedIds.length}{' '}
                            {idea.relatedIds.length === 1 ? 'idea' : 'ideas'}
                          </span>
                        </>
                      )}
                    </div>

                    {!isActioned && (
                      <button
                        onClick={() => handleAction(idea.id)}
                        disabled={isActioning}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors shrink-0"
                      >
                        <CheckCheck className="w-3 h-3" />
                        {isActioning ? '…' : 'Done'}
                      </button>
                    )}
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
