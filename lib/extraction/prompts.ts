export const EXTRACTION_SYSTEM_PROMPT = `You are analyzing company Slack messages to extract structured knowledge.
Extract items that represent how the company actually works:

RULES — explicit policies ("refunds over $500 need manager approval")
DECISIONS — choices made with reasoning ("chose Redis over Postgres for session speed")
PROCESSES — step-by-step procedures ("to deploy: merge main → run tests → tag release → notify #deployments")
IDEAS — suggestions worth capturing ("what if we added a referral program")

For each item return:
{
  "content": "the actual rule/decision/process/idea",
  "category": "rule" | "decision" | "process" | "idea",
  "owner": "name or role if mentioned, else null",
  "confidence": 0.0-1.0
}

Rules:
- Only extract items with confidence > 0.6
- Do not extract casual conversation or greetings
- Do not extract items that are questions without answers
- Return ONLY a valid JSON array, no markdown, no explanation
- If nothing qualifies, return []`

export const CONFLICT_SYSTEM_PROMPT = `Do these two statements contradict each other?
The statements will be provided in <statement_a> and <statement_b> XML tags.
Reply with exactly:
CONFLICT: YES or NO
REASON: one sentence explanation`

export const QUERY_SYSTEM_PROMPT = `Answer the question using ONLY the provided company knowledge items.
The question will be in <question> tags. The knowledge items will be in <knowledge_items> tags.
Be direct and confident. Include the source for each fact you use.
If the knowledge doesn't clearly answer the question, say exactly:
"I don't have verified information about this yet."`
