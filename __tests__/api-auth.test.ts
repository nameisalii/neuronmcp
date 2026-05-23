/**
 * @jest-environment node
 */
import { validateApiKey } from '@/lib/api-auth'

const VALID_KEY = 'test-api-key-32-chars-long-enough'
const WORKSPACE_ID = 'ws-test-123'

function makeRequest(authHeader?: string): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (authHeader) headers.set('authorization', authHeader)
  return new Request('http://localhost/api/query', { method: 'POST', headers })
}

describe('validateApiKey', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEURON_API_KEY: VALID_KEY,
      NEURON_WORKSPACE_ID: WORKSPACE_ID,
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns workspaceId for a valid Bearer token', () => {
    const req = makeRequest(`Bearer ${VALID_KEY}`)
    expect(validateApiKey(req)).toBe(WORKSPACE_ID)
  })

  it('returns null when Authorization header is missing', () => {
    const req = makeRequest()
    expect(validateApiKey(req)).toBeNull()
  })

  it('returns null for wrong key', () => {
    const req = makeRequest('Bearer wrong-key')
    expect(validateApiKey(req)).toBeNull()
  })

  it('returns null when header lacks Bearer prefix', () => {
    const req = makeRequest(VALID_KEY)
    expect(validateApiKey(req)).toBeNull()
  })

  it('returns null when NEURON_API_KEY is not set', () => {
    delete process.env.NEURON_API_KEY
    const req = makeRequest(`Bearer ${VALID_KEY}`)
    expect(validateApiKey(req)).toBeNull()
  })

  it('returns null when NEURON_WORKSPACE_ID is not set', () => {
    delete process.env.NEURON_WORKSPACE_ID
    const req = makeRequest(`Bearer ${VALID_KEY}`)
    expect(validateApiKey(req)).toBeNull()
  })
})
