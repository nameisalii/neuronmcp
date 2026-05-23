import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { openai, generateEmbedding } from '@/lib/openai'
import { searchSimilar } from '@/lib/pinecone'
import { validateApiKey } from '@/lib/api-auth'
import { QUERY_SYSTEM_PROMPT } from '@/lib/extraction/prompts'

const QuerySchema = z.object({
  question: z.string().min(3).max(500),
})

async function textSearchFallback(question: string, workspaceId: string) {
  const words = question.split(/\s+/).filter((w) => w.length > 3)
  if (words.length === 0) return []

  return prisma.knowledgeItem.findMany({
    where: {
      workspaceId,
      frozen: false,
      OR: words.map((word) => ({ content: { contains: word, mode: 'insensitive' as const } })),
    },
    take: 5,
  })
}

type AuthResult =
  | { workspaceId: string }
  | { error: string; status: 401 | 404 }

async function resolveAuth(req: Request): Promise<AuthResult> {
  const apiWorkspaceId = validateApiKey(req)
  if (apiWorkspaceId) return { workspaceId: apiWorkspaceId }

  const { userId } = await auth()
  if (!userId) return { error: 'Unauthorized', status: 401 }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { workspace: { select: { id: true } } },
  })
  if (!user?.workspace) return { error: 'No workspace found', status: 404 }
  return { workspaceId: user.workspace.id }
}

export async function POST(req: Request) {
  try {
    const authResult = await resolveAuth(req)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    const { workspaceId } = authResult

    const body = await req.json()
    const parsed = QuerySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Question must be 3–500 characters' }, { status: 400 })
    }

    const { question } = parsed.data
    const embedding = await generateEmbedding(question)
    const matches = await searchSimilar(embedding, workspaceId, 5, 0.5)

    if (matches.length === 0) {
      return NextResponse.json({
        answer: "I don't have verified information about this yet.",
        confidence: 0,
        sources: [],
      })
    }

    const ids = matches.map((m) => m.id)
    const allItems = await prisma.knowledgeItem.findMany({
      where: { id: { in: ids }, frozen: false },
    })
    const ownedItems = allItems.filter((i) => i.workspaceId === workspaceId)
    const items = ownedItems.length > 0 ? ownedItems : await textSearchFallback(question, workspaceId)

    if (items.length === 0) {
      return NextResponse.json({
        answer: "I don't have verified information about this yet.",
        confidence: 0,
        sources: [],
      })
    }

    const scoreMap = new Map(matches.map((m) => [m.id, m.score]))
    const knowledge = items
      .map((item, i) => `[${i + 1}] (${item.category}) ${item.content}`)
      .join('\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: QUERY_SYSTEM_PROMPT },
        { role: 'user', content: `<question>${question}</question>\n\n<knowledge_items>\n${knowledge}\n</knowledge_items>` },
      ],
      temperature: 0.2,
    })

    const answer = response.choices[0]?.message?.content ?? "I don't have verified information about this yet."
    const avgScore = items.reduce((sum, item) => sum + (scoreMap.get(item.id) ?? 0), 0) / items.length

    return NextResponse.json({
      answer,
      confidence: Math.round(avgScore * 100),
      sources: items.map((item) => ({
        id: item.id,
        content: item.content,
        category: item.category,
        source: item.source,
        verified: item.verified,
        confidence: item.confidence,
      })),
    })
  } catch (err) {
    console.error('[query]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
