import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const API_URL = process.env.NEURON_API_URL
const API_KEY = process.env.NEURON_API_KEY

if (!API_URL) throw new Error('NEURON_API_URL is required')
if (!API_KEY) throw new Error('NEURON_API_KEY is required')

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` }
}

const server = new McpServer({ name: 'neuron', version: '1.0.0' })

server.tool(
  'query_company_brain',
  'Query your company knowledge base for rules, decisions, and processes. Use this before answering any question about how the company works.',
  { question: z.string().min(3).describe('The question to ask the company brain') },
  async ({ question }) => {
    const res = await fetch(`${API_URL}/api/query`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ question }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { content: [{ type: 'text', text: `Error: ${res.status} ${err}` }], isError: true }
    }
    const data = await res.json() as { answer: string; confidence: number; sources: Array<{ content: string; category: string }> }
    const sourcesText = data.sources.length > 0
      ? '\n\nSources:\n' + data.sources.map((s, i) => `[${i + 1}] (${s.category}) ${s.content}`).join('\n')
      : ''
    return {
      content: [{ type: 'text', text: `${data.answer}\n\nConfidence: ${data.confidence}%${sourcesText}` }],
    }
  }
)

server.tool(
  'get_company_context',
  'Get your full verified company context — all rules, decisions and processes. Use at the start of any session involving company knowledge.',
  {},
  async () => {
    const res = await fetch(`${API_URL}/api/context?format=markdown`, {
      headers: authHeaders(),
    })
    if (!res.ok) {
      const err = await res.text()
      return { content: [{ type: 'text', text: `Error: ${res.status} ${err}` }], isError: true }
    }
    const text = await res.text()
    return { content: [{ type: 'text', text }] }
  }
)

server.tool(
  'save_decision',
  'Save an important decision to the company brain.',
  {
    decision: z.string().min(3).describe('The decision to save'),
    reason: z.string().optional().describe('Why this decision was made'),
    alternatives: z.string().optional().describe('Alternatives that were considered'),
  },
  async ({ decision, reason, alternatives }) => {
    const res = await fetch(`${API_URL}/api/decisions/create`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ decision, reason, alternatives }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { content: [{ type: 'text', text: `Error: ${res.status} ${err}` }], isError: true }
    }
    const data = await res.json() as { saved: boolean; id: string }
    return { content: [{ type: 'text', text: `Decision saved (id: ${data.id})` }] }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)
