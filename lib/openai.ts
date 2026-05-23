import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

export const openai = new OpenAI({ apiKey })

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  const embedding = response.data[0]?.embedding
  if (!embedding) throw new Error('OpenAI returned no embedding data')
  return embedding
}
