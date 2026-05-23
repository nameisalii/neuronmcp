# Neuron MCP Server

Gives Claude Desktop direct access to your company brain.

## Tools

| Tool | Description |
|---|---|
| `query_company_brain` | Ask a question — searches Pinecone + returns GPT-4o answer with sources |
| `get_company_context` | Returns full verified knowledge base as markdown |
| `save_decision` | Writes a new decision directly into the brain |

## Setup

### 1. Add env vars to `.env.local`

```
NEURON_API_KEY=<generate with: openssl rand -hex 32>
NEURON_WORKSPACE_ID=<your workspace id from the DB>
```

### 2. Add to Claude Desktop config

Open `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "neuron": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/path/to/your/neuron/folder",
      "env": {
        "NEURON_API_URL": "http://localhost:3000",
        "NEURON_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

For the deployed Vercel app, set `NEURON_API_URL` to your Vercel URL instead.

### 3. Start the Neuron dev server (or use Vercel URL)

```bash
npm run dev
```

### 4. Restart Claude Desktop

The Neuron tools will appear in Claude's tool list.

## Running the MCP server manually

```bash
npm run mcp
```
