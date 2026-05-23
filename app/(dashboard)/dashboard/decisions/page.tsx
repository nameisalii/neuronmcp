import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import DecisionTimeline from './DecisionTimeline'

export default async function DecisionsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { workspace: { select: { id: true } } },
  })

  const items = user?.workspace
    ? await prisma.knowledgeItem.findMany({
        where: { workspaceId: user.workspace.id, category: 'decision' },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          content: true,
          reason: true,
          alternatives: true,
          source: true,
          owner: true,
          createdAt: true,
        },
      })
    : []

  const decisions = items.map((d) => ({
    id: d.id,
    title: d.content.slice(0, 72) + (d.content.length > 72 ? '…' : ''),
    decision: d.content,
    reason: d.reason ?? null,
    alternatives: d.alternatives ?? null,
    source: d.source,
    madeBy: d.owner ?? null,
    madeAt: null,
    createdAt: d.createdAt.toISOString(),
  }))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Decisions</h1>
        <p className="text-gray-500 text-sm mt-1">
          A log of every decision captured from your team&apos;s conversations.
        </p>
      </div>
      <DecisionTimeline decisions={decisions} />
    </div>
  )
}
