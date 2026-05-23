# Neuron

Neuron reads your Slack workspace and builds a living knowledge base of your company's rules, decisions, and processes. You can query it in plain English from a web UI or directly from Claude Desktop via MCP — so your AI always knows how your company actually works.

## Features

- **Slack sync** — reads message history and extracts knowledge using GPT-4o
- **Semantic search** — Pinecone vector store powers similarity-based queries
- **Conflict detection** — flags new items that contradict existing knowledge
- **MCP server** — Claude Desktop can query and write to the brain directly
- **API key auth** — machine-to-machine access without Clerk sessions
- **Week 1 report** — automated email digest of extracted knowledge
- **4-step onboarding** — guided setup for new users

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/nameisalii/neuron_mcp.git
cd neuron_mcp
npm install

# 2. Copy env template and fill in values
cp .env.production.example .env.local

# 3. Set up the database
npx prisma migrate deploy

# 4. Start the dev server
npm run dev

# 5. Open http://localhost:3000 and sign up
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | For GPT-4o extraction and embeddings |
| `PINECONE_API_KEY` | Vector store |
| `PINECONE_INDEX` | Pinecone index name |
| `CLERK_SECRET_KEY` | Clerk backend key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook verification |
| `SLACK_CLIENT_ID` | Slack OAuth app client ID |
| `SLACK_CLIENT_SECRET` | Slack OAuth app client secret |
| `SLACK_SIGNING_SECRET` | Slack request signing |
| `ENCRYPTION_KEY` | 32-byte hex key for token encryption (`openssl rand -hex 32`) |
| `RESEND_API_KEY` | Email delivery |
| `NEXT_PUBLIC_APP_URL` | Your deployment URL |
| `NEURON_API_KEY` | Bearer token for MCP / API key auth (`openssl rand -hex 32`) |
| `NEURON_WORKSPACE_ID` | Workspace ID to use with API key auth |

## MCP Setup (Claude Desktop)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "neuron": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/neuron_mcp",
      "env": {
        "NEURON_API_URL": "http://localhost:3000",
        "NEURON_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

For the deployed app, replace `NEURON_API_URL` with your Vercel URL.

**Available tools:**
- `query_company_brain` — ask a question, get a sourced answer
- `get_company_context` — full verified knowledge base as markdown
- `save_decision` — write a decision directly into the brain

See [mcp/README.md](mcp/README.md) for full setup instructions.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the step-by-step Vercel guide.

**Live demo:** https://neuron-mcp.vercel.app *(replace with your URL)*

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Auth | Clerk |
| Database | PostgreSQL + Prisma |
| Vectors | Pinecone |
| LLM | OpenAI GPT-4o |
| Slack | `@slack/web-api` |
| Email | Resend |
| MCP | `@modelcontextprotocol/sdk` |
| Deployment | Vercel |
