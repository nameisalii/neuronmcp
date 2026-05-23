/**
 * @jest-environment node
 */
import { GET } from '../route'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

jest.mock('@clerk/nextjs/server', () => ({ auth: jest.fn() }))
jest.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    knowledgeItem: { findMany: jest.fn() },
  },
}))

const mockAuth = jest.mocked(auth)
const mockUserFind = jest.mocked(prisma.user.findUnique)
const mockItemFind = jest.mocked(prisma.knowledgeItem.findMany)

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/context')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

const mockItems = [
  {
    id: 'item-1',
    content: 'We require PR reviews before merging',
    category: 'rule',
    source: 'slack',
    owner: 'Alice',
    verifiedAt: new Date('2025-01-15'),
  },
  {
    id: 'item-2',
    content: 'We chose Postgres over MySQL for reliability',
    category: 'decision',
    source: 'slack',
    owner: null,
    verifiedAt: null,
  },
]

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ userId: 'user-1' } as never)
  mockUserFind.mockResolvedValue({ workspace: { id: 'ws-1' } } as never)
  mockItemFind.mockResolvedValue(mockItems as never)
})

describe('GET /api/context', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as never)

    const res = await GET(makeRequest())

    expect(res.status).toBe(401)
  })

  it('returns 404 when user has no workspace', async () => {
    mockUserFind.mockResolvedValue(null)

    const res = await GET(makeRequest())

    expect(res.status).toBe(404)
  })

  it('defaults to JSON format', async () => {
    const res = await GET(makeRequest())

    expect(res.headers.get('Content-Type')).toContain('application/json')
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('returns text/plain when format=markdown', async () => {
    const res = await GET(makeRequest({ format: 'markdown' }))

    expect(res.headers.get('Content-Type')).toContain('text/plain')
  })

  it('includes company knowledge header in markdown', async () => {
    const res = await GET(makeRequest({ format: 'markdown' }))
    const text = await res.text()

    expect(text).toContain('## Company Knowledge Context')
    expect(text).toContain('Items: 2')
  })

  it('groups items into labeled sections in markdown', async () => {
    const res = await GET(makeRequest({ format: 'markdown' }))
    const text = await res.text()

    expect(text).toContain('### Rules & Policies')
    expect(text).toContain('### Key Decisions')
  })

  it('includes item content and owner in markdown bullet', async () => {
    const res = await GET(makeRequest({ format: 'markdown' }))
    const text = await res.text()

    expect(text).toContain('We require PR reviews before merging')
    expect(text).toContain('Owner: Alice')
  })

  it('truncates output and appends [truncated] when maxTokens is small', async () => {
    const res = await GET(makeRequest({ format: 'markdown', maxTokens: '5' }))
    const text = await res.text()

    expect(text).toContain('[truncated]')
    expect(text.length).toBeLessThanOrEqual(20 + '[truncated]'.length + 2)
  })

  it('does not truncate when content fits within maxTokens', async () => {
    const res = await GET(makeRequest({ format: 'markdown', maxTokens: '10000' }))
    const text = await res.text()

    expect(text).not.toContain('[truncated]')
  })

  it('filters by category when category param is a valid value', async () => {
    await GET(makeRequest({ category: 'rule' }))

    expect(mockItemFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'rule' }),
      })
    )
  })

  it('ignores invalid category values and returns all items', async () => {
    await GET(makeRequest({ category: 'invalid' }))

    expect(mockItemFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ category: expect.anything() }),
      })
    )
  })

  it('only queries verified items', async () => {
    await GET(makeRequest())

    expect(mockItemFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ verified: true }),
      })
    )
  })

  it('only returns items from the authenticated user workspace (workspace isolation)', async () => {
    await GET(makeRequest())

    expect(mockItemFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: 'ws-1' }),
      })
    )
  })

  it('returns 500 on unexpected DB error', async () => {
    mockItemFind.mockRejectedValue(new Error('DB error'))

    const res = await GET(makeRequest())

    expect(res.status).toBe(500)
  })
})
