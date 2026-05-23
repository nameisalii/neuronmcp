/**
 * @jest-environment node
 */
import { POST } from '../route'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'

jest.mock('@clerk/nextjs/server', () => ({ auth: jest.fn() }))
jest.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    knowledgeItem: { findFirst: jest.fn(), update: jest.fn() },
  },
}))

const mockAuth = jest.mocked(auth)
const mockUserFind = jest.mocked(prisma.user.findUnique)
const mockItemFind = jest.mocked(prisma.knowledgeItem.findFirst)
const mockItemUpdate = jest.mocked(prisma.knowledgeItem.update)

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/knowledge/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ userId: 'user-clerk-1' } as never)
  mockUserFind.mockResolvedValue({ email: 'alice@example.com', workspace: { id: 'ws-1' } } as never)
  mockItemFind.mockResolvedValue({ id: 'item-1' } as never)
  mockItemUpdate.mockResolvedValue({ id: 'item-1', verified: true } as never)
})

describe('POST /api/knowledge/verify', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as never)

    const res = await POST(makeRequest({ id: 'item-1' }))

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 when id is missing', async () => {
    const res = await POST(makeRequest({}))

    expect(res.status).toBe(400)
  })

  it('returns 404 when user has no workspace', async () => {
    mockUserFind.mockResolvedValue(null)

    const res = await POST(makeRequest({ id: 'item-1' }))

    expect(res.status).toBe(404)
  })

  it('returns 404 when item does not belong to the workspace (IDOR guard)', async () => {
    mockItemFind.mockResolvedValue(null)

    const res = await POST(makeRequest({ id: 'item-from-other-workspace' }))

    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Not found')
  })

  it('queries item with both id and workspaceId to prevent IDOR', async () => {
    await POST(makeRequest({ id: 'item-1' }))

    expect(mockItemFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'item-1', workspaceId: 'ws-1' },
      })
    )
  })

  it('sets verified:true, verifiedAt, and verifiedBy on success', async () => {
    await POST(makeRequest({ id: 'item-1' }))

    expect(mockItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          verified: true,
          verifiedBy: 'alice@example.com',
          verifiedAt: expect.any(Date),
        }),
      })
    )
  })

  it('returns { id, verified: true } on success', async () => {
    const res = await POST(makeRequest({ id: 'item-1' }))

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toMatchObject({ id: 'item-1', verified: true })
  })

  it('returns 500 on unexpected DB error', async () => {
    mockItemUpdate.mockRejectedValue(new Error('DB error'))

    const res = await POST(makeRequest({ id: 'item-1' }))

    expect(res.status).toBe(500)
    const data = await res.json()
    expect(data.error).toBe('Internal server error')
  })
})
