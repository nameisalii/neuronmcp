/**
 * @jest-environment node
 */
import { POST } from '../route'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { generateEmbedding, openai } from '@/lib/openai'
import { searchSimilar } from '@/lib/pinecone'

// ─── mocks ────────────────────────────────────────────────────────────────────

jest.mock('@clerk/nextjs/server', () => ({ auth: jest.fn() }))

jest.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    knowledgeItem: { findMany: jest.fn() },
  },
}))

jest.mock('@/lib/openai', () => ({
  generateEmbedding: jest.fn(),
  openai: { chat: { completions: { create: jest.fn() } } },
}))

jest.mock('@/lib/pinecone', () => ({ searchSimilar: jest.fn() }))

// ─── typed references ─────────────────────────────────────────────────────────

const mockAuth = jest.mocked(auth)
const mockUserFind = jest.mocked(prisma.user.findUnique)
const mockItemFind = jest.mocked(prisma.knowledgeItem.findMany)
const mockEmbed = jest.mocked(generateEmbedding)
const mockSearch = jest.mocked(searchSimilar)
const mockChat = jest.mocked(openai.chat.completions.create)

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockEmbedding = new Array(1536).fill(0.1)
const mockItem = {
  id: 'item-1',
  content: 'Refunds over $500 need manager approval',
  category: 'rule',
  source: 'slack',
  verified: true,
  confidence: 0.92,
  frozen: false,
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ userId: 'user-clerk-1' } as never)
  mockUserFind.mockResolvedValue({ workspace: { id: 'ws-1' } } as never)
  mockEmbed.mockResolvedValue(mockEmbedding)
  mockSearch.mockResolvedValue([{ id: 'item-1', score: 0.88 }])
  mockItemFind.mockResolvedValue([mockItem] as never)
  mockChat.mockResolvedValue({
    choices: [{ message: { content: 'Refunds over $500 require manager approval.' } }],
  } as never)
})

// ─── tests ────────────────────────────────────────────────────────────────────

describe('POST /api/query', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as never)

    const res = await POST(makeRequest({ question: 'What is the refund policy?' }))

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 when question is fewer than 3 characters', async () => {
    const res = await POST(makeRequest({ question: 'hi' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when question exceeds 500 characters', async () => {
    const res = await POST(makeRequest({ question: 'a'.repeat(501) }))

    expect(res.status).toBe(400)
  })

  it('returns 404 when user has no workspace', async () => {
    mockUserFind.mockResolvedValue(null)

    const res = await POST(makeRequest({ question: 'What is the refund policy?' }))

    expect(res.status).toBe(404)
  })

  it('returns answer, confidence, and sources on happy path', async () => {
    const res = await POST(makeRequest({ question: 'What is the refund policy?' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.answer).toBe('Refunds over $500 require manager approval.')
    expect(data.confidence).toBeGreaterThan(0)
    expect(data.sources).toHaveLength(1)
    expect(data.sources[0]).toMatchObject({ id: 'item-1', category: 'rule', verified: true })
  })

  it('filters Pinecone search by workspaceId', async () => {
    await POST(makeRequest({ question: 'What is the refund policy?' }))

    expect(mockSearch).toHaveBeenCalledWith(mockEmbedding, 'ws-1', 5, 0.5)
  })

  it('returns no-information answer when Pinecone finds no matches', async () => {
    mockSearch.mockResolvedValue([])

    const res = await POST(makeRequest({ question: 'What is the refund policy?' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.answer).toContain("don't have verified information")
    expect(data.confidence).toBe(0)
    expect(data.sources).toHaveLength(0)
  })

  it('returns no-information answer when all matched items are frozen', async () => {
    mockItemFind.mockResolvedValue([] as never)

    const res = await POST(makeRequest({ question: 'What is the refund policy?' }))

    const data = await res.json()
    expect(data.answer).toContain("don't have verified information")
    expect(data.sources).toHaveLength(0)
  })

  it('uses GPT-4o (not gpt-4o-mini) for synthesis', async () => {
    await POST(makeRequest({ question: 'What is the refund policy?' }))

    expect(mockChat).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o' }))
  })

  it('returns 500 on unexpected upstream error', async () => {
    mockEmbed.mockRejectedValue(new Error('OpenAI down'))

    const res = await POST(makeRequest({ question: 'What is the refund policy?' }))

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Internal server error')
  })
})
