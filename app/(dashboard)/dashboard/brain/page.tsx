import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import BrainGrid from './BrainGrid'

export default async function BrainPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { workspace: { select: { id: true } } },
  })

  const items = user?.workspace
    ? await prisma.knowledgeItem.findMany({
        where: { workspaceId: user.workspace.id },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          content: true,
          category: true,
          source: true,
          confidence: true,
          verified: true,
          verifiedAt: true,
          frozen: true,
          conflictNote: true,
          createdAt: true,
        },
      })
    : []

  const serialized = items.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    verifiedAt: item.verifiedAt?.toISOString() ?? null,
  }))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Brain</h1>
        <p className="text-gray-500 text-sm mt-1">
          All knowledge extracted from your workspace.
        </p>
      </div>
      <BrainGrid items={serialized} />
    </div>
  )
}
