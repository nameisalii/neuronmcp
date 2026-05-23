/**
 * @jest-environment node
 */
import { POST } from '../route'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { generateEmbedding } from '@/lib/openai'
import { upsertEmbedding } from '@/lib/pinecone'

jest.mock('@clerk/nextjs/server', () => ({ auth: jest.fn() }))
jest.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    knowledgeItem: { create: jest.fn(), update: jest.fn() },
  },
}))
jest.mock('@/lib/openai', () => ({ generateEmbedding: jest.fn() }))
jest.mock('@/lib/pinecone', () => ({ upsertEmbedding: jest.fn() }))
jest.mock('@/lib/api-auth', () => ({ validateApiKey: jest.fn().mockReturnValue(null) }))

const mockAuth = jest.mocked(auth)
const mockUserFind = jest.mocked(prisma.user.findUnique)
const mockItemCreate = jest.mocked(prisma.knowledgeItem.create)
const mockItemUpdate = jest.mocked(prisma.knowledgeItem.update)
const mockEmbedding = jest.mocked(generateEmbedding)
const mockUpsert = jest.mocked(upsertEmbedding)

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/decisions/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ userId: 'user-1' } as never)
  mockUserFind.mockResolvedValue({ workspace: { id: 'ws-1' } } as never)
  mockItemCreate.mockResolvedValue({ id: 'item-cuid-1' } as never)
  mockEmbedding.mockResolvedValue([0.1, 0.2, 0.3])
  mockUpsert.mockResolvedValue(undefined)
  mockItemUpdate.mockResolvedValue({} as never)
})

describe('POST /api/decisions/create', () => {
  it('saves a decision and returns saved:true with id', async () => {
    const res = await POST(makeRequest({ decision: 'We use TypeScript for all new services' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ saved: true, id: 'item-cuid-1' })
    expect(mockItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ category: 'decision' }) })
    )
    expect(mockUpsert).toHaveBeenCalledWith('item-cuid-1', [0.1, 0.2, 0.3], expect.any(Object))
  })

  it('saves optional reason and alternatives', async () => {
    await POST(makeRequest({ decision: 'Use Postgres', reason: 'Reliability', alternatives: 'MySQL' }))
    expect(mockItemCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reason: 'Reliability', alternatives: 'MySQL' }),
      })
    )
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as never)
    const res = await POST(makeRequest({ decision: 'test decision' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing decision field', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 400 for decision shorter than 3 chars', async () => {
    const res = await POST(makeRequest({ decision: 'ab' }))
    expect(res.status).toBe(400)
  })
})
