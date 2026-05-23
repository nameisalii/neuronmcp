export type KnowledgeCategory = 'rule' | 'decision' | 'process' | 'idea'

export interface SlackMessage {
  text: string
  user: string
  channel: string
  ts: string
  permalink?: string
}

export interface ExtractedItem {
  content: string
  category: KnowledgeCategory
  owner: string | null
  confidence: number
}

export interface WorkspaceStats {
  knowledgeItems: number
  decisions: number
  ideas: number
  integrations: number
}

export interface SlackOAuthToken {
  ok: boolean
  access_token: string
  bot_user_id: string
  team: {
    id: string
    name: string
  }
  error?: string
}

export interface QueryResult {
  answer: string
  confidence: number
  sources: Array<{
    id: string
    content: string
    category: KnowledgeCategory
    source: string
    verified: boolean
    confidence: number
  }>
}
