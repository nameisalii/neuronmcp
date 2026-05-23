import { prisma } from '@/lib/db'

export type Week1ReportData = {
  knowledgeCount: number
  decisionsCount: number
  ideasCount: number
  undocumentedDecisions: number
  conflicts: number
  topItems: Array<{ id: string; content: string; category: string }>
  tokensSaved: number
}

export async function generateWeek1Report(workspaceId: string): Promise<Week1ReportData> {
  const [knowledgeCount, decisionsCount, ideasCount, undocumentedDecisions, conflicts, topItems] =
    await Promise.all([
      prisma.knowledgeItem.count({ where: { workspaceId } }),
      prisma.decision.count({ where: { workspaceId } }),
      prisma.idea.count({ where: { workspaceId } }),
      prisma.decision.count({ where: { workspaceId, reason: null } }),
      prisma.knowledgeItem.count({ where: { workspaceId, frozen: true } }),
      prisma.knowledgeItem.findMany({
        where: { workspaceId, verified: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, content: true, category: true },
      }),
    ])

  return {
    knowledgeCount,
    decisionsCount,
    ideasCount,
    undocumentedDecisions,
    conflicts,
    topItems,
    tokensSaved: knowledgeCount * 150,
  }
}
